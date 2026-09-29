import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "معرف غير صالح");
const decimal = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/, "رقم عشري غير صالح");
const positive = decimal.refine((value) => Number(value) > 0, "يجب أن يكون أكبر من صفر");

export const createReturnSchema = z.object({
  returnDate: z.string().date("التاريخ غير صحيح (YYYY-MM-DD)"),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({
    batchId: objectId,
    quantityLarge: positive,
    reason: z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500),
    expectedBatchVersion: z.number().int().min(0),
  }).strict()).min(1, "أضف بندًا واحدًا على الأقل").max(50)
    .refine((items) => new Set(items.map((item) => item.batchId)).size === items.length, {
      message: "الدفعة مكررة في المرتجع",
      path: ["items"],
    }),
}).strict();

export function firstReturnFormError(result) {
  return result.success ? null : result.error.issues[0]?.message || "راجع البيانات";
}
