import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { normalizeApiError } from "@/api/apiError";
import { toMaterialDetails } from "@/modules/admin/inventory/adapters/inventory.adapter";
import { renderApp } from "@/test/renderApp";
import MaterialDetailsPage from "@/modules/admin/inventory/pages/MaterialDetailsPage";
import InventoryPage from "@/modules/admin/inventory/pages/InventoryPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

vi.mock("@/modules/admin/inventory/hooks/inventory.queries", () => ({
  useMaterialsScreen: () => ({
    data: {
      materials: [{ id: "m1", name: "بن أرابيكا", supplierId: "s1", largeUnitId: "u1", stockSmall: "1200", lastPurchasePrice: "450.00", nextExpiry: null, status: "ACTIVE", version: 4 }],
      summary: { materials: 1, lowStock: 0, expiring: 0, expired: 0, dataQuality: "COMPLETE" },
      filters: { suppliers: [{ id: "s1", name: "مورد النور" }], units: [], statuses: ["ACTIVE", "INACTIVE"] },
      pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useUnitsQuery: () => ({ data: [{ value: "u1", label: "كجم" }, { value: "u2", label: "جرام" }], isLoading: false }),
  useAllUnitsQuery: () => ({
    data: [
      { id: "u1", code: "KG", nameAr: "كيلوجرام", kind: "MASS", physicalFactor: "1", isActive: true, version: 0 },
      { id: "u2", code: "G", nameAr: "جرام", kind: "MASS", physicalFactor: "0.001", isActive: true, version: 0 },
    ],
    isLoading: false, isError: false, refetch: vi.fn(),
  }),
  useMaterialDetailsQuery: () => ({
    data: {
      material: { id: "m1", name: "بن أرابيكا", supplierId: "s1", largeUnitId: "u1", smallUnitId: "u2", conversionFactor: "1000", minStockSmall: "500", expiryAlertDays: 30, status: "ACTIVE", stockSmall: "1200", lastPurchasePrice: "450.00", nextExpiry: null, priorityVersion: 1, version: 4 },
      batches: { items: [{ id: "b1", batchNumber: "B-001", initialQuantitySmall: "2000", remainingQuantitySmall: "1200", remainingInventoryValue: "540.00", receivedOn: "2026-09-01", expiryOn: null, salePriority: 1, version: 2 }] },
      affectedProducts: [{ productId: "p1", productName: "إسبريسو", sizeId: "s1", sizeName: "دبل" }],
    },
    isLoading: false, isError: false, refetch: vi.fn(),
  }),
  useWithdrawalsQuery: () => ({ data: { items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 } }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }),
}));

vi.mock("@/modules/admin/inventory/hooks/inventory.mutations", () => ({
  useUpdateMaterial: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
  useWithdrawMaterial: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
  useReorderPriorities: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useCreateMaterial: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, isSuccess: false, resetAttempt: vi.fn() }),
  useCreateUnit: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
  useUpdateUnit: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
  useUpdateBatchExpiry: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, resetAttempt: vi.fn() }),
}));

vi.mock("@/modules/admin/purchases/api/purchases.api", () => ({
  purchasesApi: {
    screen: async () => ({ groups: [{ id: "g1", groupNo: "PG-000001" }], pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } }),
    details: async () => ({ items: [{ id: "i1", material: { id: "m1", name: "بن أرابيكا" } }] }),
  },
}));

vi.mock("@/modules/admin/suppliers/services/suppliersService", () => ({ getSupplierOptions: () => Promise.resolve({ data: [] }) }));

const adminAuth = {
  permissions: [{ pageKey: "inventory", visible: true, actions: ["read", "create", "update", "manage", "withdraw", "priorities"] }],
};

describe("material edit and delete contract", () => {
  it("cleans affected products in all backend shapes", () => {
    expect(toMaterialDetails({ affectedProducts: [{ productId: "p1", productName: "x" }] }).affectedProducts).toHaveLength(1);
    expect(toMaterialDetails({ affectedProducts: { items: [{ id: "p1", name: "y" }] } }).affectedProducts[0].productName).toBe("y");
    expect(toMaterialDetails({}).affectedProducts).toBeNull();
  });

  it("maps the locked-fields error to a clear Arabic message", () => {
    expect(normalizeApiError({ response: { data: { error: { code: "MATERIAL_UNITS_LOCKED" } } } }).message).toContain("مقفلة");
  });

  it("does not expose the removed retirement or deactivation flows", () => {
    renderApp(<MaterialDetailsPage />, { route: "/admin/inventory/m1", auth: adminAuth });
    expect(screen.queryByText("تقاعد المادة")).not.toBeInTheDocument();
    expect(screen.queryByText("إيقاف")).not.toBeInTheDocument();
  });

  it("does not expose the removed unit-management tab", () => {
    renderApp(<InventoryPage />, { route: "/admin/inventory", auth: adminAuth });
    expect(screen.queryByRole("tab", { name: "الوحدات" })).not.toBeInTheDocument();
  });

  it("exposes material delete and edit actions", () => {
    renderApp(<InventoryPage />, { route: "/admin/inventory", auth: adminAuth });
    expect(screen.getByRole("button", { name: "حذف بن أرابيكا" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تعديل بن أرابيكا" })).toBeInTheDocument();
  });
});
