import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true, message: "التاريخ والوقت غير صحيحين" });

export const auditFilterSchema = z.object({
  module: z.string().trim().max(60).optional(),
  eventType: z.string().trim().max(120).optional(),
  actorId: z.string().trim().max(100).optional(),
  result: z.string().trim().max(30).optional(),
  severity: z.string().trim().max(30).optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "تاريخ البداية يجب أن يسبق تاريخ النهاية",
  path: ["from"],
});

export const auditExportSchema = z.object({
  filters: z.record(z.string(), z.unknown()).optional(),
  format: z.enum(["PDF", "XLSX", "CSV"]),
}).strict();

export function firstAuditFormError(result) {
  return result.success ? null : result.error.issues[0]?.message || "راجع البيانات";
}
