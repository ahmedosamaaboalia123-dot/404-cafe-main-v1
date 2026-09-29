import { toDecimal128, toApiString } from '../../platform/database/decimal.js';
import { runInTransaction } from '../../platform/database/transaction.js';
import { ApiError } from '../../platform/http/api-error.js';
import { normalizeName } from '../../shared/utils/normalize-name.js';
import { RawMaterial, MeasurementUnit } from '../inventory/inventory.models.js';
import { lockMaterialSupplierAndUnits } from '../inventory/inventory.public-service.js';
import { validateRecipeIngredients } from './recipe.service.js';
import {
  Product,
  ProductAddon,
  ProductCategory,
  ProductRecipe,
  ProductSize,
  ProductType
} from './product.models.js';

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
const conflict = (code, messageAr) => new ApiError({ code, status: 409, messageAr });
async function activeCategory(id, models, session) {
  const value = await models.ProductCategory.findOne({ _id: id, isActive: true }).session(session);
  if (!value)
    throw new ApiError({
      code: 'CATEGORY_NOT_ACTIVE',
      status: 422,
      messageAr: 'القسم غير موجود أو متوقف'
    });
  return value;
}
async function activeProduct(id, models, session) {
  const value = await models.Product.findOne({ _id: id, status: 'ACTIVE' }).session(session);
  if (!value)
    throw new ApiError({
      code: 'PRODUCT_NOT_ACTIVE',
      status: 422,
      messageAr: 'المنتج غير موجود أو متوقف'
    });
  return value;
}
export async function createCategory(input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      const [value] = await models.ProductCategory.create(
        [{ ...input, normalizedName: normalizeName(input.name), createdBy: context.actorId }],
        { session: tx.session }
      );
      return value;
    },
    context,
    context.transactionOptions
  );
}
export async function updateCategory(id, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      const value = await models.ProductCategory.findOne({
        _id: id,
        version: input.expectedVersion
      }).session(tx.session);
      if (!value) throw conflict('CATEGORY_VERSION_CONFLICT', 'القسم غير موجود أو تم تعديله');
      for (const key of ['name', 'description', 'isActive', 'sortOrder'])
        if (input[key] !== undefined) value[key] = input[key];
      if (input.name) value.normalizedName = normalizeName(input.name);
      value.updatedBy = context.actorId;
      await value.save({ session: tx.session });
      return value;
    },
    context,
    context.transactionOptions
  );
}
export async function createProduct(input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      await activeCategory(input.categoryId, models, tx.session);
      const imageUrl = input.imageId ? await resolveImageUrl(input.imageId, context, tx) : null;
      const [value] = await models.Product.create(
        [
          {
            ...input,
            imageUrl,
            normalizedName: normalizeName(input.name),
            createdBy: context.actorId
          }
        ],
        { session: tx.session }
      );
      return value;
    },
    context,
    context.transactionOptions
  );
}
async function resolveImageUrl(imageId, context, tx) {
  if (!context.mediaPort?.assertReady) return null;
  const asset = await context.mediaPort.assertReady(imageId, { ...context, ...tx });
  return asset?.secureUrl ?? null;
}
export async function updateProduct(id, input, context = {}) {
  let previousImageId = null;
  const value = await runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      if (input.categoryId) await activeCategory(input.categoryId, models, tx.session);
      let nextImageUrl;
      if (input.imageId === null) nextImageUrl = null;
      else if (input.imageId) nextImageUrl = await resolveImageUrl(input.imageId, context, tx);
      const value = await models.Product.findOne({
        _id: id,
        version: input.expectedVersion
      }).session(tx.session);
      if (!value) throw conflict('PRODUCT_VERSION_CONFLICT', 'المنتج غير موجود أو تم تعديله');
      previousImageId = value.imageId ? String(value.imageId) : null;
      for (const key of [
        'name',
        'description',
        'imageId',
        'categoryId',
        'isVisibleInMenu',
        'status'
      ])
        if (input[key] !== undefined) value[key] = input[key];
      if (input.imageId !== undefined) value.imageUrl = nextImageUrl ?? null;
      if (input.name) value.normalizedName = normalizeName(input.name);
      value.catalogVersion += 1;
      value.updatedBy = context.actorId;
      await value.save({ session: tx.session });
      const nextImageId = value.imageId ? String(value.imageId) : null;
      if (previousImageId && previousImageId !== nextImageId && context.mediaPort?.releaseUnused)
        await context.mediaPort.releaseUnused(previousImageId, { ...context, ...tx });
      return value;
    },
    context,
    context.transactionOptions
  );
  return value;
}
async function resolveAllowedMaterials(ids, models, session) {
  const unique = [...new Set(ids.map(String))];
  if (unique.length !== ids.length)
    throw new ApiError({
      code: 'DUPLICATE_ALLOWED_MATERIAL',
      status: 422,
      messageAr: 'لا يمكن تكرار المادة الخام'
    });
  const materials = unique.length
    ? await models.RawMaterial.find({ _id: { $in: unique } }).session(session)
    : [];
  if (materials.length !== unique.length)
    throw new ApiError({
      code: 'INVALID_ALLOWED_MATERIAL',
      status: 422,
      messageAr: 'إحدى المواد غير موجودة أو متوقفة'
    });
  return unique;
}
export async function addProductType(productId, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      await activeProduct(productId, models, tx.session);
      const ids = await resolveAllowedMaterials(input.allowedMaterialIds, models, tx.session);
      const [value] = await models.ProductType.create(
        [
          {
            name: input.name,
            sortOrder: input.sortOrder,
            productId,
            allowedMaterialIds: ids,
            normalizedName: normalizeName(input.name)
          }
        ],
        { session: tx.session }
      );
      return value;
    },
    context,
    context.transactionOptions
  );
}
export async function updateProductType(productId, typeId, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      const value = await models.ProductType.findOne({
        _id: typeId,
        productId,
        version: input.expectedVersion
      }).session(tx.session);
      if (!value) throw conflict('TYPE_VERSION_CONFLICT', 'النوع غير موجود أو تم تعديله');
      if (input.allowedMaterialIds !== undefined)
        value.allowedMaterialIds = await resolveAllowedMaterials(
          input.allowedMaterialIds,
          models,
          tx.session
        );
      for (const key of ['name', 'isActive', 'sortOrder'])
        if (input[key] !== undefined) value[key] = input[key];
      if (input.name) value.normalizedName = normalizeName(input.name);
      value.updatedBy = context.actorId;
      await value.save({ session: tx.session });
      return value;
    },
    context,
    context.transactionOptions
  );
}
export async function deleteProductType(productId, typeId, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      const type = await models.ProductType.findOne({ _id: typeId, productId }).session(
        tx.session
      );
      if (!type)
        throw new ApiError({
          code: 'TYPE_NOT_FOUND',
          status: 404,
          messageAr: 'النوع غير موجود'
        });
      const sizeIds = await models.ProductSize.find({ typeId }, { _id: 1 }).session(tx.session);
      await models.ProductRecipe.deleteMany(
        { productSizeId: { $in: sizeIds.map((size) => size._id) } },
        { session: tx.session }
      );
      await models.ProductSize.deleteMany({ typeId }, { session: tx.session });
      await models.ProductType.deleteOne({ _id: typeId }, { session: tx.session });
      return { id: String(typeId), deletedSizes: sizeIds.length };
    },
    context,
    context.transactionOptions
  );
}
export async function addProductSize(productId, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      await activeProduct(productId, models, tx.session);
      const type = await models.ProductType.findOne({
        _id: input.typeId,
        productId,
        isActive: true
      }).session(tx.session);
      if (!type)
        throw new ApiError({
          code: 'TYPE_PRODUCT_MISMATCH',
          status: 422,
          messageAr: 'النوع لا يتبع المنتج'
        });
      const { ingredients, ...sizeInput } = input;
      const [value] = await models.ProductSize.create(
        [
          {
            ...sizeInput,
            productId,
            normalizedName: normalizeName(input.name),
            sellingPrice: toDecimal128(input.sellingPrice)
          }
        ],
        { session: tx.session }
      );
      let recipe = null;
      if (ingredients?.length) {
        const validated = await validateRecipeIngredients(ingredients, {
          ...context,
          ...tx,
          productModels: models
        });
        if (
          type.allowedMaterialIds.length &&
          validated.some(
            ({ material }) => !type.allowedMaterialIds.map(String).includes(String(material._id))
          )
        )
          throw new ApiError({
            code: 'MATERIAL_NOT_ALLOWED_FOR_TYPE',
            status: 422,
            messageAr: 'مادة الوصفة غير مسموحة لهذا النوع'
          });
        [recipe] = await models.ProductRecipe.create(
          [
            {
              productSizeId: value._id,
              ingredients: validated.map((v) => v.ingredient),
              updatedBy: context.actorId
            }
          ],
          { session: tx.session }
        );
        await (
          context.inventoryPort?.lockMaterialSupplierAndUnits ?? lockMaterialSupplierAndUnits
        )(
          validated.map((v) => v.material._id),
          'RECIPE_USE',
          { ...context, ...tx, inventoryModels: { RawMaterial: models.RawMaterial } }
        );
      }
      return { size: value, recipe };
    },
    context,
    context.transactionOptions
  );
}
export async function updateProductSize(sizeId, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      const value = await models.ProductSize.findOne({
        _id: sizeId,
        version: input.expectedVersion
      }).session(tx.session);
      if (!value) throw conflict('SIZE_VERSION_CONFLICT', 'الحجم غير موجود أو تم تعديله');
      if (input.typeId !== undefined && String(input.typeId) !== String(value.typeId)) {
        const type = await models.ProductType.findOne({
          _id: input.typeId,
          productId: value.productId,
          isActive: true
        }).session(tx.session);
        if (!type)
          throw new ApiError({
            code: 'TYPE_PRODUCT_MISMATCH',
            status: 422,
            messageAr: 'النوع لا يتبع المنتج'
          });
      }
      for (const key of ['name', 'typeId', 'isActive', 'sortOrder'])
        if (input[key] !== undefined) value[key] = input[key];
      if (input.sellingPrice !== undefined) value.sellingPrice = toDecimal128(input.sellingPrice);
      if (input.name) value.normalizedName = normalizeName(input.name);
      value.updatedBy = context.actorId;
      await value.save({ session: tx.session });
      return value;
    },
    context,
    context.transactionOptions
  );
}
export async function deleteProductSize(sizeId, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      const size = await models.ProductSize.findById(sizeId).session(tx.session);
      if (!size)
        throw new ApiError({
          code: 'SIZE_NOT_FOUND',
          status: 404,
          messageAr: 'الحجم غير موجود'
        });
      await models.ProductRecipe.deleteOne({ productSizeId: sizeId }, { session: tx.session });
      await models.ProductSize.deleteOne({ _id: sizeId }, { session: tx.session });
      return { id: String(sizeId) };
    },
    context,
    context.transactionOptions
  );
}
export async function deleteProduct(productId, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      const product = await models.Product.findById(productId).session(tx.session);
      if (!product)
        throw new ApiError({
          code: 'PRODUCT_NOT_FOUND',
          status: 404,
          messageAr: 'المنتج غير موجود'
        });
      const sizeIds = await models.ProductSize.find({ productId }, { _id: 1 }).session(tx.session);
      await models.ProductAddon.deleteMany({ productId }, { session: tx.session });
      await models.ProductRecipe.deleteMany(
        { productSizeId: { $in: sizeIds.map((size) => size._id) } },
        { session: tx.session }
      );
      await models.ProductSize.deleteMany({ productId }, { session: tx.session });
      await models.ProductType.deleteMany({ productId }, { session: tx.session });
      await models.Product.deleteOne({ _id: productId }, { session: tx.session });
      return { id: String(productId) };
    },
    context,
    context.transactionOptions
  );
}
export async function createAddon(productId, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      await activeProduct(productId, models, tx.session);
      const [value] = await models.ProductAddon.create(
        [
          {
            ...input,
            productId,
            normalizedName: normalizeName(input.name),
            sellingPrice: toDecimal128(input.sellingPrice)
          }
        ],
        { session: tx.session }
      );
      return value;
    },
    context,
    context.transactionOptions
  );
}
export async function updateAddon(id, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.productModels ?? defaults;
      const value = await models.ProductAddon.findOne({
        _id: id,
        version: input.expectedVersion
      }).session(tx.session);
      if (!value) throw conflict('ADDON_VERSION_CONFLICT', 'الإضافة غير موجودة أو تم تعديلها');
      for (const key of ['name', 'notes', 'isActive', 'sortOrder'])
        if (input[key] !== undefined) value[key] = input[key];
      if (input.sellingPrice !== undefined) value.sellingPrice = toDecimal128(input.sellingPrice);
      if (input.name) value.normalizedName = normalizeName(input.name);
      await value.save({ session: tx.session });
      await models.Product.updateOne(
        { _id: value.productId },
        { $inc: { catalogVersion: 1 } },
        { session: tx.session }
      );
      return value;
    },
    context,
    context.transactionOptions
  );
}
export const productDto = (v) => ({
  id: String(v._id),
  name: v.name,
  description: v.description ?? '',
  imageId: v.imageId ? String(v.imageId) : null,
  imageUrl: v.imageUrl ?? null,
  categoryId: String(v.categoryId),
  isVisibleInMenu: v.isVisibleInMenu,
  status: v.status,
  catalogVersion: v.catalogVersion ?? 1,
  version: v.version ?? 0
});
export const typeDto = (v) => ({
  id: String(v._id),
  productId: String(v.productId),
  name: v.name,
  allowedMaterialIds: v.allowedMaterialIds.map(String),
  isActive: v.isActive,
  sortOrder: v.sortOrder,
  version: v.version ?? 0
});
export const sizeDto = (v) => ({
  id: String(v._id),
  productId: String(v.productId),
  typeId: String(v.typeId),
  name: v.name,
  sellingPrice: toApiString(v.sellingPrice),
  currency: v.currency,
  isActive: v.isActive,
  sortOrder: v.sortOrder,
  version: v.version ?? 0
});
export const addonDto = (v) => ({
  id: String(v._id),
  productId: String(v.productId),
  name: v.name,
  sellingPrice: toApiString(v.sellingPrice),
  currency: v.currency,
  isActive: v.isActive,
  sortOrder: v.sortOrder,
  version: v.version ?? 0
});
