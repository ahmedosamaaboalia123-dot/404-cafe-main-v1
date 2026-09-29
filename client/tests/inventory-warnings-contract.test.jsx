import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { INVENTORY_ENDPOINTS } from "@/modules/admin/inventory/api/inventory.api";
import { WARNING_ENDPOINTS } from "@/modules/admin/warnings/api/warnings.api";
import {
  convertForDisplay,
  toMaterialsScreen,
  toMaterialDetails,
  toSmallQuantityString,
  toUnitOptions,
  toWithdrawalsList,
} from "@/modules/admin/inventory/adapters/inventory.adapter";
import {
  firstInventoryFormError,
  materialFormSchema,
  withdrawFormSchema,
} from "@/modules/admin/inventory/schemas/inventory.schema";
import {
  normalizeWarningType,
  toWarningsScreen,
} from "@/modules/admin/warnings/adapters/warning.adapter";
import { renderApp } from "@/test/renderApp";
import InventoryPage from "@/modules/admin/inventory/pages/InventoryPage";
import MaterialDetailsPage from "@/modules/admin/inventory/pages/MaterialDetailsPage";
import WarningsPage from "@/modules/admin/warnings/pages/WarningsPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));
vi.mock("@/modules/admin/suppliers/services/suppliersService", () => ({ getSupplierOptions: () => Promise.resolve({ data: [] }) }));

