import { describe, expect, it, vi } from "vitest";

const ORDER = "6ab6d3ac6ab0b6405f726010";

// Shape returned by GET /api/v1/table-experience/active-order.
const guestOrderPayload = {
  order: {
    id: ORDER,
    orderNumber: "ORD-1042",
    publicOrderNumber: "PUB-1042",
    status: "PREPARING",
    tableNumber: 5,
    fulfillmentType: "DINE_IN",
    totals: { subtotal: "120", discount: "0", tax: "18", total: "138" },
    balanceDue: "138",
    paymentStatus: "PENDING",
    createdAt: "2026-01-01T10:00:00.000Z",
    items: [
      {
        id: "6ab6d3ac6ab0b6405f726011",
        lineNo: 1,
        productName: "لاتيه",
        typeName: "ساخن",
        sizeName: "كبير",
        addons: ["شوكولاتة"],
        notes: "بدون سكر",
        quantity: 2,
        unitSellingPrice: "60",
        lineSubtotal: "120",
        status: "PREPARING",
      },
    ],
  },
};

const { get } = vi.hoisted(() => ({
  get: vi.fn(async () => ({ ok: true, data: {} })),
}));

vi.mock("@/services/apiClient", () => ({
  default: { get, post: vi.fn(async () => ({ ok: true, data: {} })) },
}));

const { getActiveTableOrder } = await import("@/modules/table/services/tableGateway");

describe("table guest active order", () => {
  it("reads the live order from the v1 guest endpoint with the table token", async () => {
    get.mockResolvedValueOnce({ ok: true, data: guestOrderPayload });
    const order = await getActiveTableOrder(5, "table-token");

    const [path, config] = get.mock.calls[0];
    expect(path).toBe("/v1/table-experience/active-order");
    expect(config.headers["X-Table-Token"]).toBe("table-token");

    // Shape the table orders page consumes.
    expect(order.id).toBe(ORDER);
    expect(order.orderNumber).toBe("ORD-1042");
    expect(order.tableNumber).toBe(5);
    expect(order.status).toBe("in_progress");
    expect(order.pricing).toEqual({ subtotal: 120, serviceFee: 0, vat: 18, discount: 0, total: 138 });
    expect(order.items[0]).toMatchObject({
      name: "لاتيه",
      sizeName: "كبير",
      typeName: "ساخن",
      quantity: 2,
      unitPrice: 60,
      totalPrice: 120,
      isReady: false,
      addonsText: "شوكولاتة",
      notes: "بدون سكر",
    });
  });

  it("marks ready items and completed orders from the backend status", async () => {
    get.mockResolvedValueOnce({
      ok: true,
      data: {
        order: {
          ...guestOrderPayload.order,
          status: "READY",
          items: [{ ...guestOrderPayload.order.items[0], status: "READY" }],
        },
      },
    });
    const order = await getActiveTableOrder(5, "table-token");
    expect(order.status).toBe("ready");
    expect(order.items[0].isReady).toBe(true);
  });

  it("returns null when the table has no order yet instead of throwing", async () => {
    get.mockResolvedValueOnce({ ok: true, data: { order: null } });
    await expect(getActiveTableOrder(5, "table-token")).resolves.toBeNull();
  });

  it("skips the request when there is no guest token yet", async () => {
    get.mockClear();
    await expect(getActiveTableOrder(5, "")).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
});
