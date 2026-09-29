import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PURCHASE_ENDPOINTS } from "@/modules/admin/purchases/api/purchases.api";
import { RETURN_ENDPOINTS } from "@/modules/admin/returns/api/returns.api";
import {
  PURCHASE_TABS,
  toPurchaseGroupDetails,
  toPurchasePrintData,
  toPurchasesScreen,
} from "@/modules/admin/purchases/adapters/purchase.adapter";
import {
  createGroupSchema,
  deleteGroupSchema,
  firstPurchaseFormError,
  registerItemSchema,
  registerManySchema,
  splitGroupSchema,
  updateGroupSchema,
} from "@/modules/admin/purchases/schemas/purchase.schema";
import {
  toReturnDetails,
  toReturnsScreen,
} from "@/modules/admin/returns/adapters/return.adapter";
import {
  createReturnSchema,
  firstReturnFormError,
} from "@/modules/admin/returns/schemas/return.schema";
import { renderApp } from "@/test/renderApp";
import PurchasesPage from "@/modules/admin/purchases/pages/PurchasesPage";
import ReturnsPage from "@/modules/admin/returns/pages/ReturnsPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));
vi.mock("@/modules/admin/inventory/hooks/inventory.queries", () => ({
  useMaterialsScreen: () => ({
    data: { materials: [{ id: "507f1f77bcf86cd799439011", name: "بن أرابيكا", largeUnitId: "u1", lastPurchasePrice: "450.00" }], pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useMaterialDetailsQuery: () => ({
    data: {
      material: { id: "507f1f77bcf86cd799439011", name: "بن أرابيكا" },
      batches: { items: [{ id: "507f1f77bcf86cd799439021", batchNumber: "B-001", remainingQuantitySmall: "5000", remainingInventoryValue: "2250.00", expiryOn: "2026-12-01", version: 2 }] },
    },
    isLoading: false, isError: false, refetch: vi.fn(),
  }),
}));

vi.mock("@/modules/admin/purchases/hooks/purchase.queries", () => ({
  usePurchasesScreen: () => ({
    data: {
      groups: [
        { id: "g1", groupNo: "PG-000001", invoiceDate: "2026-09-10", status: "DRAFT", statusLabel: "مسودة", currency: "EGP", itemCount: 2, registeredCount: 0, subtotal: "1450.00", splitVersion: 0, splitOutdated: false, version: 1 },
        { id: "g2", groupNo: "PG-000002", invoiceDate: "2026-09-09", status: "REGISTERED", statusLabel: "مسجلة", currency: "EGP", itemCount: 1, registeredCount: 1, subtotal: "900.00", splitVersion: 1, splitOutdated: false, version: 3 },
      ],
      summary: { draft: 1, split: 0, partiallyRegistered: 0, registered: 1 },
      filters: { tabs: ["unregistered", "registered", "all"] },
      pageMeta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  usePurchaseGroupDetails: () => ({
    data: {
      group: { id: "g1", groupNo: "PG-000001", invoiceDate: "2026-09-10", status: "DRAFT", statusLabel: "مسودة", currency: "EGP", itemCount: 1, registeredCount: 0, subtotal: "1000.00", splitVersion: 0, splitOutdated: false, version: 1 },
      items: [{ id: "i1", groupId: "g1", supplierInvoiceId: null, material: { id: "m1", name: "بن أرابيكا" }, supplier: { id: "s1", name: "مورد النور" }, unit: { id: "u1", name: "كيلوجرام" }, lastBatchPrice: "450.00", quantityLarge: "2", quantitySmall: "2000", largeUnitPrice: "500.00", lineTotal: "1000.00", status: "PENDING", statusLabel: "بانتظار التسجيل", batchId: null, movementId: null, receivedOn: null, expiryOn: null, version: 0 }],
      supplierInvoices: [],
      totals: { subtotal: "1000.00", currency: "EGP" },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  usePurchasePrintData: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
}));

vi.mock("@/modules/admin/returns/hooks/return.queries", () => ({
  useReturnsScreen: () => ({
    data: {
      returns: [{ id: "r1", returnNo: "PR-000001", status: "COMPLETED", returnDate: "2026-09-11", currency: "EGP", itemCount: 1, totalInventoryValue: "450.00", notes: "", createdAt: "2026-09-11", createdBy: null }],
      summary: { count: 1, totalInventoryValue: "450.00" },
      filters: { supplierId: null },
      pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useReturnDetails: () => ({
    data: {
      return: { id: "r1", returnNo: "PR-000001", status: "COMPLETED", returnDate: "2026-09-11", currency: "EGP", itemCount: 1, totalInventoryValue: "450.00", notes: "", createdAt: "2026-09-11", createdBy: null },
      items: [{ id: "ri1", returnId: "r1", material: { id: "m1", name: "بن أرابيكا" }, batch: { id: "b1", batchNumber: "B-001" }, supplier: { id: "s1", name: "مورد النور" }, quantityLarge: "1", quantitySmall: "1000", unitCost: "450.00", totalValue: "450.00", reason: "تالف", movementId: "mv1" }],
      totals: { itemCount: 1, totalInventoryValue: "450.00", currency: "EGP" },
      actors: { createdBy: null, returnedBy: null },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useReturnPrintData: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
}));

const adminAuth = {
  permissions: [
    { pageKey: "purchases", visible: true, actions: ["read", "create", "manage", "register"] },
    { pageKey: "purchase-returns", visible: true, actions: ["read", "create"] },
  ],
};

const materialId = "507f1f77bcf86cd799439011";
const batchId = "507f1f77bcf86cd799439021";
const itemId = "507f1f77bcf86cd799439031";

describe("purchases + returns v1 contract", () => {
  it("targets the real backend routes, not legacy paths", () => {
    expect(PURCHASE_ENDPOINTS.screen).toBe("/purchases-screen");
    expect(PURCHASE_ENDPOINTS.details("abc")).toBe("/purchase-groups/abc");
    expect(PURCHASE_ENDPOINTS.split("abc")).toBe("/purchase-groups/abc/split-by-supplier");
    expect(PURCHASE_ENDPOINTS.registerMany("abc")).toBe("/purchase-groups/abc/register-many");
    expect(PURCHASE_ENDPOINTS.registerItem("abc")).toBe("/purchase-items/abc/register");
    expect(PURCHASE_ENDPOINTS.groupPrint("abc")).toBe("/purchase-groups/abc/print-data");
    expect(PURCHASE_ENDPOINTS.invoicePrint("abc")).toBe("/supplier-purchase-invoices/abc/print-data");
    expect(RETURN_ENDPOINTS.screen).toBe("/purchase-returns-screen");
    expect(RETURN_ENDPOINTS.create).toBe("/purchase-returns");
    expect(RETURN_ENDPOINTS.details("abc")).toBe("/purchase-returns/abc");
    expect(RETURN_ENDPOINTS.print("abc")).toBe("/purchase-returns/abc/print-data");
  });

  it("cleans groups, items, and invoices with string money", () => {
    expect(PURCHASE_TABS.map((tab) => tab.value)).toEqual(["unregistered", "registered", "all"]);
    const screen = toPurchasesScreen({
      groups: [{ id: "g1", groupNo: "PG-1", status: "DRAFT", subtotal: 1000, itemCount: 2, registeredCount: 0, version: 1 }],
      summary: { draft: 1 },
    });
    expect(screen.groups[0].statusLabel).toBe("مسودة");
    expect(screen.groups[0].subtotal).toBe("1000");
    expect(screen.groups[0].version).toBe(1);
    expect(screen.summary.registered).toBe(0);
    const details = toPurchaseGroupDetails({
      group: { id: "g1", status: "PARTIALLY_REGISTERED", subtotal: 500 },
      items: [{ id: "i1", status: "PENDING", quantityLarge: 2, lineTotal: 500, material: { id: "m1", name: "بن" } }],
      supplierInvoices: [{ id: "v1", invoiceNo: "INV-1", subtotal: 500 }],
      totals: { subtotal: 500, currency: "EGP" },
    });
    expect(details.items[0].statusLabel).toBe("بانتظار التسجيل");
    expect(details.items[0].material.id).toBe("m1");
    expect(details.supplierInvoices[0].invoiceNo).toBe("INV-1");
    expect(details.totals.subtotal).toBe("500");
    const print = toPurchasePrintData({ documentType: "PURCHASE_GROUP", number: "PG-1", status: "REGISTERED", totals: { subtotal: 500 } });
    expect(print.statusLabel).toBe("مسجلة");
  });

  it("validates purchase bodies exactly like the backend", () => {
    const lines = [{ materialId, quantityLarge: "2", largeUnitPrice: "500.00" }];
    expect(createGroupSchema.safeParse({ items: lines, invoiceDate: "2026-09-12" }).success).toBe(true);
    expect(createGroupSchema.safeParse({ items: lines }).success).toBe(true);
    expect(createGroupSchema.safeParse({ items: [] }).success).toBe(false);
    expect(createGroupSchema.safeParse({ items: [lines[0], lines[0]] }).success).toBe(false);
    expect(createGroupSchema.safeParse({ items: [{ materialId: "m1", quantityLarge: "0", largeUnitPrice: "5" }] }).success).toBe(false);
    expect(updateGroupSchema.safeParse({ items: lines, expectedVersion: 1 }).success).toBe(true);
    expect(updateGroupSchema.safeParse({ items: lines }).success).toBe(false);
    expect(deleteGroupSchema.safeParse({ expectedVersion: 0 }).success).toBe(true);
    expect(deleteGroupSchema.safeParse({}).success).toBe(false);
    expect(splitGroupSchema.safeParse({ expectedVersion: 2 }).success).toBe(true);
    expect(registerItemSchema.safeParse({ receivedOn: "2026-09-12", expiryOn: null, expectedVersion: 0 }).success).toBe(false);
    expect(registerItemSchema.safeParse({ receivedOn: "2026-09-12", expiryOn: "2026-12-31", expectedVersion: 0 }).success).toBe(true);
    expect(registerItemSchema.safeParse({ receivedOn: "x", expectedVersion: 0 }).success).toBe(false);
    expect(registerManySchema.safeParse({ expectedVersion: 1, items: [{ purchaseItemId: itemId, receivedOn: "2026-09-12", expiryOn: "2026-12-31", expectedItemVersion: 0 }] }).success).toBe(true);
    expect(registerManySchema.safeParse({ expectedVersion: 1, items: [{ purchaseItemId: itemId, receivedOn: "2026-09-12", expectedItemVersion: 0 }, { purchaseItemId: itemId, receivedOn: "2026-09-12", expectedItemVersion: 0 }] }).success).toBe(false);
    expect(firstPurchaseFormError(registerItemSchema.safeParse({ receivedOn: "", expectedVersion: 0 }))).toBeTruthy();
  });

  it("cleans returns and validates return bodies exactly like the backend", () => {
    const screen = toReturnsScreen({
      returns: [{ id: "r1", returnNo: "PR-1", totalInventoryValue: 450, itemCount: 1 }],
      summary: { count: 1, totalInventoryValue: 450 },
    });
    expect(screen.returns[0].totalInventoryValue).toBe("450");
    expect(screen.summary.count).toBe(1);
    const details = toReturnDetails({
      return: { id: "r1", returnNo: "PR-1" },
      items: [{ id: "ri1", batchId: "b1", quantityLarge: 1, totalValue: 450, material: { name: "بن" } }],
      totals: { itemCount: 1, totalInventoryValue: 450, currency: "EGP" },
    });
    expect(details.items[0].totalValue).toBe("450");
    expect(details.totals.currency).toBe("EGP");
    expect(createReturnSchema.safeParse({ returnDate: "2026-09-12", notes: "تالف", items: [{ batchId, quantityLarge: "1", reason: "تالف تمامًا", expectedBatchVersion: 2 }] }).success).toBe(true);
    expect(createReturnSchema.safeParse({ returnDate: "2026-09-12", items: [] }).success).toBe(false);
    expect(createReturnSchema.safeParse({ returnDate: "2026-09-12", items: [{ batchId, quantityLarge: "1", reason: "ab", expectedBatchVersion: 0 }] }).success).toBe(false);
    expect(createReturnSchema.safeParse({ returnDate: "2026-09-12", items: [{ batchId, quantityLarge: "1", reason: "تالف", expectedBatchVersion: 0 }, { batchId, quantityLarge: "1", reason: "تالف", expectedBatchVersion: 0 }] }).success).toBe(false);
    expect(firstReturnFormError(createReturnSchema.safeParse({ returnDate: "x", items: [] }))).toBeTruthy();
  });
});

describe("purchases page on the v1 layer", () => {
  it("renders server groups with tabs and create form, no legacy invoice UI", () => {
    renderApp(<PurchasesPage />, { route: "/admin/purchases", auth: adminAuth });
    fireEvent.click(screen.getByRole("tab", { name: "مجموعات الشراء" }));
    expect(screen.getByText("PG-000001")).toBeInTheDocument();
    expect(screen.getByText("PG-000002")).toBeInTheDocument();
    expect(screen.queryByText("حذف المجموعة")).not.toBeInTheDocument();
  });
});

describe("returns page on the v1 layer", () => {
  it("renders server returns log with create form, no legacy service UI", () => {
    renderApp(<ReturnsPage />, { route: "/admin/returns", auth: adminAuth });
    expect(screen.getByText("PR-000001")).toBeInTheDocument();
    expect(screen.getByText("بن أرابيكا")).toBeInTheDocument();
    expect(screen.queryByText("اعتماد مرتجع المواد الخام")).not.toBeInTheDocument();
  });
});
