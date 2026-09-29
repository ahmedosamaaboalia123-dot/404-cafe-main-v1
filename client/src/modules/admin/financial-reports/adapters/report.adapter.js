import { readPageMeta } from "@/api/pagination";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));
const moneyOrNull = (value) => (value === undefined || value === null ? null : str(value));

export const REPORT_TYPES = Object.freeze([
  { value: "sales", label: "المبيعات" },
  { value: "inventory", label: "المخزون" },
  { value: "drawer", label: "الدرج" },
  { value: "suppliers", label: "الموردين" },
  { value: "delegates", label: "المناديب" },
  { value: "audit:events", label: "سجل التدقيق" },
]);

export const EXPORT_FORMATS = Object.freeze([
  { value: "PDF", label: "PDF" },
  { value: "XLSX", label: "Excel" },
  { value: "CSV", label: "CSV" },
]);

export const EXPORT_STATUSES = Object.freeze({
  PROCESSING: "قيد التجهيز",
  READY: "جاهز",
  FAILED: "فشل",
});

export function toReportScreen(data = {}) {
  return {
    period: data.period ? { ...data.period } : null,
    comparisonPeriod: data.comparisonPeriod ?? null,
    dataQuality: data.dataQuality ?? "COMPLETE",
    failedSources: data.failedSources ?? [],
    cards: data.cards ? { ...data.cards } : null,
    charts: {
      salesTrend: data.charts?.salesTrend ?? [],
      channelMix: data.charts?.channelMix ?? [],
    },
    topProducts: data.topProducts ?? [],
    alerts: data.alerts ?? [],
    generatedAt: data.generatedAt ?? null,
  };
}

const withQuality = (data = {}) => ({
  dataQuality: data.dataQuality ?? "COMPLETE",
  failedSources: data.failedSources ?? [],
  generatedAt: data.generatedAt ?? null,
});

export function toSalesReport(data = {}) {
  const items = (data.items || data.trend || []).map((row) => ({ ...row }));
  return {
    summary: data.summary ? { ...data.summary } : null,
    items,
    pageMeta: readPageMeta(data.pageMeta, items.length),
    breakdowns: data.breakdowns ?? { channelMix: [], topProducts: [] },
    ...withQuality(data),
  };
}

export function toInventoryReport(data = {}) {
  const items = (data.items || []).map((row) => ({ ...row, materialId: str(row.materialId) }));
  return {
    summary: data.summary ? { ...data.summary } : null,
    items,
    pageMeta: readPageMeta(data.pageMeta, items.length),
    breakdowns: data.breakdowns ?? { valueByMaterial: [], expiring: [] },
    ...withQuality(data),
  };
}

export function toDrawerReport(data = {}) {
  const items = (data.items || []).map((row) => ({ ...row, shiftId: str(row.shiftId) }));
  return {
    summary: data.summary ? { ...data.summary } : null,
    items,
    pageMeta: readPageMeta(data.pageMeta, items.length),
    breakdowns: data.breakdowns ?? { byAccountingClass: [] },
    ...withQuality(data),
  };
}

export function toSupplierReport(data = {}) {
  const items = (data.items || []).map((row) => ({ ...row }));
  return {
    summary: data.summary ? { ...data.summary } : null,
    items,
    pageMeta: readPageMeta(data.pageMeta, items.length),
    breakdowns: data.breakdowns ?? { topDebtors: [], recentEntries: [] },
    ...withQuality(data),
  };
}

export function toDelegateReport(data = {}) {
  const items = (data.items || []).map((row) => ({ ...row }));
  return {
    summary: data.summary ? { ...data.summary } : null,
    items,
    pageMeta: readPageMeta(data.pageMeta, items.length),
    breakdowns: data.breakdowns ?? { perDelegate: [] },
    ...withQuality(data),
  };
}

export function toExportJob(data = {}) {
  const job = data.export || data;
  return {
    id: str(job.id),
    exportNo: job.exportNo || "",
    status: job.status || "PROCESSING",
    statusLabel: EXPORT_STATUSES[job.status] || job.status || "—",
    statusUrl: job.statusUrl || null,
    progress: Number(job.progress ?? (job.status === "READY" ? 100 : job.status === "PROCESSING" ? 50 : 0)),
    rowCount: job.rowCount ?? null,
    checksum: job.checksum ?? null,
    errorCode: job.errorCode ?? null,
    expiresAt: job.expiresAt ?? null,
  };
}

export { moneyOrNull, str };
