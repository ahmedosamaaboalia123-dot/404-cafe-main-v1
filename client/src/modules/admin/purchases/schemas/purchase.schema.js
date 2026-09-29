import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "معرف غير صالح");
const decimal = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/, "رقم عشري غير صالح");
const positive = decimal.refine((value) => Number(value) > 0, "يجب أن يكون أكبر من صفر");
const isoDate = z.string().date("التاريخ غير صحيح (YYYY-MM-DD)");

const purchaseLineSchema = z.object({
  materialId: objectId,
  quantityLarge: positive,
  largeUnitPrice: positive,
}).strict();

const groupItems = z.array(purchaseLineSchema).min(1, "أضف بندًا واحدًا على الأقل").max(100)
  .refine((items) => new Set(items.map((item) => item.materialId)).size === items.length, {
    message: "المادة مكررة في الفاتورة",
    path: ["items"],
  });

export const createGroupSchema = z.object({
  items: groupItems,
  invoiceDate: isoDate.optional(),
}).strict();

export const updateGroupSchema = z.object({
  items: groupItems,
  invoiceDate: isoDate.optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export const deleteGroupSchema = z.object({
  expectedVersion: z.number().int().min(0),
}).strict();

export const splitGroupSchema = z.object({
  expectedVersion: z.number().int().min(0),
}).strict();

export const registerItemSchema = z.object({
  receivedOn: isoDate,
  expiryOn: z.string().min(1, "أدخل تاريخ صلاحية الدفعة").date("تاريخ الصلاحية غير صحيح"),
  expectedVersion: z.number().int().min(0),
}).strict();

export const registerManySchema = z.object({
  expectedVersion: z.number().int().min(0),
  items: z.array(z.object({
    purchaseItemId: objectId,
    receivedOn: isoDate,
    expiryOn: z.string().min(1, "أدخل تاريخ صلاحية كل دفعة").date("تاريخ الصلاحية غير صحيح"),
    expectedItemVersion: z.number().int().min(0),
  }).strict()).min(1).max(50)
    .refine((items) => new Set(items.map((item) => item.purchaseItemId)).size === items.length, {
      message: "البند مكرر",
      path: ["items"],
    }),
}).strict();

export function firstPurchaseFormError(result) {
  return result.success ? null : result.error.issues[0]?.message || "راجع البيانات";
}
