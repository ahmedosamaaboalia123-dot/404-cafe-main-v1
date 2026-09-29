import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import GroupDetails from "@/modules/admin/purchases/components/GroupDetails";

const calls = vi.hoisted(() => ({ one: vi.fn().mockResolvedValue({}), many: vi.fn().mockResolvedValue({}) }));
const ids = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"];
vi.mock("@/modules/admin/purchases/hooks/purchase.queries", () => ({
  usePurchaseGroupDetails: () => ({ data: {
    group: { id: "g1", status: "SPLIT", version: 3, itemCount: 2, registeredCount: 0, subtotal: "20" },
    items: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"].map((id, i) => ({ id, status: "PENDING", version: i, material: { name: `مادة ${i + 1}` }, quantityLarge: "1", largeUnitPrice: "10", lineTotal: "10" })),
    supplierInvoices: [],
  }, refetch: vi.fn(), isLoading: false }),
}));
vi.mock("@/modules/admin/purchases/hooks/purchase.mutations", () => {
  const idle = () => ({ isPending: false, resetAttempt: vi.fn() });
  return { useRegisterPurchaseItem: () => ({ ...idle(), mutateAsync: calls.one }), useRegisterManyPurchaseItems: () => ({ ...idle(), mutateAsync: calls.many }), useDeletePurchaseGroup: idle, useSplitPurchaseGroup: idle, useUpdatePurchaseGroup: idle };
});

it("keeps expiry when receipt date changes and sends distinct dates in bulk", async () => {
  renderApp(<GroupDetails groupId="g1" />, { auth: { permissions: [{ pageKey: "purchases", visible: true, actions: ["read", "register"] }] } });
  fireEvent.click(screen.getAllByRole("button", { name: "تسجيل" })[0]);
  expect(calls.one).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("صلاحية");
  fireEvent.change(screen.getByLabelText("تاريخ الصلاحية للبند مادة 1"), { target: { value: "2027-01-01" } });
  fireEvent.change(screen.getByLabelText("تاريخ الاستلام للبند مادة 1"), { target: { value: "2026-09-28" } });
  fireEvent.click(screen.getAllByRole("button", { name: "تسجيل" })[0]);
  await waitFor(() => expect(calls.one).toHaveBeenCalledWith({ purchaseItemId: ids[0], receivedOn: "2026-09-28", expiryOn: "2027-01-01", expectedVersion: 0 }));
  fireEvent.change(screen.getByLabelText("تاريخ الصلاحية للبند مادة 2"), { target: { value: "2027-02-15" } });
  fireEvent.click(screen.getByRole("button", { name: "تسجيل كل البنود المعلقة" }));
  await waitFor(() => expect(calls.many).toHaveBeenCalledWith(expect.objectContaining({
    items: [expect.objectContaining({ purchaseItemId: ids[0], expiryOn: "2027-01-01" }), expect.objectContaining({ purchaseItemId: ids[1], expiryOn: "2027-02-15" })],
  })));
});
