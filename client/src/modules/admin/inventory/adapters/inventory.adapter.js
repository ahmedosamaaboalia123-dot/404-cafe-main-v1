import { readPageMeta } from "@/api/pagination";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));

const cleanUnit = (unit = {}) => ({
  id: str(unit.id), code: unit.code || "", nameAr: unit.nameAr || unit.code || "",
  kind: unit.kind || "", physicalFactor: str(unit.physicalFactor ?? "0", "0"),
  isActive: unit.isActive !== false, version: Number(unit.version ?? 0),
});

const cleanBatch = (batch = {}) => ({
  id: str(batch.id), batchNumber: batch.batchNumber || "", materialId: str(batch.materialId),
  supplierId: str(batch.supplierId), initialQuantitySmall: str(batch.initialQuantitySmall ?? "0", "0"),
  remainingQuantitySmall: str(batch.remainingQuantitySmall ?? "0", "0"),
  purchaseLargeUnitPrice: str(batch.purchaseLargeUnitPrice ?? "0", "0"),
  initialInventoryValue: str(batch.initialInventoryValue ?? "0", "0"),
  remainingInventoryValue: str(batch.remainingInventoryValue ?? "0", "0"),
  receivedOn: batch.receivedOn ?? null, expiryOn: batch.expiryOn ?? null,
  salePriority: Number(batch.salePriority ?? 0), version: Number(batch.version ?? 0),
});

const cleanMaterial = (material = {}) => ({
  id: str(material.id), name: material.name || "", supplierId: str(material.supplierId),
  largeUnitId: str(material.largeUnitId), smallUnitId: str(material.smallUnitId),
  conversionFactor: str(material.conversionFactor ?? "0", "0"),
  smallQuantityStep: str(material.smallQuantityStep ?? "0", "0"),
  referenceLargeUnitPrice: material.referenceLargeUnitPrice == null ? null : str(material.referenceLargeUnitPrice),
  currency: material.currency || "EGP", minStockSmall: str(material.minStockSmall ?? "0", "0"),
  expiryAlertDays: material.expiryAlertDays ?? null,
  unitsLocked: Boolean(material.unitsLocked), supplierLockedAt: material.supplierLockedAt ?? null,
  supplierLockReason: material.supplierLockReason ?? null, priorityVersion: Number(material.priorityVersion ?? 0),
  stockVersion: Number(material.stockVersion ?? 0), version: Number(material.version ?? 0),
  stockSmall: str(material.stockSmall ?? "0", "0"), stockLarge: str(material.stockLarge ?? "0", "0"),
  lastPurchasePrice: material.lastPurchasePrice ?? null, nextExpiry: material.nextExpiry ?? null,
});

const cleanMovement = (movement = {}) => ({
  ...movement,
  id: str(movement.id), materialId: str(movement.materialId), batchId: str(movement.batchId),
  quantitySmall: str(movement.quantitySmall ?? "0", "0"),
  quantityLarge: movement.quantityLarge == null ? null : str(movement.quantityLarge),
  quantityAfterSmall: str(movement.quantityAfterSmall ?? "0", "0"),
  quantityAfterLarge: movement.quantityAfterLarge == null ? null : str(movement.quantityAfterLarge),
  inventoryValue: str(movement.inventoryValue ?? "0", "0"),
  inventoryValueAfter: str(movement.inventoryValueAfter ?? "0", "0"),
  conversionFactor: movement.conversionFactor == null ? null : str(movement.conversionFactor),
});

export function toMaterialsScreen(data = {}) {
  const materials = (data.materials || []).map(cleanMaterial);
  return {
    materials,
    summary: {
      materials: Number(data.summary?.materials ?? 0), lowStock: data.summary?.lowStock ?? null,
      expiring: data.summary?.expiring ?? null, expired: data.summary?.expired ?? null,
      dataQuality: data.summary?.dataQuality ?? "UNAVAILABLE",
    },
    filters: {
      suppliers: data.filters?.suppliers ?? [],
      units: (data.filters?.units || []).map(cleanUnit),
    },
    pageMeta: readPageMeta(data.pageMeta, materials.length),
  };
}

export function toMaterialDetails(data = {}) {
  const affected = data.affectedProducts;
  const affectedItems = Array.isArray(affected) ? affected : affected?.items || [];
  return {
    material: data.material ? cleanMaterial(data.material) : null,
    stockSummary: data.stockSummary ?? null,
    batches: { items: (data.batches?.items || []).map(cleanBatch), pageMeta: readPageMeta(data.batches?.pageMeta, data.batches?.items?.length || 0) },
    movements: { items: (data.movements?.items || []).map(cleanMovement), pageMeta: readPageMeta(data.movements?.pageMeta, data.movements?.items?.length || 0) },
    affectedProducts: affected == null ? null : affectedItems.map((item) => ({
      ...item,
      productId: str(item.productId || item.id),
      productName: item.productName || item.name || "",
      sizeId: str(item.sizeId),
      sizeName: item.sizeName || "",
    })),
  };
}

export function toUnitOptions(data = {}) {
  const items = (data.items || data.units || []).map(cleanUnit);
  return items.filter((unit) => unit.isActive).map((unit) => ({ value: unit.id, label: `${unit.nameAr} (${unit.code})`, kind: unit.kind, physicalFactor: unit.physicalFactor }));
}

export function toAllUnits(data = {}) {
  return (data.items || data.units || []).map(cleanUnit);
}

export function toWithdrawalsList(data = {}) {
  const items = (data.items || []).map(cleanMovement);
  return { items, pageMeta: readPageMeta(data.pageMeta, items.length) };
}

// Display-only helper: converts between large/small display quantities using the
// material conversionFactor. Never used for decisions or request bodies — the
// server owns all financial/stock values.
export function convertForDisplay(value, conversionFactor, direction = "large-to-small") {
  const amount = Number(value ?? 0);
  const factor = Number(conversionFactor ?? 0);
  if (!Number.isFinite(amount) || !Number.isFinite(factor) || factor <= 0) return "—";
  const result = direction === "small-to-large" ? amount / factor : amount * factor;
  return String(Math.round(result * 1000000) / 1000000);
}

// Forms accept the threshold in the LARGE unit while the server contract stores
// minStockSmall, so the value is multiplied on submit. The result is rounded to
// the 6 decimal places the server accepts and trimmed to its plain (non
// scientific) form; null means the pair cannot produce a valid number.
export function toSmallQuantityString(largeValue, conversionFactor) {
  const large = Number(largeValue ?? 0);
  const factor = Number(conversionFactor ?? 0);
  if (!Number.isFinite(large) || !Number.isFinite(factor) || factor <= 0 || large < 0) return null;
  const rounded = Math.round(large * factor * 1000000) / 1000000;
  const text = String(rounded);
  if (!text.includes("e") && !text.includes("E")) return text;
  return rounded.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
