import { describe, expect, it } from "vitest";
import { parseOrderInput, reasonSchema } from "@/modules/admin/orders/schemas/orders.schema";
import { toOnlinePage, toPreparationDetails } from "@/modules/admin/orders/adapters/orders.adapter";
const id = "507f1f77bcf86cd799439011";
describe("orders v1 integration contracts", () => {
  it("keeps Mongo ids as strings and validates a cash order payload", () => { const value = parseOrderInput({ fulfillmentType: "TAKEAWAY", customer: { name: "أحمد علي", phone: "01000000000" }, items: [{ productId: id, productSizeId: id, quantity: 2 }] }); expect(value.items[0].productId).toBe(id); });
  it("rejects short cancellation reasons", () => expect(reasonSchema.safeParse("لا").success).toBe(false));
  it("normalizes server paging and progress", () => { const page = toOnlinePage({ orders: [{ id, totals: { total: "12.50" }, progress: { ready: 1, total: 2 } }], pageMeta: { page: 1, limit: 10, total: 1 } }); expect(page.items[0]).toMatchObject({ id, total: "12.50", version: 0 }); expect(page.meta.total).toBe(1); });
  it("preserves preparation concurrency versions", () => { const value = toPreparationDetails({ order: { id, version: 4 }, items: [{ id, version: 2 }], progress: { ready: 0, total: 1 } }); expect(value.order.version).toBe(4); expect(value.items[0].version).toBe(2); });
});
