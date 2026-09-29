import { readPageMeta } from "@/api/pagination";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));

export const PURCHASE_GROUP_STATUSES = Object.freeze({
  DRAFT: "مسودة",
  SPLIT: "مقسمة",
  PARTIALLY_REGISTERED: "مسجلة جزئيًا",
  REGISTERED: "مسجلة",
});

export const PURCHASE_ITEM_STATUSES = Object.freeze({
  PENDING: "بانتظار التسجيل",
  REGISTERED: "مسجل",
});

export const PURCHASE_TABS = Object.freeze([
  { value: "unregistered", label: "غير المسجلة" },
  { value: "registered", label: "المسجلة" },
  { value: "all", label: "الكل" },
]);

const cleanGroup = (group = {}) => ({
  ...group,
  id: str(group.id),
  groupNo: group.groupNo || "",
  invoiceDate: group.invoiceDate ?? null,
  status: group.status || "DRAFT",
  statusLabel: PURCHASE_GROUP_STATUSES[group.status] || group.status || "—",
  currency: group.currency || "EGP",
  itemCount: Number(group.itemCount ?? 0),
  registeredCount: Number(group.registeredCount ?? 0),
  subtotal: str(group.subtotal ?? "0", "0"),
  splitVersion: Number(group.splitVersion ?? 0),
  splitOutdated: Boolean(group.splitOutdated),
  version: Number(group.version ?? 0),
});

const cleanSnapshot = (snapshot = {}) => ({
  ...snapshot,
  id: str(snapshot.id),
  name: snapshot.name || "",
});

const cleanItem = (item = {}) => ({
  ...item,
  id: str(item.id),
  groupId: str(item.groupId),
  supplierInvoiceId: item.supplierInvoiceId ? str(item.supplierInvoiceId) : null,
  material: cleanSnapshot(item.material),
  supplier: cleanSnapshot(item.supplier),
  unit: cleanSnapshot(item.unit),
  lastBatchPrice: item.lastBatchPrice == null ? null : str(item.lastBatchPrice),
  quantityLarge: str(item.quantityLarge ?? "0", "0"),
  quantitySmall: str(item.quantitySmall ?? "0", "0"),
  largeUnitPrice: str(item.largeUnitPrice ?? "0", "0"),
  lineTotal: str(item.lineTotal ?? "0", "0"),
  status: item.status || "PENDING",
  statusLabel: PURCHASE_ITEM_STATUSES[item.status] || item.status || "—",
  batchId: item.batchId ? str(item.batchId) : null,
  movementId: item.movementId ? str(item.movementId) : null,
  receivedOn: item.receivedOn ?? null,
  expiryOn: item.expiryOn ?? null,
  version: Number(item.version ?? 0),
});

const cleanInvoice = (invoice = {}) => ({
  ...invoice,
  id: str(invoice.id),
  groupId: str(invoice.groupId),
  invoiceNo: invoice.invoiceNo || "",
  supplier: cleanSnapshot(invoice.supplier),
  status: invoice.status || "",
  statusLabel: PURCHASE_GROUP_STATUSES[invoice.status] || invoice.status || "—",
  itemCount: Number(invoice.itemCount ?? 0),
  registeredCount: Number(invoice.registeredCount ?? 0),
  subtotal: str(invoice.subtotal ?? "0", "0"),
  currency: invoice.currency || "EGP",
  splitVersion: Number(invoice.splitVersion ?? 0),
  version: Number(invoice.version ?? 0),
});

export function toPurchasesScreen(data = {}) {
  const groups = (data.groups || []).map(cleanGroup);
  return {
    groups,
    summary: {
      draft: Number(data.summary?.draft ?? 0),
      split: Number(data.summary?.split ?? 0),
      partiallyRegistered: Number(data.summary?.partiallyRegistered ?? 0),
      registered: Number(data.summary?.registered ?? 0),
    },
    filters: { tabs: data.filters?.tabs ?? ["unregistered", "registered", "all"] },
    pageMeta: readPageMeta(data.pageMeta, groups.length),
  };
}

export function toPurchaseGroupDetails(data = {}) {
  return {
    group: data.group ? cleanGroup(data.group) : null,
    items: (data.items || []).map(cleanItem),
    supplierInvoices: (data.supplierInvoices || []).map(cleanInvoice),
    totals: data.totals ? { subtotal: str(data.totals.subtotal ?? "0", "0"), currency: data.totals.currency || "EGP" } : null,
  };
}

export function toPurchasePrintData(data = {}) {
  return {
    ...data,
    number: data.number || "",
    statusLabel: PURCHASE_GROUP_STATUSES[data.status] || data.status || "—",
    items: (data.items || []).map(cleanItem),
    totals: data.totals ? { subtotal: str(data.totals.subtotal ?? "0", "0"), currency: data.totals.currency || "EGP" } : null,
    supplier: data.supplier ? cleanSnapshot(data.supplier) : null,
  };
}
