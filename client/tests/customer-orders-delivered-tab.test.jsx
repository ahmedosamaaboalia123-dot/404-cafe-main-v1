import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderApp } from "@/test/renderApp";
import CustomerOrdersPage from "@/modules/customer/orders/pages/CustomerOrdersPage";

vi.mock("@/modules/customer/orders/hooks/useCustomerOrders", () => ({
  useCustomerOrders: () => [
    {
      id: "o1",
      orderNumber: "ORD-00000001",
      status: "completed",
      orderTypeText: "تيك أواي",
      items: [{ name: "لاتيه", quantity: 1 }],
      pricing: { total: 80 },
    },
    {
      id: "o2",
      orderNumber: "ORD-00000002",
      status: "delivered",
      orderTypeText: "توصيل للمنزل",
      items: [{ name: "كابتشينو", quantity: 2 }],
      pricing: { total: 150 },
    },
    {
      id: "o3",
      orderNumber: "ORD-00000003",
      status: "in_progress",
      orderTypeText: "تيك أواي",
      items: [{ name: "إسبريسو", quantity: 1 }],
      pricing: { total: 40 },
    },
  ],
}));

describe("customer orders delivered tab", () => {
  it("shows completed/delivered orders under «الطلبات اللي تم تسليمها على هذا الرقم»", () => {
    renderApp(<CustomerOrdersPage />, { route: "/customer/orders" });
    expect(screen.getByText("ORD-00000003")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /الطلبات اللي تم تسليمها على هذا الرقم/ }));
    expect(screen.getByText("ORD-00000001")).toBeInTheDocument();
    expect(screen.getByText("ORD-00000002")).toBeInTheDocument();
    expect(screen.queryByText("ORD-00000003")).not.toBeInTheDocument();
  });
});