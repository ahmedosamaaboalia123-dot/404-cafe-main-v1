import { productsApi } from "@/modules/admin/products/api/products.api";

let cache = null;
let inFlight = null;
const TTL = 30_000;

/**
 * The catalog endpoint caps `limit` at 10 on both sides (server `parsePage`
 * throws above 10, and `normalizePageParams` clamps to 10), so the POS has to
 * walk the pages itself - otherwise the sales grid silently shows only the first
 * 10 products and the rest of the menu is unreachable.
 */
const PAGE_LIMIT = 10;
const MAX_PAGES = 50;

const toPrice = (value) => Number(value) || 0;

/**
 * Adds the fields the sales screen needs on top of the raw catalog row.
 *
 * `addons` used to be dropped here, which is why the POS could not offer extra
 * add-ons even though the server prices and reserves inventory for them.
 */
const normalize = (data) => ({
  categories: data.categories || [],
  materials: [],
  products: (data.products || []).map((p) => {
    const variants = (p.types || []).map((t) => ({
      id: t.id,
      type: t.name,
      sizes: (t.sizes || []).map((s) => ({ ...s, sellingPrice: s.price })),
    }));
    const addons = (p.addons || []).map((a) => ({ ...a, price: a.price }));
    const sizes = variants.flatMap((v) => v.sizes);
    return {
      ...p,
      categoryId: p.category?.id,
      variants,
      addons,
      // "starting from" price for the grid card.
      basePrice: sizes.length ? Math.min(...sizes.map((s) => toPrice(s.sellingPrice))) : null,
      sizeCount: sizes.length,
      hasAddons: addons.length > 0,
    };
  }),
});

/** The server exposes `hasNextPage`/`totalPages`; older payloads used other names. */
function hasNextPage(meta, loaded) {
  if (!meta) return false;
  if (typeof meta.hasNextPage === "boolean") return meta.hasNextPage;
  if (typeof meta.hasNext === "boolean") return meta.hasNext;
  if (typeof meta.totalItems === "number" && typeof meta.limit === "number") {
    return loaded < meta.totalItems;
  }
  return false;
}

async function fetchWholeCatalog() {
  const products = [];
  let categories = [];
  let page = 1;

  for (; page <= MAX_PAGES; page += 1) {
    const data = await productsApi.catalog({ page, limit: PAGE_LIMIT });
    if (page === 1) categories = data.categories || [];
    products.push(...(data.products || []));
    if (!hasNextPage(data.pageMeta, products.length)) break;
  }

  return { categories, products, pageMeta: { totalItems: products.length, pages: page } };
}

export async function getProductCatalog({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.value;
  if (inFlight) return inFlight;
  inFlight = fetchWholeCatalog()
    .then((data) => {
      const value = normalize(data);
      cache = { value, at: Date.now() };
      return value;
    })
    .finally(() => { inFlight = null; });
  return inFlight;
}

export const getProductSections = async () => (await getProductCatalog()).categories;
export function getProductsForSection(products, section) { const id = String(section?.id ?? section ?? ""); return (products || []).filter((p) => String(p.categoryId ?? p.category?.id) === id); }
export const buildMaterialsLookup = () => new Map();
export const enrichOrderItemMaterials = (order) => order;
export const getAllMaterialsMapped = (products, materials) => ({ lookup: buildMaterialsLookup(products, materials), sections: [] });
