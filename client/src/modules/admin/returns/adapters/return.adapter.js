import { readPageMeta } from "@/api/pagination";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));

const cleanSnapshot = (snapshot = {}) => ({
  ...snapshot,
  id: str(snapshot.id),
  name: snapshot.name || "",
});

const cleanReturn = (item = {}) => ({
  ...item,
  id: str(item.id),
  returnNo: item.returnNo || "",
  status: item.status || "",
  returnDate: item.returnDate ?? null,
  currency: item.currency || "EGP",
  itemCount: Number(item.itemCount ?? 0),
  totalInventoryValue: str(item.totalInventoryValue ?? "0", "0"),
  notes: item.notes ?? "",
  createdAt: item.createdAt ?? null,
  createdBy: item.createdBy ? str(item.createdBy) : null,
});

const cleanReturnItem = (item = {}) => ({
  ...item,
  id: str(item.id),
  returnId: str(item.returnId),
  material: cleanSnapshot(item.material),
  batch: cleanSnapshot(item.batch),
  supplier: cleanSnapshot(item.supplier),
  quantityLarge: str(item.quantityLarge ?? "0", "0"),
  quantitySmall: str(item.quantitySmall ?? "0", "0"),
  unitCost: str(item.unitCost ?? "0", "0"),
  totalValue: str(item.totalValue ?? "0", "0"),
  reason: item.reason || "",
  movementId: item.movementId ? str(item.movementId) : null,
});

export function toReturnsScreen(data = {}) {
  const returns = (data.returns || []).map(cleanReturn);
  return {
    returns,
    summary: {
      count: Number(data.summary?.count ?? 0),
      totalInventoryValue: str(data.summary?.totalInventoryValue ?? "0", "0"),
    },
    filters: { supplierId: data.filters?.supplierId ?? null },
    pageMeta: readPageMeta(data.pageMeta, returns.length),
  };
}

export function toReturnDetails(data = {}) {
  return {
    return: data.return ? cleanReturn(data.return) : null,
    items: (data.items || []).map(cleanReturnItem),
    totals: data.totals ? {
      itemCount: Number(data.totals.itemCount ?? 0),
      totalInventoryValue: str(data.totals.totalInventoryValue ?? "0", "0"),
      currency: data.totals.currency || "EGP",
    } : null,
    actors: data.actors ? {
      createdBy: data.actors.createdBy ? str(data.actors.createdBy) : null,
      returnedBy: data.actors.returnedBy ? str(data.actors.returnedBy) : null,
    } : null,
  };
}

export function toReturnPrintData(data = {}) {
  return {
    ...data,
    number: data.number || "",
    items: (data.items || []).map(cleanReturnItem),
    totals: data.totals ? {
      ...data.totals,
      totalInventoryValue: str(data.totals.totalInventoryValue ?? "0", "0"),
    } : null,
  };
}
