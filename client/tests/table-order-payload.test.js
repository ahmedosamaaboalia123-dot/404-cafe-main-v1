import { describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn(async () => ({ ok: true, data: { proposal: null } })) }));

vi.mock("@/services/apiClient", () => ({
  default: {
    post,
    get: vi.fn(async () => ({ ok: true, data: {} })),
  },
}));

const { submitV1TableProposal, createTableOrder } = await import("@/modules/table/services/tableGateway");

const PRODUCT = "6ab6d3ac6ab0b6405f726001";
const SIZE = "6ab6d3ac6ab0b6405f726002";
const ADDON = "6ab6d3ac6ab0b6405f726003";

// Same shape ProductDetailsModal produces: composite id + originalId + customizations.
const modalItem = {
  id: `${PRODUCT}-ساخن-${SIZE}-${ADDON}`,
  originalId: PRODUCT,
  name: "لاتيه",
  quantity: 2,
  customizations: {
    size: "كبير",
    sizeId: SIZE,
    type: "ساخن",
    notes: "بدون سكر",
    addons: [{ id: ADDON, name: "شوكولاتة", productAddonId: ADDON, price: 10 }],
  },
};

const bodyOf = () => post.mock.calls[0][1];

describe("table order payload ids", () => {
  it("sends the catalog ids (not display labels) for a proposal", async () => {
    await submitV1TableProposal([modalItem], "table-token");
    expect(post.mock.calls[0][0]).toBe("/v1/table-experience/order-proposals");
    expect(bodyOf()).toEqual({
      items: [
        {
          productId: PRODUCT,
          productSizeId: SIZE,
          addonIds: [ADDON],
          quantity: 2,
          notes: "بدون سكر",
        },
      ],
    });
  });

  it("carries addons and notes into the direct table order too", async () => {
    await createTableOrder({ tableNumber: 5, items: [modalItem], tableToken: "table-token" });
    expect(bodyOf().items[0]).toMatchObject({
      productId: PRODUCT,
      productSizeId: SIZE,
      addonIds: [ADDON],
      quantity: 2,
      notes: "بدون سكر",
    });
  });

  it("never forwards a size or addon name as an id", async () => {
    await submitV1TableProposal(
      [
        {
          id: "p-local",
          name: "منتج بدون مقاسات",
          quantity: 1,
          customizations: { size: "عادي", sizeId: "medium", addons: [{ id: "شوكولاتة", name: "شوكولاتة" }] },
        },
      ],
      "table-token",
    );
    expect(bodyOf().items[0]).toMatchObject({ productId: null, productSizeId: null, addonIds: [] });
  });

  it("deduplicates addons that resolve to the same catalog id", async () => {
    await submitV1TableProposal(
      [
        {
          id: `${PRODUCT}-${SIZE}`,
          originalId: PRODUCT,
          productSizeId: SIZE,
          quantity: 1,
          customizations: { addons: [{ id: ADDON, productAddonId: ADDON }, { id: ADDON, productAddonId: ADDON }] },
        },
      ],
      "table-token",
    );
    expect(bodyOf().items[0].addonIds).toEqual([ADDON]);
  });
});
