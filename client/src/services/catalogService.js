import apiClient from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";

// Public product catalog pulled from the backend POS.
// The backend's /products/public already strips ingredients/estimatedCost,
// and this normalizer maps its shape onto the frontend menu/card/order format
// while never adding any recipe/cost fields back.

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80";

const CACHE_TTL_MS = 30000;

let cache = { data: null, fetchedAt: 0, inFlight: null };

const innerData = (payload) => {
  if (!payload) return null;
  // apiClient already returned response.data: { success, data, ... }
  return payload.data ?? payload;
};

// Map backend categories to the frontend MENU_CATEGORIES ids. The Arabic
// category name itself is what we display, the id only groups the nav pills.
const categoryIdFrom = (product) => {
  const name = String(product?.categoryName || product?.category || "")
    .trim()
    .toLowerCase();
  if (/بارد|مثلج|cold/.test(name)) return "cold_drinks";
  if (/حلو|dessert|ديسرت/.test(name)) return "desserts";
  if (/ساندويتش|سناكل|خفيف|وجبات|light|meal|snack/.test(name)) return "light_meals";
  if (/ساخن|شاي|كاكاو|hot/.test(name)) return "hot_drinks";
  return "coffee";
};

const minPriceOf = (product) => {
  if (product?.sizes?.length) {
    const prices = product.sizes
      .map((s) => Number(s.sellingPrice ?? s.finalPrice ?? s.price))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (prices.length) return Math.min(...prices);
  }
  const base = Number(product?.price);
  return Number.isFinite(base) ? base : 0;
};

// Keep size rows that the modal needs: display name, volume, and the price
// delta vs. the cheapest size. Never carries ingredients.
const buildSizes = (product) => {
  const raw = product?.sizes || [];
  if (!raw.length) return [];
  const min = Math.min(...raw.map((s) => Number(s.sellingPrice ?? s.finalPrice ?? s.price) || 0));
  return raw.map((s) => {
    const price = Number(s.sellingPrice ?? s.finalPrice ?? s.price) || 0;
    return {
      id: String(s.id ?? s.name),
      name: s.name || "عادي",
      volume: s.volume || "",
      price,
      priceDiff: +(price - min).toFixed(2),
      productSizeId: s.id,
    };
  });
};

const buildTypes = (product) => {
  const raw = product?.types || product?.variants || [];
  return raw.map((t, idx) => ({
    id: String(t.id ?? t.type ?? `type-${idx}`),
    name: t.name || t.type || "ساخن",
  }));
};

// Public add-ons: name + price only (cost detail removed).
const buildAddons = (product) => {
  const raw = product?.addons || [];
  return raw.map((a) => ({
    id: String(a.id ?? a.name),
    name: a.name || "إضافة",
    price: Number(a.price) || 0,
    image: a.image || FALLBACK_IMAGE,
    productAddonId: a.id,
  }));
};

const normalizeMenuItem = (raw) => {
  const product = innerData(raw) || raw || {};
  const price = minPriceOf(product);
  return {
    id: String(product.id),
    originalId: product.id,
    name: product.name || "منتج",
    englishName: product.englishName || "",
    description: product.description || "",
    image: product.image || FALLBACK_IMAGE,
    category: categoryIdFrom(product),
    categoryName: product.categoryName || product.category || "",
    type: buildTypes(product)[0]?.name || "ساخن",
    sugarLevel: "عادي",
    price,
    isNew: Boolean(product.isNew),
    isBestSeller: Boolean(product.isBestSeller),
    rating: 4.8,
    cupType: "clear_ice",
    sizes: buildSizes(product),
    types: buildTypes(product),
    addons: buildAddons(product),
    variants: (product.variants || []).map((v) => ({
      type: v.type,
      sizes: (v.sizes || []).map((s) => ({
        id: String(s.id ?? s.name),
        name: s.name,
        price: Number(s.sellingPrice ?? s.price ?? s.finalPrice) || 0,
      })),
    })),
  };
};

export async function getPublicMenu() {
  // Unified: v1 is source of truth (/api/v1/catalog). Keep legacy as fallback for transition.
  const v1 = await getV1Menu();
  if (v1.fromBackend) {
    const catalog = { items: v1.items, fromBackend: true, fetchedAt: v1.fetchedAt };
    cache = { data: catalog, fetchedAt: Date.now(), inFlight: null };
    return catalog;
  }
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  if (cache.inFlight) return cache.inFlight;
  const run = (async () => {
    try {
      const payload = await apiClient.get(endpoints.publicProducts.list);
      const items = innerData(payload);
      const list = Array.isArray(items) ? items : [];
      const catalog = { items: list.map(normalizeMenuItem), fromBackend: true, fetchedAt: Date.now() };
      cache = { data: catalog, fetchedAt: Date.now(), inFlight: null };
      return catalog;
    } catch (err) {
      console.error("catalogService: failed to load public menu", err);
      cache = { data: null, fetchedAt: 0, inFlight: null };
      return { items: [], fromBackend: false, fetchedAt: 0 };
    }
  })();
  cache.inFlight = run;
  return cache.inFlight;
}

export function getPublicProductById(id) {
  const list = cache.data?.items || [];
  return list.find((p) => String(p.id) === String(id)) || null;
}

export function isCatalogFromBackend() {
  return Boolean(cache.data?.fromBackend);
}

