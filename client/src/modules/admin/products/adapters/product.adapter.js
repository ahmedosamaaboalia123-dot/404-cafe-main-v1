import { readPageMeta } from "@/api/pagination";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));

export const PRODUCT_STATUSES = Object.freeze({ ACTIVE: "نشط", INACTIVE: "موقوف" });

const cleanCategory = (category = {}) => ({
  ...category,
  id: str(category.id),
  name: category.name || "",
  description: category.description ?? "",
  isActive: category.isActive !== false,
  sortOrder: Number(category.sortOrder ?? 0),
  version: Number(category.version ?? 0),
});

const cleanProduct = (product = {}) => ({
  ...product,
  id: str(product.id),
  name: product.name || "",
  description: product.description ?? "",
  imageId: product.imageId ? str(product.imageId) : null,
  categoryId: str(product.categoryId),
  isVisibleInMenu: Boolean(product.isVisibleInMenu),
  status: product.status || "ACTIVE",
  statusLabel: PRODUCT_STATUSES[product.status] || product.status || "—",
  catalogVersion: Number(product.catalogVersion ?? 1),
  version: Number(product.version ?? 0),
});

const cleanType = (type = {}) => ({
  ...type,
  id: str(type.id),
  productId: str(type.productId),
  name: type.name || "",
  allowedMaterialIds: (type.allowedMaterialIds || []).map(String),
  allowedMaterials: (type.allowedMaterials || []).map((item) => ({
    id: str(item.id),
    name: item.name || "",
    referenceLargeUnitPrice: item.referenceLargeUnitPrice == null ? null : str(item.referenceLargeUnitPrice),
    conversionFactor: str(item.conversionFactor ?? "0", "0"),
    smallUnitName: item.smallUnitName || "",
  })),
  isActive: type.isActive !== false,
  sortOrder: Number(type.sortOrder ?? 0),
  version: Number(type.version ?? 0),
});

const cleanSize = (size = {}) => ({
  ...size,
  id: str(size.id),
  productId: str(size.productId),
  typeId: str(size.typeId),
  name: size.name || "",
  sellingPrice: str(size.sellingPrice ?? "0", "0"),
  currency: size.currency || "EGP",
  isActive: size.isActive !== false,
  sortOrder: Number(size.sortOrder ?? 0),
  version: Number(size.version ?? 0),
});

const cleanAddon = (addon = {}) => ({
  ...addon,
  id: str(addon.id),
  productId: str(addon.productId),
  name: addon.name || "",
  sellingPrice: str(addon.sellingPrice ?? "0", "0"),
  currency: addon.currency || "EGP",
  isActive: addon.isActive !== false,
  sortOrder: Number(addon.sortOrder ?? 0),
  version: Number(addon.version ?? 0),
});

const cleanRecipe = (recipe = {}) => ({
  ...recipe,
  id: str(recipe.id),
  productSizeId: str(recipe.productSizeId),
  ingredients: (recipe.ingredients || []).map((item) => ({
    ...item,
    materialId: str(item.materialId),
    quantitySmall: str(item.quantitySmall ?? "0", "0"),
    smallUnitId: str(item.smallUnitId),
    materialName: item.materialName || item.materialNameSnapshot || "",
    unitName: item.unitName || item.unitNameSnapshot || "",
  })),
  version: Number(recipe.version ?? 0),
});

const cleanCostPreview = (preview = {}) => ({
  ...preview,
  sizeId: str(preview.sizeId),
  available: Boolean(preview.available),
  cost: preview.cost == null ? null : str(preview.cost),
  profit: preview.profit == null ? null : str(preview.profit),
  margin: preview.margin == null ? null : str(preview.margin),
  costCompleteness: preview.costCompleteness || "MISSING_RECIPE",
});

export function toProductsScreen(data = {}) {
  const products = (data.products || []).map(cleanProduct);
  return {
    products,
    summary: {
      active: Number(data.summary?.active ?? data.summary?.ACTIVE ?? 0),
      inactive: Number(data.summary?.inactive ?? data.summary?.INACTIVE ?? 0),
    },
    filters: {
      categories: (data.filters?.categories || []).map(cleanCategory),
      statuses: data.filters?.statuses ?? ["ACTIVE", "INACTIVE"],
    },
    pageMeta: readPageMeta(data.pageMeta, products.length),
  };
}

export function toProductDetails(data = {}) {
  const recipes = (data.recipes || []).map(cleanRecipe);
  const recipeBySize = Object.fromEntries(recipes.map((recipe) => [recipe.productSizeId, recipe]));
  return {
    product: data.product ? cleanProduct(data.product) : null,
    types: (data.types || []).map(cleanType),
    sizes: (data.sizes || []).map(cleanSize),
    recipes,
    recipeBySize,
    addons: (data.addons || []).map(cleanAddon),
    costPreview: (data.costPreview || []).map(cleanCostPreview),
    costBySize: Object.fromEntries((data.costPreview || []).map((preview) => [str(preview.sizeId), cleanCostPreview(preview)])),
  };
}

export function toCategoryOptions(categories = []) {
  return categories.filter((category) => category.isActive !== false).map((category) => ({ value: category.id, label: category.name }));
}
