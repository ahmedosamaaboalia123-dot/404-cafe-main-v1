import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TableServiceRequestsList from "@/modules/admin/orders/components/TableServiceRequestsList";

const orderService = (overrides = {}) => ({
  id: "sr-1",
  serviceRequestNumber: "SR-00000001",
  tableNumber: 5,
  type: "CALL_WAITER",
  purpose: "ORDER_REVIEW",
  priority: "NORMAL",
  status: "OPEN",
  version: 3,
  order: {
    proposalNumber: "PO-00000042",
    orderNumber: null,
    lineCount: 2,
    quantityCount: 5,
    subtotal: "175",
    items: [
      { productName: "لاتيه", sizeName: "كبير", quantity: 2, lineSubtotal: "100", notes: "بدون سكر" },
      { productName: "كيكة", sizeName: null, quantity: 3, lineSubtotal: "75", notes: "" },
    ],
  },
  ...overrides,
});

const renderList = (services, props = {}) =>
  render(
    <TableServiceRequestsList
      title="الطلبات المفتوحة"
      services={services}
      pendingId={null}
      onStatusChange={vi.fn()}
      {...props}
    />,
  );

describe("admin table services order details", () => {
  it("renders the frozen order items, quantities and total for an order review", () => {
    renderList([orderService()]);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("2×")).toBeTruthy();
    expect(items[0].textContent).toContain("لاتيه");
    expect(items[0].textContent).toContain("كبير");
    expect(items[0].textContent).toContain("بدون سكر");
    expect(items[1].textContent).toContain("كيكة");
    expect(items[1].textContent).not.toContain("—");
    expect(screen.getByText(/PO-00000042/)).toBeTruthy();
    expect(screen.getByText("5 قطعة")).toBeTruthy();
    // ar-EG formatting renders Arabic-Indic digits, so assert the currency.
    const totals = screen.getAllByText(/ج\.م/);
    expect(totals).toHaveLength(3);
    expect(document.body.textContent).toMatch(/١٧٥/);
  });

  it("keeps the plain waiter call without an order block", () => {
    renderList([orderService({ purpose: "GENERAL", order: null })]);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText("مناداة جرسون")).toBeTruthy();
  });

  it("still resolves the request with its version", () => {
    const onStatusChange = vi.fn();
    renderList([orderService()], { onStatusChange });
    fireEvent.click(screen.getByRole("button", { name: /تم التعامل/ }));
    expect(onStatusChange).toHaveBeenCalledWith("sr-1", 3, "تم التعامل مع الطلب");
  });
});
