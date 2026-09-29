import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "معرف غير صالح");
const money = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, "مبلغ غير صالح").refine((value) => Number(value) >= 0, "لا يقل عن صفر");
const quantity = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/, "رقم عشري غير صالح").refine((value) => Number(value) > 0, "يجب أن يكون أكبر من صفر");
const isoDate = z.string().date("التاريخ غير صحيح (YYYY-MM-DD)");

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "اسم القسم لا يقل عن حرفين").max(100),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
}).strict();

export const categoryStatusSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "اسم المنتج لا يقل عن حرفين").max(120),
  description: z.string().trim().max(1000).optional(),
  imageId: objectId.optional(),
  categoryId: objectId,
  isVisibleInMenu: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
}).strict();

export const productUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  imageId: objectId.nullable().optional(),
  categoryId: objectId.optional(),
  isVisibleInMenu: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export const productTypeSchema = z.object({
  name: z.string().trim().min(1, "اسم النوع مطلوب").max(100),
  allowedMaterialIds: z.array(objectId).max(100).default([]),
  sortOrder: z.coerce.number().int().min(0).default(0),
}).strict();

export const productSizeSchema = z.object({
  typeId: objectId,
  name: z.string().trim().min(1, "اسم الحجم مطلوب").max(100),
  sellingPrice: money,
  sortOrder: z.coerce.number().int().min(0).default(0),
  ingredients: z.array(z.object({
    materialId: objectId,
    quantitySmall: quantity,
  }).strict()).min(1).max(100)
    .refine((items) => new Set(items.map((item) => item.materialId)).size === items.length, {
      message: "المادة مكررة في الوصفة",
      path: ["ingredients"],
    })
    .optional(),
}).strict();

export const productTypeUpdateSchema = z.object({
  name: z.string().trim().min(1, "اسم النوع مطلوب").max(100).optional(),
  allowedMaterialIds: z.array(objectId).max(100).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export const productSizeUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  typeId: objectId.optional(),
  sellingPrice: money.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export const recipeSchema = z.object({
  ingredients: z.array(z.object({
    materialId: objectId,
    quantitySmall: quantity,
  }).strict()).min(1, "أضف مكونًا واحدًا على الأقل").max(100)
    .refine((items) => new Set(items.map((item) => item.materialId)).size === items.length, {
      message: "المادة مكررة في الوصفة",
      path: ["ingredients"],
    }),
  expectedVersion: z.number().int().min(0).optional(),
}).strict();

export const addonFormSchema = z.object({
  name: z.string().trim().min(1, "اسم الإضافة مطلوب").max(100),
  sellingPrice: money,
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
}).strict();

export const addonUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  sellingPrice: money.optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export function firstProductFormError(result) {
  return result.success ? null : result.error.issues[0]?.message || "راجع البيانات";
}

export { isoDate };
