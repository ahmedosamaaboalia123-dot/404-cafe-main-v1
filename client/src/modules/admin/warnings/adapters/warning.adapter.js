import { readPageMeta } from "@/api/pagination";
import { convertForDisplay } from "@/modules/admin/inventory/adapters/inventory.adapter";

export const WARNING_TYPES = Object.freeze({
  LOW_STOCK: "نقص مخزون",
  EXPIRING: "قرب انتهاء",
  EXPIRED: "منتهي الصلاحية",
  OPEN_SHIFT_LONG: "وردية مفتوحة طويلًا",
});

export const WARNING_SEVERITIES = Object.freeze({ CRITICAL: "حرجة", WARNING: "تحذير" });

// Expiry warnings belong to a single batch; low stock belongs to the material.
const WARNING_SCOPES = Object.freeze({
  BATCH: "على مستوى الدفعة",
  MATERIAL: "على مستوى المادة",
  OTHER: "—",
});

const WARNING_TYPE_VALUES = Object.freeze(["LOW_STOCK", "EXPIRING", "EXPIRED", "OPEN_SHIFT_LONG"]);

export function normalizeWarningType(value) {
  return WARNING_TYPE_VALUES.includes(value) ? value : undefined;
}

export const days = (value) => {
  if (value == null || value === '' || !Number.isInteger(Number(value)) || Number(value) < 0) return 'مدة غير محددة';
  const n = Number(value);
  if (n === 0) return 'اليوم';
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومين';
  return n + (n <= 10 ? ' أيام' : ' يومًا');
};

// Falls back to the batch presence so an older server response still renders the batch context.
function resolveScope(warning = {}) {
  if (WARNING_SCOPES[warning.scope]) return warning.scope;
  if (warning.batch) return "BATCH";
  return warning.type === "LOW_STOCK" ? "MATERIAL" : "OTHER";
}

function batchLabelOf(warning = {}) {
  if (!warning.batch) return null;
  return warning.batch.batchNumber ? `#${warning.batch.batchNumber}` : `#${String(warning.batch.id || "").slice(-6)}`;
}

// Quantities read in the large unit; an older payload without a conversion factor
// falls back to the small amount instead of showing a dash.
function quantityInLargeUnit(value, conversionFactor) {
  if (value == null) return { value: "—", unit: "كبيرة" };
  const large = convertForDisplay(value, conversionFactor, "small-to-large");
  if (large === "—") return { value: String(value), unit: "صغيرة" };
  return { value: large, unit: "كبيرة" };
}

const buildDetail = (warning = {}) => {
  const factor = warning.material?.conversionFactor;
  if (warning.type === "LOW_STOCK") {
    const available = quantityInLargeUnit(warning.currentValue, factor);
    const minimum = quantityInLargeUnit(warning.threshold, factor);
    return `المتاح ${available.value} من حد ${minimum.value} (${available.unit})`;
  }
  // The remaining amount lives in the batch cell, not in the details text.
  if (warning.type === "EXPIRING")
    return `${warning.daysUntilExpiry != null && Number(warning.daysUntilExpiry) === 0 ? "تنتهي اليوم" : `تنتهي خلال ${days(warning.daysUntilExpiry)}`} — ${warning.expiryOn ?? "—"}`;
  if (warning.type === "EXPIRED") return `انتهت ${warning.expiryOn ?? "—"}`;
  return warning.message || warning.detail || "—";
};

const cleanWarning = (warning = {}) => {
  const scope = resolveScope(warning);
  const remaining =
    scope === "BATCH" && warning.currentValue != null
      ? quantityInLargeUnit(warning.currentValue, warning.material?.conversionFactor)
      : null;
  return {
    ...warning,
    id: String(warning.id || ""),
    type: warning.type || "",
    typeLabel: WARNING_TYPES[warning.type] || "تنبيه آخر",
    severity: warning.severity || "WARNING",
    severityLabel: WARNING_SEVERITIES[warning.severity] || "تنبيه",
    scope,
    scopeLabel: WARNING_SCOPES[scope],
    batchLabel: batchLabelOf(warning),
    remaining,
    materialName: warning.material?.name || "—",
    detail: buildDetail(warning),
    material: warning.material ? { ...warning.material, id: String(warning.material.id || "") } : null,
    batch: warning.batch ? { ...warning.batch, id: String(warning.batch.id || "") } : null,
    supplier: warning.supplier ? { ...warning.supplier, id: String(warning.supplier?.id ?? "") } : null,
  };
};

export function toWarningsScreen(data = {}) {
  const items = (data.items || []).map(cleanWarning);
  const summary = data.summary || null;
  return {
    items,
    summary: summary
      ? {
          lowStock: summary.lowStock ?? 0, expiring: summary.expiring ?? 0,
          nearMinimumStock: summary.nearMinimumStock ?? 0,
          expired: summary.expired ?? 0, openShiftLong: summary.openShiftLong ?? null,
        }
      : { lowStock: 0, nearMinimumStock: 0, expiring: 0, expired: 0, openShiftLong: null },
    evaluatedAt: data.evaluatedAt ?? null,
    businessToday: data.businessToday ?? null,
    timezone: data.timezone ?? "Africa/Cairo",
    dataQuality: data.dataQuality ?? "COMPLETE",
    failedSources: data.failedSources ?? [],
    pageMeta: readPageMeta(data.pageMeta, items.length),
  };
}

export function toWarningsSummary(data = {}) {
  const counts = data.counts || data.summary || {};
  return {
    lowStock: counts.lowStock ?? 0, expiring: counts.expiring ?? 0,
    expired: counts.expired ?? 0, openShiftLong: counts.openShiftLong ?? 0,
    dataQuality: data.dataQuality ?? "COMPLETE",
    evaluatedAt: data.evaluatedAt ?? null,
  };
}
