import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import BusyCardPage from "@/modules/admin/orders/pages/BusyCardPage";
import TableOrderTrackPage from "@/modules/admin/orders/pages/TableOrderTrackPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

vi.mock("@/modules/admin/orders/hooks/order.queries", () => ({
  useOrderDetails: () => ({
    data: {
      order: { id: "o1", orderNumber: "ORD-100", fulfillmentType: "TAKEAWAY", channel: "ADMIN", customer: { name: "أحمد", phone: "0100" }, status: "READY", totals: { total: "180.00" }, balanceDue: "180.00", createdAt: "2026-09-12T10:00:00.000Z", version: 3 },
      items: [{ id: "i1", productName: "إسبريسو", typeName: "ساخن", sizeName: "دبل", quantity: 2, lineSubtotal: "120.00", status: "READY", version: 1 }],
      timeline: [{ sequence: 1, fromStatus: "CONFIRMED", toStatus: "READY", occurredAt: "2026-09-12T10:05:00.000Z" }],
      payment: null,
      delivery: null,
    },
    isLoading: false, isError: false, refetch: vi.fn(),
  }),
}));

const adminAuth = {
  permissions: [
    { pageKey: "orders", visible: true, actions: ["read", "cancel", "complete"] },
    { pageKey: "preparation", visible: true, actions: ["read", "update"] },
    { pageKey: "delivery", visible: true, actions: ["manage"] },
  ],
};

describe("orders v1 migration (phase 16)", () => {
  it("renders BusyCard from the v1 details shape with real actions", () => {
    renderApp(<BusyCardPage />, { route: "/admin/orders/busy/online/o1", auth: adminAuth });
    expect(screen.getAllByText("طلب ORD-100").length).toBeGreaterThan(0);
    expect(screen.getByText("إسبريسو")).toBeInTheDocument();
    expect(screen.getByText("تسليم للعميل")).toBeInTheDocument();
    // The mocked item is READY, so the cancel button must be hidden.
    expect(screen.queryByText("إلغاء الطلب")).not.toBeInTheDocument();
    expect(screen.queryByText("تأكيد الطلب الجديد")).not.toBeInTheDocument();
  });

  it("renders table track from the v1 details shape read-only", () => {
    renderApp(<TableOrderTrackPage />, { route: "/admin/orders/tables/4/order/o1/track", auth: adminAuth });
    expect(screen.getAllByText("طلب ORD-100").length).toBeGreaterThan(0);
    expect(screen.getByText("إسبريسو")).toBeInTheDocument();
    expect(screen.queryByText("إلغاء الطلب")).not.toBeInTheDocument();
  });
});
