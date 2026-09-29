import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { delegate, deliver, cancel, details, print, recordWhatsapp } = vi.hoisted(() => ({
  delegate: vi.fn(),
  deliver: vi.fn(async () => ({})),
  cancel: vi.fn(async () => ({})),
  details: vi.fn(async () => ({ order: { id: "o1", orderNumber: "ORD-500", version: 3 } })),
  print: vi.fn(async () => ({
    order: { orderNumber: "ORD-500" },
    totals: { total: "250.00" },
    customer: { name: "أحمد", phone: "01001234567" },
  })),
  recordWhatsapp: vi.fn(async () => ({})),
}));

vi.mock("@/modules/admin/delegates/api/delivery.api", () => ({
  deliveryApi: { delegate, deliver, cancel, recordWhatsapp },
}));

vi.mock("@/modules/admin/orders/api/orders.api", () => ({
  ordersApi: { print, details, cancel },
}));

const openAssignment = {
  id: "a1",
  assignmentNo: "DA-1",
  orderId: "6ab66d80eb4de470b7bf1468",
  status: "ASSIGNED",
  cashExpected: "250",
  cashSettledTotal: "0",
  reason: null,
  version: 0,
};
const deliveredAssignment = {
  ...openAssignment,
  id: "a2",
  assignmentNo: "DA-2",
  status: "DELIVERED",
  version: 4,
};

vi.mock("@/api/idempotency", () => ({
  beginOperation: (scope) => `key-${scope}`,
  finishOperation: () => {},
}));

const DelegateDetailsPage = (await import("@/modules/admin/delegates/pages/DelegateDetailsPage")).default;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/delegates/d1"]}>
      <Routes>
        <Route path="/admin/delegates/:id" element={<DelegateDetailsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.open = vi.fn(() => ({ location: { href: "" }, close: vi.fn() }));
  delegate.mockResolvedValue({
    delegate: { id: "d1", name: "عمرو", phone: "01000000000", status: "AVAILABLE", activeOrderCount: 1, maxActiveOrders: 5, deliveredCount: 1 },
    activeOrders: [openAssignment],
    history: [deliveredAssignment],
    cashLedger: { expected: "250", settled: "0", outstanding: "250" },
  });
});

describe("delegate details actions", () => {
  it("shows only the three requested actions, no cash ledger and no cash columns", async () => {
    renderPage();
    await screen.findByText("تأكيد التسليم");
    expect(screen.getByRole("button", { name: /إلغاء الطلب/ })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /إرسال الفاتورة للمندوب/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /نقل لمندوب آخر/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /تسوية الكاش/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /تعذر التوصيل/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /عودة للمحل/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /عرض الطلب/ })).toBeNull();
    expect(screen.queryByText(/العهدة المتوقعة/)).toBeNull();
    expect(screen.queryByText(/المسوى/)).toBeNull();
    expect(screen.queryByText("المتوقع")).toBeNull();
  });

  it("confirms the delivery for the assignment", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("تأكيد التسليم"));
    await waitFor(() => expect(deliver).toHaveBeenCalledWith("a1", { expectedVersion: 0 }, "key-delivery:a1:deliver"));
  });

  it("cancels the order with its own version and a reason", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("العميل رفض الاستلام");
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /إلغاء الطلب/ }));
    await waitFor(() =>
      expect(cancel).toHaveBeenCalledWith(
        openAssignment.orderId,
        { reason: "العميل رفض الاستلام", expectedVersion: 3 },
        "key-delivery:a1:cancel"
      )
    );
    expect(details).toHaveBeenCalledWith(openAssignment.orderId);
  });

  it("does nothing when the cancel reason is empty", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("");
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /إلغاء الطلب/ }));
    expect(cancel).not.toHaveBeenCalled();
  });

  it("sends the invoice to the delegate number, not the customer", async () => {
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /إرسال الفاتورة للمندوب/ }))[0]);
    await waitFor(() => expect(globalThis.open).toHaveBeenCalled());
    await waitFor(() => expect(recordWhatsapp).toHaveBeenCalled());
    const href = globalThis.open.mock.results[0].value.location.href;
    expect(href).toContain("https://wa.me/01000000000");
    expect(decodeURIComponent(href)).toContain("ORD-500");
    expect(decodeURIComponent(href)).toContain("250.00");
    expect(decodeURIComponent(href)).toContain("/customer/orders/ORD-500/track");
    // The customer's own number must never receive the invoice.
    expect(href).not.toContain("01001234567");
  });

  it("only offers the invoice for already delivered assignments", async () => {
    renderPage();
    const historyRow = await screen.findByText("DA-2");
    expect(historyRow).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole("button", { name: /إرسال الفاتورة للمندوب/ })).toHaveLength(2));
  });

  it("reports a missing delegate whatsapp number instead of opening a broken link", async () => {
    delegate.mockResolvedValueOnce({
      delegate: { id: "d1", name: "عمرو", phone: "", status: "AVAILABLE", activeOrderCount: 1, maxActiveOrders: 5, deliveredCount: 1 },
      activeOrders: [openAssignment],
      history: [deliveredAssignment],
      cashLedger: {},
    });
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /إرسال الفاتورة للمندوب/ }))[0]);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("رقم واتساب المندوب غير صالح"));
  });
});