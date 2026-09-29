import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SUPPLIER_ENDPOINTS } from "@/modules/admin/suppliers/api/suppliers.api";
import {
  toSupplierDetails,
  toSupplierEntries,
  toSuppliersScreen,
} from "@/modules/admin/suppliers/adapters/supplier.adapter";
import {
  firstSupplierFormError,
  supplierEntrySchema,
} from "@/modules/admin/suppliers/schemas/supplier.schema";
import { renderApp } from "@/test/renderApp";
import SupplierDetailsPage from "@/modules/admin/suppliers/pages/SupplierDetailsPage";

vi.mock("@/modules/admin/suppliers/hooks/supplier.queries", () => ({
  useSupplierDetailsQuery: () => ({
    data: {
      supplier: { id: "s1", name: "مورد الاختبار", contactPerson: "أحمد", phone: "0100", city: "القاهرة", version: 3 },
      account: { supplierId: "s1", debtBalance: "1500.00", receivableBalance: "200.00", version: 7 },
      recentEntries: [],
      materials: [{ id: "m1", name: "بن أرابيكا" }],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSupplierEntriesQuery: () => ({
    data: {
      items: [
        { id: "e1", supplierId: "s1", kind: "DEBT", amount: "1500.00", debtBalanceAfter: "1500.00", receivableBalanceAfter: "0.00", sequenceNo: 1, occurredOn: "2026-09-10" },
      ],
      account: { supplierId: "s1", debtBalance: "1400.00", receivableBalance: "0.00", version: 8 },
      pageMeta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

const adminAuth = {
  permissions: [
    { pageKey: "suppliers", visible: true, actions: ["read", "update"] },
    { pageKey: "suppliers.account", visible: true, actions: ["write"] },
  ],
};

describe("suppliers v1 contract", () => {
  it("targets the real backend routes, not legacy paths", () => {
    expect(SUPPLIER_ENDPOINTS.screen).toBe("/suppliers-screen");
    expect(SUPPLIER_ENDPOINTS.details("abc")).toBe("/suppliers/abc");
    expect(SUPPLIER_ENDPOINTS.entries("abc")).toBe("/suppliers/abc/account-entries");
    expect(SUPPLIER_ENDPOINTS.reverseEntry).toBeUndefined();
  });

  it("keeps money as strings without reversal flags", () => {
    const screen = toSuppliersScreen({
      suppliers: [{ id: "s1", debtBalance: 1500, receivableBalance: 0, version: 2 }],
      summary: { totalSuppliers: 1, totalDebt: 1500, totalReceivable: 0 },
      pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    });
    expect(screen.suppliers[0].debtBalance).toBe("1500");
    expect(screen.suppliers[0].version).toBe(2);
    const entries = toSupplierEntries({
      items: [{ id: "e1", kind: "DEBT", amount: 100 }],
      account: { debtBalance: 1400, receivableBalance: 0, version: 8 },
      pageMeta: {},
    });
    expect(entries.items[0].isReversal).toBeUndefined();
    expect(entries.items[0].reversed).toBeUndefined();
    expect(entries.account.version).toBe(8);
  });

  it("validates entry bodies exactly like the backend", () => {
    const good = supplierEntrySchema.safeParse({
      kind: "DEBT_PAYMENT", amount: "250.50", occurredOn: "2026-09-12", expectedAccountVersion: 7,
    });
    expect(good.success).toBe(true);
    expect(supplierEntrySchema.safeParse({ kind: "CARD", amount: "10", occurredOn: "2026-09-12", expectedAccountVersion: 0 }).success).toBe(false);
    expect(supplierEntrySchema.safeParse({ kind: "DEBT", amount: "0", occurredOn: "2026-09-12", expectedAccountVersion: 0 }).success).toBe(false);
    expect(firstSupplierFormError(supplierEntrySchema.safeParse({ kind: "DEBT", amount: "-5", occurredOn: "x", expectedAccountVersion: 0 }))).toBeTruthy();
  });

  it("maps details with server balances, materials, and versions", () => {
    const details = toSupplierDetails({
      supplier: { id: "s1", name: "م", version: 3 },
      account: { supplierId: "s1", debtBalance: "1500.00", receivableBalance: "200.00", version: 7 },
      recentEntries: { items: [] },
      materials: { items: [{ id: "m1", name: "بن" }], pageMeta: {} },
    });
    expect(details.account.debtBalance).toBe("1500.00");
    expect(details.materials).toHaveLength(1);
    expect(details.materials[0].id).toBe("m1");
  });
});

describe("supplier details page on the v1 layer", () => {
  it("renders server balances and the entries ledger with edit and delete actions", async () => {
    renderApp(<SupplierDetailsPage />, { route: "/admin/suppliers/s1", auth: adminAuth });
    expect(screen.getByText("المورد: مورد الاختبار")).toBeInTheDocument();
    expect(screen.getAllByText((text) => text.includes("ج.م")).length).toBeGreaterThan(0);
    expect(await screen.findByText("دين")).toBeInTheDocument();
    expect(screen.queryByText("عكس قيد")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "الوحدة" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "الكمية المتاحة" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تعديل القيد" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حذف" })).toBeInTheDocument();
    expect(screen.getByText("بن أرابيكا")).toBeInTheDocument();
  });
});
