import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { createTestQueryClient } from "@/test/renderApp";
import { renderApp } from "@/test/renderApp";
import OnlineScreen from "@/modules/admin/orders/pages/OnlineScreen";
import OrderQueue from "@/modules/admin/orders/components/OrderQueue";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

vi.mock("@/modules/admin/orders/hooks/order.queries", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useOnlineOrders: () => ({
      data: {
        items: [
          {
            id: "o1",
            orderNumber: "ORD-00000042",
            status: "CONFIRMED",
            channel: "CUSTOMER_WEB",
            fulfillmentType: "DELIVERY",
            total: "150",
            progress: { ready: 0, total: 2 },
            assignedDelegate: null,
            version: 0,
            customer: { name: "عميل اختبار", phone: "01001234567", address: "شارع الجمهورية" },
          },
        ],
        meta: { page: 1, limit: 10, total: 1, pages: 1 },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    }),
  };
});

const adminAuth = {
  permissions: [{ pageKey: "orders", visible: true, actions: ["read"] }],
};

describe("admin online order cards for public orders", () => {
  it("shows customer identity, address, and outside badge", () => {
    renderApp(<OnlineScreen />, { route: "/admin/orders/online", auth: adminAuth });
    expect(screen.getByText("ORD-00000042")).toBeInTheDocument();
    expect(screen.getByText("من الخارج")).toBeInTheDocument();
    expect(screen.getByText(/عميل اختبار/)).toBeInTheDocument();
    expect(screen.getByText("01001234567")).toBeInTheDocument();
    expect(screen.getByText("شارع الجمهورية")).toBeInTheDocument();
    expect(screen.getByText("جاري التحضير")).toBeInTheDocument();
  });

  it("navigates takeaway rows to the busy page", () => {
    function LocationProbe() {
      const location = useLocation();
      return <span data-testid="loc">{location.pathname}</span>;
    }
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={["/admin/orders/takeaway"]}>
          <LocationProbe />
          <OrderQueue
            orders={[
              {
                id: "o2",
                orderNumber: "ORD-00000043",
                status: "PREPARING",
                fulfillmentType: "TAKEAWAY",
                totals: { total: "80" },
                progress: { ready: 0, total: 1 },
                createdAt: "2026-09-19T10:00:00.000Z",
                customer: { name: "منى", phone: "01001112222", address: "" },
              },
            ]}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("منى")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /فتح الطلب ORD-00000043/ }));
    expect(screen.getByTestId("loc")).toHaveTextContent("/admin/orders/busy/takeaway/o2");
  });
});
