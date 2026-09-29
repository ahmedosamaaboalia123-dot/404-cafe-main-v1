import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "معرف غير صالح");
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "الوقت بصيغة HH:MM");
const isoDate = z.string().date("التاريخ غير صحيح (YYYY-MM-DD)");
const isoDateTime = z.string().datetime({ offset: true, message: "التاريخ والوقت غير صحيحين" });

const scheduleSchema = z.object({
  workStart: clockTime,
  workEnd: clockTime,
  crossesMidnight: z.boolean(),
  timezone: z.literal("Africa/Cairo"),
  graceMinutes: z.number().int().min(0).max(180),
}).strict();

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, "اسم الموظف لا يقل عن حرفين").max(100),
  passwordPlainText: z.string().min(1, "كلمة المرور مطلوبة").max(128),
  position: z.string().trim().min(2, "المسمى لا يقل عن حرفين").max(100),
  roleId: z.string().min(1, "اختر دور الموظف").regex(/^[0-9a-f]{24}$/i, "الدور المختار غير صالح"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  workStart: clockTime,
  workEnd: clockTime,
  crossesMidnight: z.boolean().default(false),
  timezone: z.literal("Africa/Cairo").default("Africa/Cairo"),
  graceMinutes: z.number().int().min(0).max(180).default(0),
}).strict();

export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  passwordPlainText: z.string().min(1).max(128).optional(),
  position: z.string().trim().min(2).max(100).optional(),
  roleId: objectId.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  schedule: scheduleSchema.optional(),
  reason: z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500).optional(),
  expectedVersion: z.number().int().min(0),
}).strict().refine((value) => value.status !== "INACTIVE" || (value.reason && value.reason.trim().length >= 3), {
  message: "إيقاف الموظف يتطلب سببًا",
  path: ["reason"],
});

export const deviceDecisionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  reason: z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500).optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export const permissionMatrixSchema = z.object({
  roleId: objectId,
  permissions: z.array(z.object({
    permissionKey: z.string().min(3),
    effect: z.enum(["ALLOW", "DENY"]),
  }).strict()).max(300),
  pages: z.array(z.object({
    pageKey: z.string().min(2),
    visible: z.boolean(),
  }).strict()).max(100),
  expectedPermissionsVersion: z.number().int().min(1),
}).strict();

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "اسم الدور لا يقل عن حرفين").max(100),
  level: z.number().int().min(0).max(1000),
  description: z.string().max(500).optional(),
  permissionKeys: z.array(z.string().min(3)).max(300).default([]),
}).strict();

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  level: z.number().int().min(0).max(1000).optional(),
  description: z.string().max(500).optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export const rolePermissionsSchema = z.object({
  permissionKeys: z.array(z.string().min(3)).max(300),
  expectedVersion: z.number().int().min(0),
}).strict();

export const checkOutSchema = z.object({
  notes: z.string().trim().max(500).optional(),
  expectedVersion: z.number().int().min(0),
}).strict();

export const adjustAttendanceSchema = z.object({
  kind: z.enum(["CHECK_IN", "CHECK_OUT", "BOTH"]),
  changes: z.object({
    checkInAt: isoDateTime.optional(),
    checkOutAt: isoDateTime.nullable().optional(),
  }).strict(),
  reason: z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500),
  expectedVersion: z.number().int().min(0),
}).strict().refine((value) => Object.keys(value.changes).length > 0, {
  message: "حدد تغييرًا واحدًا على الأقل",
  path: ["changes"],
});

export const forceCloseSchema = z.object({
  checkOutAt: isoDateTime.optional(),
  reason: z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500),
  expectedVersion: z.number().int().min(0),
}).strict();

export function firstEmployeeFormError(result) {
  return result.success ? null : result.error.issues[0]?.message || "راجع البيانات";
}

export { isoDate };
