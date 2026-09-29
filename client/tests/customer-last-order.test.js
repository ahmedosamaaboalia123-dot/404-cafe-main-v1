import { describe, expect, it, beforeEach } from "vitest";
import {
  getCustomerProfile,
  setLastOrder,
  updateLastOrder,
} from "@/modules/customer/checkout/services/checkoutCustomerService";

beforeEach(() => {
  localStorage.clear();
});

describe("customer last order storage", () => {
  it("writes and reads the last confirmed order", () => {
    setLastOrder({
      orderNumber: "ORD-00000042",
      trackingToken: "track-1",
      phone: "01001234567",
      fulfillmentType: "DELIVERY",
      total: 150,
      createdAt: "2026-09-19T10:00:00.000Z",
      status: "CONFIRMED",
      version: 0,
      id: "abc",
    });
    const profile = getCustomerProfile();
    expect(profile.lastOrder).toMatchObject({
      orderNumber: "ORD-00000042",
      trackingToken: "track-1",
      status: "CONFIRMED",
      version: 0,
    });
  });

  it("patches status and version from tracking refreshes", () => {
    setLastOrder({ orderNumber: "ORD-1", status: "CONFIRMED", version: 0 });
    updateLastOrder({ status: "READY", version: 2 });
    const profile = getCustomerProfile();
    expect(profile.lastOrder).toMatchObject({ orderNumber: "ORD-1", status: "READY", version: 2 });
  });
});