vi.mock("@/modules/admin/inventory/hooks/inventory.queries", () => ({
  useMaterialsScreen: () => ({
    data: {
      materials: [
        { id: "m1", name: "بن أرابيكا", supplierId: "s1", largeUnitId: "u1", stockSmall: "1200", lastPurchasePrice: "450.00", nextExpiry: "2026-12-01", status: "ACTIVE", version: 4 },
        { id: "m2", name: "سكر", supplierId: "s2", largeUnitId: "u1", stockSmall: "300", lastPurchasePrice: "60.00", nextExpiry: null, status: "ACTIVE", version: 2 },
      ],
      summary: { materials: 2, lowStock: 1, expiring: 0, expired: 0, dataQuality: "COMPLETE" },
      filters: { suppliers: [{ id: "s1", name: "مورد النور" }, { id: "s2", name: "مورد الشمس" }], units: [], statuses: ["ACTIVE", "INACTIVE"] },
      pageMeta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useUnitsQuery: () => ({ data: [{ value: "u1", label: "كجم" }, { value: "u2", label: "جرام" }], isLoading: false }),
  useMaterialDetailsQuery: () => ({
    data: detailsState.data,
    isLoading: false, isError: false, refetch: vi.fn(),
  }),
  useWithdrawalsQuery: () => ({
    data: { items: [{ id: "w1", kind: "WITHDRAWAL", quantitySmall: "100", inventoryValue: "45.00", quantityAfterSmall: "1100", reason: "هالك", occurredOn: "2026-09-12" }], pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
}));

vi.mock("@/modules/admin/warnings/hooks/warning.queries", () => ({
  useWarningsScreen: () => ({
    data: {
      items: [
        { id: "LOW_STOCK:m1", type: "LOW_STOCK", typeLabel: "نقص مخزون", severity: "CRITICAL", severityLabel: "حرجة", scope: "MATERIAL", scopeLabel: "على مستوى المادة", batchLabel: null, remaining: null, materialId: "m1", materialName: "سكر", detail: "المتاح 0.3 من حد 0.5 (كبيرة)" },
        { id: "EXPIRED:b9", type: "EXPIRED", typeLabel: "منتهي الصلاحية", severity: "CRITICAL", severityLabel: "حرجة", scope: "BATCH", scopeLabel: "على مستوى الدفعة", batchLabel: "#B-009", remaining: { value: "1.5", unit: "كبيرة" }, materialId: "m1", materialName: "بن أرابيكا", detail: "انتهت 2026-09-01" },
      ],
      summary: { lowStock: 1, expiring: 0, expired: 1, openShiftLong: null },
      pageMeta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
      dataQuality: "FULL",
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
}));

// Mutable holder for the details query so the remount test can simulate a
// refetch with newer server data. Read lazily by the mocked hook above.
const detailsState = {
  data: {
    material: { id: "m1", name: "بن أرابيكا", supplierId: "s1", largeUnitId: "u1", smallUnitId: "u2", conversionFactor: "1000", minStockSmall: "500", expiryAlertDays: 30, status: "ACTIVE", stockSmall: "1200", lastPurchasePrice: "450.00", nextExpiry: "2026-12-01", priorityVersion: 1, version: 4 },
    batches: { items: [
      { id: "b1", batchNumber: "B-001", initialQuantitySmall: "2000", remainingQuantitySmall: "1200", remainingInventoryValue: "540.00", receivedOn: "2026-09-01", expiryOn: "2026-12-01", salePriority: 1, version: 2 },
      { id: "b2", batchNumber: "B-002", initialQuantitySmall: "1000", remainingQuantitySmall: "0", remainingInventoryValue: "0.00", receivedOn: "2026-08-01", expiryOn: "2026-11-01", salePriority: 2, version: 1 },
    ] },
    stockSummary: { stockSmall: "1200", stockLarge: "1.2", inventoryValue: "540.00" },
  }
};

const adminAuth = {  permissions: [
    { pageKey: "inventory", visible: true, actions: ["read", "create", "update", "manage", "withdraw", "priorities"] },
    { pageKey: "warnings", visible: true, actions: ["read"] },
  ],
};

describe("inventory + warnings v1 contract", () => {
  it("targets the real backend routes, not legacy paths", () => {
    expect(INVENTORY_ENDPOINTS.screen).toBe("/raw-materials-screen");
    expect(INVENTORY_ENDPOINTS.details("abc")).toBe("/raw-materials/abc");
    expect(INVENTORY_ENDPOINTS.withdraw("abc")).toBe("/raw-materials/abc/withdrawals");
    expect(INVENTORY_ENDPOINTS.priorities("abc")).toBe("/raw-materials/abc/batch-priorities");
    expect(INVENTORY_ENDPOINTS.withdrawals).toBe("/withdrawals");
    expect(INVENTORY_ENDPOINTS.units).toBe("/measurement-units");
    expect(WARNING_ENDPOINTS.screen).toBe("/warnings-screen");
    expect(WARNING_ENDPOINTS.summary).toBe("/warnings/summary");
  });

  it("keeps money as strings and cleans batches, units, and movements", () => {
    const screen = toMaterialsScreen({
      materials: [{ id: "m1", stockSmall: 1200, lastPurchasePrice: "450.00", version: 4 }],
      summary: { materials: 1 },
      filters: {},
    });
    expect(screen.materials[0].stockSmall).toBe("1200");
    expect(screen.materials[0].lastPurchasePrice).toBe("450.00");
    expect(screen.materials[0].version).toBe(4);
    expect(screen.summary.materials).toBe(1);
    const details = toMaterialDetails({
      material: { id: "m1", name: "x", priorityVersion: 1 },
      batches: { items: [{ id: "b2", salePriority: 2, remainingQuantitySmall: 0, remainingInventoryValue: 0 }, { id: "b1", salePriority: 1, remainingQuantitySmall: 5, remainingInventoryValue: 10 }] },
    });
    expect(details.batches.items).toHaveLength(2);
    expect(details.batches.items[0].remainingInventoryValue).toBe("0");
    expect(details.batches.items[1].remainingInventoryValue).toBe("10");
    expect(toUnitOptions({ items: [{ id: "u1", nameAr: "كيلوجرام", code: "KG", kind: "WEIGHT", physicalFactor: 1, isActive: true }, { id: "u2", nameAr: "قديم", code: "OLD", isActive: false }] })).toEqual([{ value: "u1", label: "كيلوجرام (KG)", kind: "WEIGHT", physicalFactor: "1" }]);
    const movements = toWithdrawalsList({ items: [{ id: "w1", quantitySmall: 100, inventoryValue: 45 }] });
    expect(movements.items[0].quantitySmall).toBe("100");
    expect(movements.items[0].quantityLarge).toBeNull();
    const converted = toWithdrawalsList({
      items: [
        {
          id: "w1", quantitySmall: "100", quantityLarge: "0.1",
          quantityAfterSmall: "1100", quantityAfterLarge: "1.1",
          inventoryValue: "45.00", conversionFactor: "1000",
        },
      ],
    });
    expect(converted.items[0].quantityLarge).toBe("0.1");
    expect(converted.items[0].quantityAfterLarge).toBe("1.1");
    expect(converted.items[0].conversionFactor).toBe("1000");
  });

  it("validates material and withdrawal bodies exactly like the backend", () => {
    const supplierId = "507f1f77bcf86cd799439011";
    const largeUnitId = "507f1f77bcf86cd799439012";
    const smallUnitId = "507f1f77bcf86cd799439013";
    const batchId = "507f1f77bcf86cd799439014";
    const good = materialFormSchema.safeParse({ name: "بن", supplierId, largeUnitId, smallUnitId, conversionFactor: "1000", smallQuantityStep: "1", minStockSmall: "500", expiryAlertDays: 30 });
    expect(good.success).toBe(true);
    expect(good.success && good.data.conversionFactor).toBe("1000");
    expect(materialFormSchema.safeParse({ name: "بن", supplierId, largeUnitId, smallUnitId: largeUnitId, conversionFactor: "1", smallQuantityStep: "1", minStockSmall: "0", expiryAlertDays: 0 }).success).toBe(false);
    expect(materialFormSchema.safeParse({ name: "بن", supplierId, largeUnitId, smallUnitId, conversionFactor: "0", smallQuantityStep: "1", minStockSmall: "0", expiryAlertDays: 0 }).success).toBe(false);
    expect(materialFormSchema.safeParse({ name: "بن", supplierId: "s1", largeUnitId, smallUnitId, conversionFactor: "1", smallQuantityStep: "1", minStockSmall: "0", expiryAlertDays: 0 }).success).toBe(false);
    expect(firstInventoryFormError(materialFormSchema.safeParse({ name: "", supplierId: "", largeUnitId: "", smallUnitId: "", conversionFactor: "", smallQuantityStep: "", minStockSmall: "" }))).toBeTruthy();
    expect(withdrawFormSchema.safeParse({ batchId, quantityLarge: "2", reason: "هالك تشغيل", occurredOn: "2026-09-12", expectedBatchVersion: 2 }).success).toBe(true);
    expect(withdrawFormSchema.safeParse({ batchId: "", quantityLarge: "0", reason: "ab", occurredOn: "x", expectedBatchVersion: 0 }).success).toBe(false);
  });

  it("converts display quantities without exposing unit management", () => {
    expect(convertForDisplay("2", "1000")).toBe("2000");
    expect(convertForDisplay("2000", "1000", "small-to-large")).toBe("2");
    expect(convertForDisplay("2", "0")).toBe("—");
  });

  it("converts the minimum stock entered in the large unit into the stored small amount", () => {
    expect(toSmallQuantityString("2", "1000")).toBe("2000");
    expect(toSmallQuantityString("0.5", "1000")).toBe("500");
    expect(toSmallQuantityString("1.5", "0.5")).toBe("0.75");
    expect(toSmallQuantityString("0", "1000")).toBe("0");
    expect(toSmallQuantityString("", "1000")).toBe("0");
    // Rounded to the 6 decimal places the server accepts, never scientific.
    expect(toSmallQuantityString("1", "0.0000012")).toBe("0.000001");
    expect(toSmallQuantityString("1", "1000000")).toBe("1000000");
    // Invalid pairs never reach the request body.
    expect(toSmallQuantityString("2", "0")).toBeNull();
    expect(toSmallQuantityString("2", "abc")).toBeNull();
    expect(toSmallQuantityString("-1", "1000")).toBeNull();
  });

  it("normalizes warning type filters and labels severities", () => {
    expect(normalizeWarningType("all")).toBeUndefined();
    expect(normalizeWarningType("LOW_STOCK")).toBe("LOW_STOCK");
    expect(normalizeWarningType("bogus")).toBeUndefined();
    const screen = toWarningsScreen({
      warnings: undefined,
      items: undefined,
    });
    expect(screen.items).toEqual([]);
    const full = toWarningsScreen({
      items: [
        { id: "LOW_STOCK:m1", type: "LOW_STOCK", severity: "CRITICAL", scope: "MATERIAL", threshold: "500", currentValue: "300", material: { id: "m1", name: "سكر", conversionFactor: "1000" } },
        { id: "EXPIRING:b1", type: "EXPIRING", severity: "WARNING", scope: "BATCH", daysUntilExpiry: 3, expiryOn: "2026-09-15", currentValue: "2000", batch: { id: "b1", batchNumber: "B-001" }, material: { id: "m1", name: "بن", conversionFactor: "1000" } },
        { id: "OPEN_SHIFT_LONG:x", type: "OPEN_SHIFT_LONG", severity: "WARNING" },
      ],
      summary: { lowStock: 1, expiring: 1, expired: 0, openShiftLong: null },
      pageMeta: { page: 1, limit: 10, totalItems: 3, totalPages: 1 },
      dataQuality: "FULL",
    });
    expect(full.items[0].severityLabel).toBe("حرجة");
    expect(full.items[0].typeLabel).toBe("نقص مخزون");
    expect(full.items[0].materialName).toBe("سكر");
    expect(full.items[0].scope).toBe("MATERIAL");
    expect(full.items[0].batchLabel).toBeNull();
    expect(full.items[0].remaining).toBeNull();
    expect(full.items[0].detail).toBe("المتاح 0.3 من حد 0.5 (كبيرة)");
    expect(full.items[1].severityLabel).toBe("تحذير");
    // The batch is its own cell, so it is no longer folded into the details text.
    expect(full.items[1].scope).toBe("BATCH");
    expect(full.items[1].batchLabel).toBe("#B-001");
    expect(full.items[1].remaining).toEqual({ value: "2", unit: "كبيرة" });
    expect(full.items[1].detail).toBe("تنتهي خلال 3 أيام — 2026-09-15");
    expect(full.items[2].materialName).toBe("—");
    expect(full.summary.openShiftLong).toBeNull();
  });

  it("keeps the batch scope readable when the server omits the new fields", () => {
    const legacy = toWarningsScreen({
      items: [
        { id: "EXPIRED:b9", type: "EXPIRED", severity: "CRITICAL", expiryOn: "2026-09-01", currentValue: "1500", batch: { id: "abcdef123456", batchNumber: null }, material: { id: "m1", name: "بن" } },
        { id: "LOW_STOCK:m1", type: "LOW_STOCK", severity: "WARNING", currentValue: "300", threshold: "500", material: { id: "m1", name: "سكر" } },
      ],
      summary: { lowStock: 1, expiring: 0, expired: 1, openShiftLong: null },
      pageMeta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
      dataQuality: "FULL",
    });
    expect(legacy.items[0].scope).toBe("BATCH");
    expect(legacy.items[0].batchLabel).toBe("#123456");
    // No conversionFactor from the old payload: the amount stays small instead of breaking.
    expect(legacy.items[0].remaining).toEqual({ value: "1500", unit: "صغيرة" });
    expect(legacy.items[0].detail).toBe("انتهت 2026-09-01");
    expect(legacy.items[1].scope).toBe("MATERIAL");
  });
});

describe("inventory pages on the v1 layer", () => {
  it("renders the server screen with material edit and delete actions", () => {
    renderApp(<InventoryPage />, { route: "/admin/inventory", auth: adminAuth });
    expect(screen.getByText("بن أرابيكا")).toBeInTheDocument();
    expect(screen.getByText("سكر")).toBeInTheDocument();
    expect(screen.getByText("إضافة مادة خام")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حذف بن أرابيكا" })).toBeInTheDocument();
    expect(screen.queryByText("إضافة دفعة")).not.toBeInTheDocument();
  });

  it("shows stock quantities as plain numbers, not money", () => {
    renderApp(<InventoryPage />, { route: "/admin/inventory", auth: adminAuth });
    // The stock column header is per-small-unit, so values render raw.
    const cells = [...document.querySelectorAll(".stock-qty-cell")].map((td) => td.textContent);
    expect(cells).toEqual(["1200", "300"]);
  });

  it("renders material details with priority order and final-withdraw form", () => {
    renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    expect(screen.getByText("تفاصيل المادة: بن أرابيكا")).toBeInTheDocument();
    expect(screen.getByText("سحب يدوي من المخزون (نهائي)")).toBeInTheDocument();
    expect(screen.getByText("تأكيد السحب النهائي")).toBeInTheDocument();
    expect(screen.queryByText("حذف الدفعة")).not.toBeInTheDocument();
  });

  it("shows supplier and unit names instead of raw IDs", () => {
    renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    expect(screen.getByDisplayValue("مورد النور")).toBeInTheDocument();
    expect(screen.getByDisplayValue("كجم")).toBeInTheDocument();
    expect(screen.getByDisplayValue("جرام")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("s1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("u1 / u2")).not.toBeInTheDocument();
  });

  /**
   * The batches table shows the remaining quantity in the LARGE unit (conversionFactor
   * 1000 -> 1200 small = 1.2 large), not the raw small-unit amount.
   */
  it("shows the remaining batch quantity in the large unit", () => {
    renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    expect(screen.getByText("الكمية الكبيرة")).toBeInTheDocument();
    expect(screen.queryByText("المتاحة")).not.toBeInTheDocument();

    // 1200 small with a factor of 1000 reads 1.2 large; the drained batch reads 0.
    const cells = [...document.querySelectorAll(".quantity-large-cell")].map((td) => td.textContent);
    expect(cells).toEqual(["1.2", "0"]);
  });

  it("shows the opening batch quantity in the large unit", () => {
    renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    expect(screen.getByText("الافتتاحية (كبيرة)")).toBeInTheDocument();
    // 2000 small / factor 1000 = 2 large, 1000 small / 1000 = 1 large.
    const opening = [...document.querySelectorAll('[data-label="الافتتاحية"]')].map((td) => td.textContent);
    expect(opening).toEqual(["2", "1"]);
  });

  it("fills the stock and last-purchase cards from the server response", () => {
    renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    const summary = document.querySelector(".mat-summary");
    expect(summary).not.toBeNull();
    // Stock reads 1200 small = 1.2 large, and the last purchase price is not empty.
    expect(summary.textContent).toContain("المخزون (كبيرة)");
    expect(summary.textContent).toContain("1.2");
    expect(summary.textContent).toContain("1200 صغيرة");
    expect(summary.textContent).toContain("آخر سعر شراء");
    // The last-purchase card is filled (Money renders localized digits), not the "—" placeholder.
    const priceCard = [...summary.querySelectorAll("article")].find((item) => item.textContent.includes("آخر سعر شراء"));
    expect(priceCard?.textContent).not.toContain("—");
  });

  it("shows the minimum stock threshold in the large unit", () => {
    renderApp(<InventoryPage />, { route: "/admin/inventory", auth: adminAuth });
    expect(screen.getByText("حد التنبيه (كبيرة)")).toBeInTheDocument();

    renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    // The stored 500 small with a factor of 1000 reads 0.5 in the large unit.
    expect(screen.getByText("الحد الأدنى للمخزون (كبيرة)")).toBeInTheDocument();
    const input = document.querySelector('.mat-input[name="minStockLarge"]');
    expect(input?.value).toBe("0.5");
  });

  it("shows withdrawal movements of the material in the large unit", () => {
    renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    // The mocked withdrawal is 100 small with a factor of 1000 -> 0.1 large, 1100 -> 1.1.
    const cells = [...document.querySelectorAll(".movement-qty-cell")].map((td) => td.textContent);
    expect(cells).toEqual(["0.1", "1.1"]);
  });

  it("resets the edit form when newer server data arrives", () => {
    const previous = detailsState.data;
    const { rerender, queryClient } = renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    expect(document.querySelector('.mat-input[name="minStockLarge"]')?.value).toBe("0.5");
    // Simulate a refetch with server-normalized values and a bumped version.
    // The key on the editor remounts it inside the SAME tree (router kept).
    detailsState.data = {
      ...previous,
      material: { ...previous.material, name: "بن محدث", minStockSmall: "2000", version: 5 },
    };
    try {
      rerender(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/admin/inventory/m1"]}>
            <MaterialDetailsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(document.querySelector('.mat-input[name="minStockLarge"]')?.value).toBe("2");
      expect(document.querySelector('.mat-input[name="name"]')?.value).toBe("بن محدث");
    } finally {
      detailsState.data = previous;
    }
  });
});

describe("warnings page on the v1 layer", () => {
  it("renders server summary and active warnings without local actions", () => {
    renderApp(<WarningsPage />, { route: "/admin/warnings", auth: adminAuth });
    expect(screen.getAllByText("نقص المخزون").length).toBeGreaterThan(0);
    expect(screen.getByText("سكر")).toBeInTheDocument();
    expect(screen.getAllByText("منتهية الصلاحية").length).toBeGreaterThan(0);
    expect(screen.queryByText("حل التحذير")).not.toBeInTheDocument();
  });

  it("scopes expiry rows to their own batch and keeps stock rows on the material", () => {
    renderApp(<WarningsPage />, { route: "/admin/warnings", auth: adminAuth });
    // Expiry: a dedicated batch cell with the remaining amount, not folded into the details text.
    const batchCells = [...document.querySelectorAll(".warning-batch-cell")].map((cell) => cell.textContent);
    expect(batchCells).toHaveLength(2);
    expect(batchCells[0]).toContain("المادة كاملة");
    expect(batchCells[1]).toContain("#B-009");
    expect(batchCells[1]).toContain("المتبقي 1.5 كبيرة");
    expect(batchCells[1]).not.toContain("على مستوى");
    expect(document.body.textContent).toContain("انتهت 2026-09-01");
    // The counters describe batches, not materials.
    expect(screen.getAllByText("عدد الدفعات المتأثرة").length).toBe(2);
  });
});
