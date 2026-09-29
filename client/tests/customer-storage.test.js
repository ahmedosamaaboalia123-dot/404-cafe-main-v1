import { beforeEach, describe, expect, it } from "vitest";
import { customerStorage } from "@/modules/customer/services/customerStorage";
describe("customer storage contract", () => {
  beforeEach(() => localStorage.clear());
  it("stores only profile fields", () => { const result = customerStorage.saveProfile({ name: "أحمد", phone: "01000000000", address: "القاهرة", items: [{ secret: true }], total: 100 }); expect(result).toEqual(expect.objectContaining({ name: "أحمد", phone: "01000000000", address: "القاهرة" })); expect(JSON.stringify(result)).not.toContain("items"); expect(JSON.stringify(result)).not.toContain("total"); });
  it("keeps independent access credentials per order", () => { customerStorage.saveOrderAccess("ORD-1", { trackingReadToken: "read-1", orderActionToken: "action-1", barcodeValue: "bar-1" }); customerStorage.saveOrderAccess("ORD-2", { trackingReadToken: "read-2", orderActionToken: "action-2" }); expect(customerStorage.getOrderAccess("ORD-1")?.orderActionToken).toBe("action-1"); expect(customerStorage.listOrderAccess()).toHaveLength(2); });
  it("forgetting one order does not erase the profile or other orders", () => { customerStorage.saveProfile({ name: "منى", phone: "01111111111" }); customerStorage.saveOrderAccess("A", { orderActionToken: "a" }); customerStorage.saveOrderAccess("B", { orderActionToken: "b" }); customerStorage.forgetOrderAccess("A"); expect(customerStorage.getOrderAccess("A")).toBeNull(); expect(customerStorage.getOrderAccess("B")?.orderActionToken).toBe("b"); expect(customerStorage.loadProfile().name).toBe("منى"); });
});
