import { z } from "zod";

const requiredText = (label, max) => z.string().trim().min(2, `${label} لا يقل عن حرفين`).max(max, `${label} أطول من المسموح`);
export const supplierFormSchema = z.object({
  name: requiredText("اسم المورد", 120), contactPerson: requiredText("اسم المسؤول", 120),
  phone: z.string().trim().min(7, "رقم الهاتف لا يقل عن 7 أرقام").max(30, "رقم الهاتف أطول من المسموح"),
  city: requiredText("المدينة", 100),
}).strict();
export const deleteSupplierSchema = z.object({ reason: z.string().trim().min(3).max(500), expectedVersion: z.number().int().min(0) }).strict();
export const supplierEntrySchema = z.object({
  kind: z.enum(["DEBT", "RECEIVABLE", "DEBT_PAYMENT", "RECEIVABLE_COLLECTION"]),
  amount: z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, "المبلغ يجب أن يكون موجبًا وبحد أقصى منزلتان").refine((value) => Number(value) > 0, "المبلغ يجب أن يكون أكبر من صفر"),
  occurredOn: z.string().date("التاريخ غير صحيح"), notes: z.string().trim().max(500, "الملاحظات أطول من المسموح").optional(),
  expectedAccountVersion: z.number().int().min(0),
}).strict();
export const updateEntrySchema = z.object({ amount: supplierEntrySchema.shape.amount, occurredOn: supplierEntrySchema.shape.occurredOn, notes: supplierEntrySchema.shape.notes, reason: z.string().trim().min(3).max(500), expectedAccountVersion: z.number().int().min(0) }).strict();

export function firstSupplierFormError(result) { return result.success ? null : result.error.issues[0]?.message || "راجع البيانات"; }
