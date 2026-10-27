import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { details, update } = vi.hoisted(() => ({
  details: vi.fn(),
  update: vi.fn(async () => ({})),
}));

vi.mock("@/modules/admin/customers/api/customers.api", () => ({
  customersApi: { screen: vi.fn(), create: vi.fn(), details, update },
}));

vi.mock("@/modules/admin/orders/api/orders.api", () => ({
  ordersApi: { print: vi.fn() },
}));

vi.mock("@/api/idempotency", () => ({
  beginOperation: (scope) => `key-${scope}`,
  finishOperation: () => {},
}));

const CustomerDetailsPage = (await import("@/modules/admin/customers/pages/CustomerDetailsPage")).default;

const payload = {
  customer: {
    id: "c1",
    name: "أحمد",
    phone: "01000000001",
    address: "القاهرة",
    status: "ACTIVE",
    orderCount: 1,
    completedOrderCount: 1,
    lifetimeValue: "100",
    version: 5,
  },
  orders: [],
  reviews: [],
  marketing: { total: 0, items: [] },
};

function renderPage(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/admin/customers/c1", state }]}>
      <Routes>
        <Route path="/admin/customers/:id" element={<CustomerDetailsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  details.mockResolvedValue(structuredClone(payload));
});

describe("customer details manage", () => {
  it("opens edit mode from navigation state and saves without the phone", async () => {
    renderPage({ edit: true });
    const nameInput = await screen.findByLabelText("الاسم");
    await waitFor(() => expect(nameInput).toHaveValue("أحمد"));
    fireEvent.change(nameInput, { target: { value: "أحمد عادل" } });
    fireEvent.click(screen.getByRole("button", { name: /حفظ التعديلات/ }));
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    const [id, body] = update.mock.calls[0];
    expect(id).toBe("c1");
    expect(body).toEqual({ name: "أحمد عادل", address: "القاهرة", expectedVersion: 5 });
    expect(body).not.toHaveProperty("phone");
  });

  it("archives from the details page and shows the Arabic status", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("أحمد")).toBeInTheDocument());
    expect(screen.getByText("نشط")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "أرشفة" }));
    expect(await screen.findByText("أرشفة العميل")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith("c1", { status: "ARCHIVED", expectedVersion: 5 }, expect.anything());
  });
});
