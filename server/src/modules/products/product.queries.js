import { add, compare, toApiString } from '../../platform/database/decimal.js';
import { buildPageMeta, buildSkipLimit, parsePage } from '../../platform/database/pagination.js';
import { ApiError } from '../../platform/http/api-error.js';
import { Order, OrderItem } from '../orders/order.models.js';
import { calculateExpectedProductCost } from './product-cost.service.js';
import { RawMaterial, MeasurementUnit } from '../inventory/inventory.models.js';
import {
  Product,
  ProductAddon,
  ProductCategory,
  ProductRecipe,
  ProductSize,
  ProductType
} from './product.models.js';
import { addonDto, productDto, sizeDto, typeDto } from './product.service.js';
import { recipeDto } from './recipe.service.js';
const defaults = {
  Product,
  ProductAddon,
  ProductCategory,
  ProductRecipe,
  ProductSize,
  ProductType,
  RawMaterial,
  MeasurementUnit
};
// Public best-seller window caps: keep an unauthenticated read bounded.
const TOP_SCAN_ORDERS = 2000;
const DAY_MS = 86400000;
export async function getProductsScreen(filters = {}, context = {}) {
  const m = context.productModels ?? defaults;
  const { page, limit } = parsePage(filters);
  const { skip } = buildSkipLimit({ page, limit });
  const match = {
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.visible ? { isVisibleInMenu: filters.visible === 'true' } : {}),
    ...(filters.search
      ? { name: { $regex: filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
      : {})
  };
  const [items, totalItems, categories, summary] = await Promise.all([
    m.Product.find(match).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    m.Product.countDocuments(match),
    m.ProductCategory.find({}).sort({ sortOrder: 1, _id: 1 }).lean(),
    m.Product.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  return {
    summary: Object.fromEntries(summary.map((v) => [v._id.toLowerCase(), v.count])),
    filters: {
      categories: categories.map((v) => ({
        id: String(v._id),
        name: v.name,
        isActive: v.isActive
      })),
      statuses: ['ACTIVE', 'INACTIVE']
    },
    products: items.map(productDto),
    pageMeta: buildPageMeta({ page, limit, totalItems, sort: { name: 1 } })
  };
}
export async function getProductDetails(id, context = {}) {
  const m = context.productModels ?? defaults;
  const product = await m.Product.findById(id).lean();
  if (!product)
    throw new ApiError({ code: 'PRODUCT_NOT_FOUND', status: 404, messageAr: 'المنتج غير موجود' });
  const [types, sizes, recipes, addons] = await Promise.all([
    m.ProductType.find({ productId: id }).sort({ sortOrder: 1, _id: 1 }).lean(),
    m.ProductSize.find({ productId: id }).sort({ sortOrder: 1, _id: 1 }).lean(),
    m.ProductRecipe.find({
      productSizeId: { $in: await m.ProductSize.distinct('_id', { productId: id }) }
    }).lean(),
    m.ProductAddon.find({ productId: id }).sort({ sortOrder: 1, _id: 1 }).lean()
  ]);
  const costPreview = [];
  for (const size of sizes)
    costPreview.push({
      sizeId: String(size._id),
      ...(await calculateExpectedProductCost(size._id, [], { ...context, productModels: m }))
    });
  const materialIds = [...new Set(types.flatMap((type) => type.allowedMaterialIds ?? []))];
  const materials = materialIds.length
    ? await m.RawMaterial.find({ _id: { $in: materialIds } }).lean()
    : [];
  const smallUnitIds = [...new Set(materials.map((mat) => mat.smallUnitId))];
  const smallUnits = smallUnitIds.length
    ? await m.MeasurementUnit.find({ _id: { $in: smallUnitIds } }).lean()
    : [];
  const materialMap = new Map(materials.map((item) => [String(item._id), item]));
  const unitMap = new Map(smallUnits.map((unit) => [String(unit._id), unit]));
  return {
    product: productDto(product),
    types: types.map((type) => {
      const dto = typeDto(type);
      return {
        ...dto,
        allowedMaterials: (type.allowedMaterialIds ?? []).map((materialId) => {
          const material = materialMap.get(String(materialId));
          const unit = material ? unitMap.get(String(material.smallUnitId)) : null;
          return {
            id: String(materialId),
            name: material?.name ?? null,
            referenceLargeUnitPrice: material?.referenceLargeUnitPrice
              ? toApiString(material.referenceLargeUnitPrice)
              : null,
            conversionFactor: material ? toApiString(material.conversionFactor) : null,
            smallUnitName: unit?.nameAr ?? null
          };
        })
      };
    }),
    sizes: sizes.map(sizeDto),
    recipes: recipes.map(recipeDto),
    addons: addons.map(addonDto),
    costPreview
  };
}
export async function listProductsByMaterial(materialId, filters = {}, context = {}) {
  const m = context.productModels ?? defaults;
  const { page, limit } = parsePage(filters);
  const recipes = await m.ProductRecipe.find({ 'ingredients.materialId': materialId }).lean();
  const sizeIds = recipes.map((r) => r.productSizeId);
  const sizes = await m.ProductSize.find({ _id: { $in: sizeIds } }).lean();
  const productIds = [...new Set(sizes.map((s) => String(s.productId)))];
  const items = await m.Product.find({ _id: { $in: productIds } })
    .sort({ name: 1, _id: 1 })
    .limit(limit)
    .lean();
  return {
    items: items.map(productDto),
    pageMeta: buildPageMeta({ page, limit, totalItems: productIds.length, sort: { name: 1 } })
  };
}

/**
 * Public best-seller aggregation: real order volume over a rolling window.
 * Backs the menu/home "الأكثر طلبًا" strip, so it exposes only ids, names,
 * quantity and revenue - never recipes, cost or supplier data.
 */
export async function getTopPublicProducts(filters = {}, context = {}) {
  const m = context.publicCatalogModels ?? { Order, OrderItem };
  const limit = Math.min(Math.max(Number(filters.limit) || 6, 1), 10);
  const days = Math.min(Math.max(Number(filters.days) || 30, 1), 365);
  const now = context.now ? new Date(context.now) : new Date();
  const since = new Date(now.getTime() - days * DAY_MS);
  const orders = await m.Order.find({ status: { $ne: 'CANCELLED' }, createdAt: { $gte: since } })
    .select({ _id: 1 })
    .sort({ createdAt: -1, _id: -1 })
    .limit(TOP_SCAN_ORDERS)
    .lean();
  if (orders.length === 0) return [];
  const items = await m.OrderItem.find({
    orderId: { $in: orders.map((o) => o._id) },
    status: { $ne: 'CANCELLED' }
  })
    .select({ productId: 1, productName: 1, quantity: 1, lineSubtotal: 1 })
    .lean();
  const byProduct = new Map();
  for (const item of items) {
    const key = String(item.productId);
    const row = byProduct.get(key) ?? {
      productId: key,
      productName: item.productName,
      quantity: 0,
      total: '0'
    };
    row.quantity += Number(item.quantity) || 0;
    row.total = toApiString(add(row.total, item.lineSubtotal));
    byProduct.set(key, row);
  }
  return [...byProduct.values()]
    .sort(
      (a, b) =>
        b.quantity - a.quantity ||
        compare(b.total, a.total).valueOf() ||
        a.productId.localeCompare(b.productId)
    )
    .slice(0, limit)
    .map((row) => ({ ...row, total: toApiString(row.total) }));
}
