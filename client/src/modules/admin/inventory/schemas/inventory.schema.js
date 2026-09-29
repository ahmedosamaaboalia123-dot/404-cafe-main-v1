import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "معرف غير صالح");
const decimal = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/, "رقم عشري غير صالح");
const positive = decimal.refine((value) => Number(value) > 0, "يجب أن يكون أكبر من صفر");

export const materialFormSchema = z.object({
  name: z.string().trim().min(2, "اسم المادة لا يقل عن حرفين").max(120),
  supplierId: objectId,
  largeUnitId: objectId,
  smallUnitId: objectId,
  conversionFactor: decimal.refine((value) => Number(value) >= 1, "معامل التحويل يجب ألا يقل عن واحد"),
  smallQuantityStep: positive,
  referenceLargeUnitPrice: positive.optional(),
  minStockSmall: decimal,
  expiryAlertDays: z.coerce.number().int().min(0, "لا يقل عن صفر").max(3650),
}).strict().refine((value) => value.largeUnitId !== value.smallUnitId, {
  message: "الوحدة الكبيرة يجب أن تختلف عن الصغيرة",
  path: ["smallUnitId"],
});

export const deleteMaterialSchema = z.object({ reason: z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500), expectedVersion: z.number().int().min(0) }).strict();

export const withdrawFormSchema = z.object({
  batchId: objectId,
  quantityLarge: positive,
  reason: z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500),
  occurredOn: z.string().date("التاريخ غير صحيح"),
  expectedBatchVersion: z.number().int().min(0),
}).strict();

export function firstInventoryFormError(result) {
  return result.success ? null : result.error.issues[0]?.message || "راجع البيانات";
}
