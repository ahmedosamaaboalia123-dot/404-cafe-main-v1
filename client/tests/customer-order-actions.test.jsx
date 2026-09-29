import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerOrderActions from "@/modules/customer/orders/components/CustomerOrderActions";
import { customerOrdersApi } from "@/modules/customer/api/customerOrders.api";

vi.mock("@/modules/customer/api/customerOrders.api", () => ({
  customerOrdersApi: {
    receive: vi.fn(async () => ({})),
    review: vi.fn(async () => ({})),
    cancel: vi.fn(async () => ({})),
  },
}));

const access = {
  orderNumber: "ORD-1",
  trackingReadToken: "read-token",
  orderActionToken: "action-token",
};

function renderActions(order, onChanged = vi.fn()) {
  localStorage.setItem("404:customer:order-access", JSON.stringify({ "ORD-1": access }));
  render(
    <MemoryRouter>
      <CustomerOrderActions order={{ orderNumber: "ORD-1", version: 7, ...order }} onChanged={onChanged} />
    </MemoryRouter>
  );
  return onChanged;
}

beforeEach(() => vi.clearAllMocks());

describe("customer order action buttons", () => {
  it("shows receipt only after delegate handover and sends the real order version", async () => {
    renderActions({ status: "OUT_FOR_DELIVERY", customerReceiptStatus: "AVAILABLE" });
    fireEvent.click(screen.getByRole("button", { name: "استلام" }));
    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    await waitFor(() =>
      expect(customerOrdersApi.receive).toHaveBeenCalledWith(
        "ORD-1",
        { expectedVersion: 7 },
        "action-token",
        expect.any(String)
      )
    );
  });

  it("hides receipt before handover", () => {
    renderActions({ status: "READY", customerReceiptStatus: "LOCKED" });
    expect(screen.queryByRole("button", { name: "استلام" })).not.toBeInTheDocument();
  });

  it("submits one review and replaces the form with a success state", async () => {
    renderActions({ status: "COMPLETED", reviewStatus: "NONE" });
    fireEvent.change(screen.getByPlaceholderText("اكتب تقييمك"), { target: { value: "خدمة ممتازة" } });
    fireEvent.click(screen.getByRole("button", { name: "إرسال التقييم" }));
    await waitFor(() => expect(customerOrdersApi.review).toHaveBeenCalledTimes(1));
    expect(customerOrdersApi.review).toHaveBeenCalledWith(
      "ORD-1",
      { rating: 5, comment: "خدمة ممتازة", expectedOrderVersion: 7 },
      "action-token",
      expect.any(String)
    );
    expect(await screen.findByText("تم إرسال تقييمك لهذا الطلب")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إرسال التقييم" })).not.toBeInTheDocument();
  });

  it("does not show another review form for an already reviewed order", () => {
    renderActions({ status: "COMPLETED", reviewStatus: "SUBMITTED" });
    expect(screen.queryByRole("button", { name: "إرسال التقييم" })).not.toBeInTheDocument();
    expect(screen.getByText("تم إرسال تقييمك لهذا الطلب")).toBeInTheDocument();
  });
});
