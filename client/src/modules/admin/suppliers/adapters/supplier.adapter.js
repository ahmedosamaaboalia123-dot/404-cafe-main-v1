import { readPageMeta } from "@/api/pagination";

const cleanSupplier = (supplier = {}) => ({
  id: String(supplier.id || ""), name: supplier.name || "", contactPerson: supplier.contactPerson || "",
  phone: supplier.phone || "", city: supplier.city || "",
  debtBalance: String(supplier.debtBalance ?? "0"), receivableBalance: String(supplier.receivableBalance ?? "0"),
  createdAt: supplier.createdAt ?? null, updatedAt: supplier.updatedAt ?? null, version: Number(supplier.version ?? 0),
});
export function toSuppliersScreen(data = {}) {
  const suppliers = (data.suppliers || []).map(cleanSupplier);
  return { suppliers, summary: { totalSuppliers: Number(data.summary?.totalSuppliers ?? 0), totalDebt: String(data.summary?.totalDebt ?? "0"), totalReceivable: String(data.summary?.totalReceivable ?? "0") }, filters: data.filters ?? { cities: [] }, pageMeta: readPageMeta(data.pageMeta, suppliers.length) };
}
export const toSupplierEntry = (entry = {}) => ({ ...entry, id: String(entry.id || ""), supplierId: String(entry.supplierId || ""), amount: String(entry.amount ?? "0"), debtBalanceAfter: String(entry.debtBalanceAfter ?? "0"), receivableBalanceAfter: String(entry.receivableBalanceAfter ?? "0"), sequenceNo: Number(entry.sequenceNo ?? 0) });
export function toSupplierDetails(data = {}) {
  const materialsData = data.materials || {};
  return { supplier: cleanSupplier(data.supplier), account: data.account ? { ...data.account, supplierId: String(data.account.supplierId), debtBalance: String(data.account.debtBalance ?? "0"), receivableBalance: String(data.account.receivableBalance ?? "0"), version: Number(data.account.version ?? 0) } : null, recentEntries: (data.recentEntries?.items || []).map(toSupplierEntry), materials: (materialsData.items || []).map((item) => ({ ...item, id: String(item.id) })), materialsPageMeta: readPageMeta(materialsData.pageMeta, materialsData.items?.length || 0) };
}
export function toSupplierEntries(data = {}) { const items = (data.items || []).map(toSupplierEntry); return { items, account: data.account ? { ...data.account, debtBalance: String(data.account.debtBalance), receivableBalance: String(data.account.receivableBalance), version: Number(data.account.version ?? 0) } : null, pageMeta: readPageMeta(data.pageMeta, items.length) }; }