// ---------------------------------------------------------------------------
// v2 backend catalog (/v1/catalog): { products:[{id,name,description,
// image:{id,url},category:{id},types:[{id,name,sizes:[{id,name,price}]}]}],
// categories:[{id,name}] }. Normalized to the exact same menu item shape so
// screens work against either backend during the transition.
// ---------------------------------------------------------------------------
let v1Cache = { data: null, fetchedAt: 0, inFlight: null };

const normalizeV1MenuItem = (raw, categoryNameById) => {
  const categoryName = categoryNameById.get(String(raw?.category?.id)) || "";
  const legacy = {
    ...raw,
    categoryName,
    category: categoryName,
    image:
      typeof raw?.image === "string" ? raw.image : raw?.image?.url || FALLBACK_IMAGE,
    sizes: (raw?.types || []).flatMap((t) => t?.sizes || []),
    variants: (raw?.types || []).map((t) => ({ type: t.name, sizes: t.sizes || [] })),
  };
  return normalizeMenuItem(legacy);
};

export async function getV1Menu() {
  const now = Date.now();
  if (v1Cache.data && now - v1Cache.fetchedAt < CACHE_TTL_MS) {
    return v1Cache.data;
  }
  if (v1Cache.inFlight) return v1Cache.inFlight;

  const run = (async () => {
    try {
      const payload = await apiClient.get(endpoints.v1.catalog);
      const data = innerData(payload) || {};
      const categories = Array.isArray(data.categories) ? data.categories : [];
      const categoryNameById = new Map(categories.map((c) => [String(c.id), c.name || ""]));
      const list = Array.isArray(data.products) ? data.products : [];
      const catalog = {
        items: list.map((p) => normalizeV1MenuItem(p, categoryNameById)),
        categories: categories.map((c) => ({
          id: categoryIdFromName(c.name),
          title: c.name || "الكل",
          englishTitle: "",
          icon: "Coffee",
        })),
        fromBackend: true,
        backendVersion: "v1",
        fetchedAt: Date.now(),
      };
      v1Cache = { data: catalog, fetchedAt: Date.now(), inFlight: null };
      return catalog;
    } catch (err) {
      console.error("catalogService: failed to load v1 menu", err);
      v1Cache = { data: null, fetchedAt: 0, inFlight: null };
      return { items: [], categories: [], fromBackend: false, backendVersion: "v1", fetchedAt: 0 };
    }
  })();

  v1Cache.inFlight = run;
  return v1Cache.inFlight;
}

export function getV1MenuItemById(id) {
  const list = v1Cache.data?.items || [];
  return list.find((p) => String(p.id) === String(id)) || null;
}

// ---------------------------------------------------------------------------
// Public product categories (real ProductCategory records from the backend).
// ---------------------------------------------------------------------------
let catCache = { data: null, fetchedAt: 0, inFlight: null };

const categoryIdFromName = (name) =>
  categoryIdFrom({ categoryName: name, category: name });

export async function getPublicCategories() {
  const v1 = await getV1Menu();
  if (v1.fromBackend && Array.isArray(v1.categories) && v1.categories.length) {
    catCache = { data: v1.categories, fetchedAt: Date.now(), inFlight: null };
    return v1.categories;
  }
  const now = Date.now();
  if (catCache.data && now - catCache.fetchedAt < CACHE_TTL_MS) return catCache.data;
  if (catCache.inFlight) return catCache.inFlight;
  const run = (async () => {
    try {
      const payload = await apiClient.get(endpoints.publicProducts.categories);
      const raw = innerData(payload);
      const list = Array.isArray(raw) ? raw : [];
      const categories = list
        .filter((c) => c.isActive !== false)
        .map((c) => ({ id: categoryIdFromName(c.name), title: c.name || "الكل", englishTitle: "", icon: "Coffee" }));
      catCache = { data: categories, fetchedAt: Date.now(), inFlight: null };
      return categories;
    } catch (err) {
      console.error("catalogService: failed to load public categories", err);
      catCache = { data: null, fetchedAt: 0, inFlight: null };
      return [];
    }
  })();
  catCache.inFlight = run;
  return catCache.inFlight;
}

// ---------------------------------------------------------------------------
// Most-ordered products (real aggregation from backend sales + order items).
// ---------------------------------------------------------------------------
let topCache = { data: null, fetchedAt: 0, inFlight: null };

export async function getTopProducts({ limit = 6, days = 30 } = {}) {
  const now = Date.now();
  if (topCache.data && now - topCache.fetchedAt < CACHE_TTL_MS) {
    return topCache.data;
  }
  if (topCache.inFlight) return topCache.inFlight;

  const run = (async () => {
    try {
      const payload = await apiClient.get(endpoints.publicProducts.top, {
        params: { limit, days },
      });
      const raw = innerData(payload);
      const list = Array.isArray(raw) ? raw : [];
      topCache = { data: list, fetchedAt: Date.now(), inFlight: null };
      return list;
    } catch (err) {
      console.error("catalogService: failed to load top products", err);
      topCache = { data: null, fetchedAt: 0, inFlight: null };
      return [];
    }
  })();

  topCache.inFlight = run;
  return topCache.inFlight;
}

// Best-seller ids list derived from the most-ordered products.
export function bestSellerIds() {
  const list = topCache.data || [];
  return new Set(list.map((item) => String(item.productId)));
}
