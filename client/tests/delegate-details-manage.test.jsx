import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { delegate, updateDelegate } = vi.hoisted(() => ({
  delegate: vi.fn(),
  updateDelegate: vi.fn(async () => ({})),
}));

vi.mock("@/modules/admin/delegates/api/delivery.api", () => ({
  deliveryApi: { delegate, updateDelegate },
}));

vi.mock("@/modules/admin/orders/api/orders.api", () => ({
  ordersApi: { print: vi.fn(), details: vi.fn(), cancel: vi.fn() },
}));

vi.mock("@/api/idempotency", () => ({
  beginOperation: (scope) => `key-${scope}`,
  finishOperation: () => {},
}));

const DelegateDetailsPage = (await import("@/modules/admin/delegates/pages/DelegateDetailsPage")).default;

const payload = {
  delegate: {
    id: "d1",
    name: "كريم",
    phone: "01000000001",
    status: "ACTIVE",
    activeOrderCount: 0,
    maxActiveOrders: 5,
    deliveredCount: 3,
    version: 3,
  },
  activeOrders: [],
  history: [],
};

function renderPage(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/admin/delegates/d1", state }]}>
      <Routes>
        <Route path="/admin/delegates/:id" element={<DelegateDetailsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  delegate.mockResolvedValue(structuredClone(payload));
});

describe("delegate details manage", () => {
  it("opens edit mode from navigation state and saves without the phone", async () => {
    renderPage({ edit: true });
    const nameInput = await screen.findByLabelText("اسم المندوب");
    await waitFor(() => expect(nameInput).toHaveValue("كريم"));
    expect(screen.getByLabelText("رقم الهاتف وواتساب")).toBeDisabled();
    fireEvent.change(nameInput, { target: { value: "كريم عادل" } });
    fireEvent.click(screen.getByRole("button", { name: /حفظ التعديلات/ }));
    await waitFor(() => expect(updateDelegate).toHaveBeenCalledOnce());
    expect(updateDelegate).toHaveBeenCalledWith(
      "d1",
      { name: "كريم عادل", maxActiveOrders: 5, expectedVersion: 3 },
      expect.anything()
    );
  });

  it("deactivates with a reason from the details page", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "إيقاف" }));
    expect(await screen.findByText("إيقاف المندوب")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("مثال: انتهاء التعاون"), { target: { value: "انتهاء التعاون" } });
    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    await waitFor(() => expect(updateDelegate).toHaveBeenCalledOnce());
    expect(updateDelegate).toHaveBeenCalledWith(
      "d1",
      { status: "INACTIVE", reason: "انتهاء التعاون", expectedVersion: 3 },
      expect.anything()
    );
  });

  it("shows the Arabic status", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("كريم")).toBeInTheDocument());
    expect(screen.getByText("نشط")).toBeInTheDocument();
  });
});
