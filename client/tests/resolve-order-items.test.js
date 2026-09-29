import { describe, expect, it, vi } from "vitest";
import { resolveOrderItems } from "@/modules/customer/checkout/services/orderGateway";
import { getV1Menu } from "@/services/catalogService";

vi.mock("@/services/catalogService", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getV1Menu: vi.fn(async () => ({
      fromBackend: true,
      items: [
        { id: "507f1f77bcf86cd799439011", name: "لاتيه", sizes: [{ id: "507f1f77bcf86cd799439012", name: "وسط" }] },
      ],
    })),
  };
});

describe("resolveOrderItems", () => {
  it("keeps fully-specified items untouched", async () => {
    const out = await resolveOrderItems([
      {
        originalId: "507f1f77bcf86cd799439011",
        productSizeId: "507f1f77bcf86cd799439012",
        quantity: 2,
        customizations: { addons: [{ id: "507f1f77bcf86cd799439013" }] },
      },
    ]);
    expect(out).toEqual([
      {
        productId: "507f1f77bcf86cd799439011",
        productSizeId: "507f1f77bcf86cd799439012",
        quantity: 2,
        addonIds: ["507f1f77bcf86cd799439013"],
      },
    ]);
    expect(getV1Menu).not.toHaveBeenCalled();
  });

  it("resolves a missing size from the catalog default", async () => {
    const out = await resolveOrderItems([
      { id: "507f1f77bcf86cd799439011", name: "لاتيه", price: 60, quantity: 1 },
    ]);
    expect(out[0]).toMatchObject({
      productId: "507f1f77bcf86cd799439011",
      productSizeId: "507f1f77bcf86cd799439012",
      quantity: 1,
    });
    expect(getV1Menu).toHaveBeenCalled();
  });

  it("names the product when no size can be resolved", async () => {
    await expect(resolveOrderItems([{ id: "507f1f77bcf86cd799439099", name: "صنف غامض" }])).rejects.toThrow(
      "اختر المقاس لمنتج: صنف غامض"
    );
  });

  it("drops invalid addons and clamps quantity", async () => {
    const out = await resolveOrderItems([
      {
        originalId: "507f1f77bcf86cd799439011",
        productSizeId: "507f1f77bcf86cd799439012",
        quantity: 500,
        customizations: { addons: [{ id: "bad" }, "507f1f77bcf86cd799439013"], notes: "  ملاحظة  " },
      },
    ]);
    expect(out[0].quantity).toBe(100);
    expect(out[0].addonIds).toEqual(["507f1f77bcf86cd799439013"]);
    expect(out[0].notes).toBe("ملاحظة");
  });

  it("rejects an empty cart", async () => {
    await expect(resolveOrderItems([])).rejects.toThrow("السلة فارغة");
  });
});
