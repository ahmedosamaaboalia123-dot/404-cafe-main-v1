import { AUDIT_MODULES, EXTRA_EVENT_LABELS, normalizeEventType } from './audit.labels';
import { readPageMeta } from "@/api/pagination";

export const AUDIT_RESULTS = Object.freeze({ SUCCESS: "ناجح", FAILED: "فاشل", DENIED: "مرفوض" });
export const AUDIT_SEVERITIES = Object.freeze({ INFO: "معلومة", WARNING: "تحذير", CRITICAL: "حرج" });
export const ACTOR_TYPES = Object.freeze({
  EMPLOYEE: "موظف",
  SYSTEM: "النظام",
  CUSTOMER: "عميل",
  GUEST: "ضيف",
  ANONYMOUS: "مجهول",
});
export const EVENT_TYPE_LABELS = Object.freeze({
  ...EXTRA_EVENT_LABELS,
  ATTENDANCE_CHECKED_IN: "تسجيل حضور",
  ATTENDANCE_CHECKED_OUT: "تسجيل انصراف",
  CUSTOMER_CREATED: "إضافة عميل",
  CUSTOMER_UPSERTED: "تحديث بيانات عميل",
  DELEGATE_CREATED: "إضافة مندوب",
  DELIVERY_ASSIGNED: "إسناد توصيل",
  DELIVERY_CONFIRMED: "تأكيد استلام توصيل",
  DELIVERY_HANDED_OVER: "تسليم طلب لمندوب",
  EMPLOYEE_CREATED: "إضافة موظف",
  EMPLOYEE_DELETED: "حذف موظف",
  EMPLOYEE_DEVICE_APPROVED: "اعتماد جهاز",
  EMPLOYEE_DEVICE_BLOCKED: "حظر جهاز",
  EMPLOYEE_DEVICE_PENDING: "إلغاء اعتماد جهاز",
  EMPLOYEE_PERMISSIONS_REPLACED: "تعديل صلاحيات",
  EMPLOYEE_UPDATED: "تعديل بيانات موظف",
  INVOICE_FINALIZED: "إصدار فاتورة",
  MATERIAL_DELETED: "حذف خامة",
  ORDER_CANCELLED: "إلغاء طلب",
  ORDER_COMPLETED: "إتمام طلب",
  ORDER_READY: "طلب جاهز",
  ORDER_UPDATED: "تعديل طلب",
  PAYMENT_COLLECTED: "تحصيل مبلغ",
  ROLE_CREATED: "إنشاء دور",
  SUPPLIER_ACCOUNT_DEBT: "مديونية مورد",
  SUPPLIER_ACCOUNT_RECEIVABLE: "مستحقات مورد",
  SUPPLIER_CREATED: "إضافة مورد",
  SUPPLIER_STATUS_CHANGED: "تغيير حالة مورد",
  SUPPLIER_UPDATED: "تعديل مورد",
  TABLE_SERVICE_CREATED: "طلب خدمة طاولة",
  TABLE_SERVICE_RESOLVED: "تنفيذ خدمة طاولة",
  TABLE_SESSION_CLOSED: "إغلاق طاولة",
  TABLE_SESSION_ITEMS_ADDED: "إضافة منتجات لطاولة",
  TABLE_SESSION_OPENED: "فتح طاولة",
});

const eventLabel = (value) => EVENT_TYPE_LABELS[normalizeEventType(value)] || "حدث آخر مسجّل";

const cleanEvent = (event = {}) => ({
  ...event,
  id: String(event.id || event._id || ""),
  eventNo: event.eventNo || "",
  eventType: event.eventType || "",
  eventLabel: eventLabel(event.eventType),
  module: event.module || "",
  moduleLabel: AUDIT_MODULES[event.module] || "قسم آخر",
  action: event.action || "",
  actor: event.actor ?? null,
  actorName: event.actor?.name ?? null,
  actorType: event.actor?.type ?? "",
  actorId: event.actor?.id ? String(event.actor.id) : "",
  actorLabel: ACTOR_TYPES[event.actor?.type] || "غير محدد",
  entity: event.entity ?? null,
  result: event.result || "",
  resultLabel: AUDIT_RESULTS[event.result] || "غير محددة",
  severity: event.severity || "",
  severityLabel: AUDIT_SEVERITIES[event.severity] || "غير محددة",
  occurredAt: event.occurredAt ?? null,
});

export function toAuditScreen(data = {}) {
  const items = (data.items || []).map(cleanEvent);
  return {
    items,
    summary: {
      total: Number(data.summary?.total ?? 0),
      success: Number(data.summary?.success ?? 0),
      failed: Number(data.summary?.failed ?? 0),
      denied: Number(data.summary?.denied ?? 0),
      warning: Number(data.summary?.warning ?? 0),
      critical: Number(data.summary?.critical ?? 0),
    },
    filters: data.filters ?? {},
    pageMeta: readPageMeta(data.pageMeta, items.length),
  };
}

export function toAuditEvent(data = {}) {
  return { event: data.event ? cleanEvent(data.event) : null };
}

export function toEntityTimeline(data = {}) {
  const items = (data.items || []).map(cleanEvent);
  return { items, pageMeta: readPageMeta(data.pageMeta, items.length) };
}
