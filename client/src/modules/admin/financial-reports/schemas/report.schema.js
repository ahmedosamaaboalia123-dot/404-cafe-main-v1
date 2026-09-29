import { z } from "zod";

const businessDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ بصيغة YYYY-MM-DD").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "تاريخ ميلادي غير صحيح");

export const reportRangeSchema = z.object({
  from: businessDate.optional(),
  to: businessDate.optional(),
  compare: z.enum(["previous_period", "none"]).default("previous_period"),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "تاريخ البداية يجب أن يسبق تاريخ النهاية",
  path: ["from"],
});

export const salesFilterSchema = z.object({
  from: businessDate.optional(),
  to: businessDate.optional(),
  channel: z.enum(["ADMIN", "CUSTOMER_WEB", "TABLE"]).optional(),
}).strict();

export const supplierReportFilterSchema = z.object({
  from: businessDate.optional(),
  to: businessDate.optional(),
  supplierId: z.string().regex(/^[0-9a-f]{24}$/i, "معرف غير صالح").optional(),
}).strict();

export const delegateReportFilterSchema = z.object({
  from: businessDate.optional(),
  to: businessDate.optional(),
  delegateId: z.string().regex(/^[0-9a-f]{24}$/i, "معرف غير صالح").optional(),
}).strict();

export const exportRequestSchema = z.object({
  reportType: z.enum(["sales", "inventory", "drawer", "suppliers", "delegates", "audit:events"]),
  from: businessDate.optional(),
  to: businessDate.optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  format: z.enum(["PDF", "XLSX", "CSV"]),
}).strict();

export function firstReportFormError(result) {
  return result.success ? null : result.error.issues[0]?.message || "راجع البيانات";
}
