import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useCreatePublicOrder } from "@/modules/customer/checkout/hooks/useCreatePublicOrder";
import { customerOrdersApi } from "@/modules/customer/api/customerOrders.api";

vi.mock("@/modules/customer/api/customerOrders.api", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    customerOrdersApi: {
      ...original.customerOrdersApi,
      checkout: vi.fn(async () => ({
        order: {
          id: "oid1",
          publicOrderNumber: "ORD-00000042",
          status: "CONFIRMED",
          fulfillmentType: "TAKEAWAY",
          version: 0,
          totals: { total: "120" },
          items: [],
        },
        customer: { id: "cid1" },
        tracking: {
          barcodeValue: "bar1",
          trackingReadToken: "track-1",
          orderActionToken: "action-1",
        },
      })),
    },
  };
});

function wrapper({ children }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("public order confirmation persistence", () => {
  it("stores order access, backend order, and last order on success", async () => {
    const { result } = renderHook(() => useCreatePublicOrder(), { wrapper });
    const order = await result.current.mutateAsync({
      fulfillmentType: "TAKEAWAY",
      customer: { name: "عميل اختبار", phone: "01001234567" },
      items: [{ productId: "507f1f77bcf86cd799439011", productSizeId: "507f1f77bcf86cd799439012", quantity: 2 }],
    });
    expect(order.orderNumber).toBe("ORD-00000042");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("404:customer:order-access") || "{}")).toMatchObject({
        "ORD-00000042": { trackingReadToken: "track-1", orderActionToken: "action-1" },
      });
    });
    const backendOrders = JSON.parse(localStorage.getItem("404_customer_orders_v2") || "[]");
    expect(backendOrders.some((o) => o.orderNumber === "ORD-00000042" && o.backend)).toBe(true);
    const profile = JSON.parse(localStorage.getItem("404_customer_profile_v1") || "{}");
    expect(profile.lastOrder).toMatchObject({ orderNumber: "ORD-00000042", status: "CONFIRMED" });
    expect(customerOrdersApi.checkout).toHaveBeenCalledTimes(1);
  });
});
