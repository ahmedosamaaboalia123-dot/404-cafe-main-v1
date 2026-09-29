import { describe, expect, it } from "vitest";
import { normalizeTrackedOrder } from "@/modules/customer/orders/services/customerOrdersService";

describe("normalizeTrackedOrder (public-orders payload)", () => {
  it("maps tracking payload into the client shape (customer, items, pricing)", () => {
    const remote = {
      orderNumber: "ORD-00000123",
      publicOrderNumber: "ORD-00000123",
      status: "CONFIRMED",
      fulfillmentType: "DELIVERY",
      createdAt: "2026-09-20T11:30:00.000Z",
      paymentStatus: "PENDING",
      customer: { name: "سارة", phone: "01001112222", address: "شارع النيل" },
      totals: { subtotal: "120", discount: "0", tax: "16.8", deliveryFee: "15", total: "151.8" },
      items: [
        {
          id: "item1",
          name: "لاتيه",
          typeName: "حار",
          sizeName: "وسط",
          quantity: 2,
          unitPrice: "60",
          totalPrice: "120",
          status: "PREPARING",
        },
      ],
    };
    const order = normalizeTrackedOrder(remote);
    expect(order.id).toBe("ORD-00000123");
    expect(order.orderNumber).toBe("ORD-00000123");
    expect(order.status).toBe("confirmed");
    expect(order.statusText).toBe("جاري التحضير");
    expect(order.statusStep).toBe(2);
    expect(order.orderTypeText).toBe("توصيل للمنزل");
    expect(order.customerInfo).toMatchObject({
      name: "سارة",
      phone: "01001112222",
      address: "شارع النيل",
    });
    expect(order.pricing).toMatchObject({
      subtotal: 120,
      vat: 16.8,
      deliveryFee: 15,
      total: 151.8,
    });
    expect(order.paymentStatusText).toBe("قيد التحصيل عند الاستلام");
    expect(order.items[0]).toMatchObject({
      name: "لاتيه",
      sizeName: "وسط",
      typeName: "حار",
      quantity: 2,
      unitPrice: 60,
      totalPrice: 120,
      status: "PREPARING",
    });
    expect(order.items[0].customizations).toMatchObject({ size: "وسط", type: "حار" });
    expect(typeof order.dateFormatted).toBe("string");
    expect(order.dateFormatted.length).toBeGreaterThan(0);
  });

  it("maps READY/COMPLETED/DELIVERED into جاهز/تم التسليم labels", () => {
    expect(normalizeTrackedOrder({ status: "READY" }).statusText).toBe("جاهز");
    expect(normalizeTrackedOrder({ status: "COMPLETED" }).statusText).toBe("تم التسليم");
    expect(normalizeTrackedOrder({ status: "DELIVERED" }).status).toBe("delivered");
    expect(normalizeTrackedOrder({ status: "DELIVERED" }).statusStep).toBe(4);
    expect(normalizeTrackedOrder({ status: "COMPLETED" }).statusStep).toBe(4);
  });

  it("is safe for thin lookup payloads (no customer, no items)", () => {
    const order = normalizeTrackedOrder({ orderNumber: "ORD-00000999", status: "PENDING" });
    expect(order.statusText).toBe("جاري التحضير");
    expect(order.customerInfo).toMatchObject({ name: "", phone: "" });
    expect(order.items).toEqual([]);
    expect(order.pricing.total).toBe(0);
  });
});