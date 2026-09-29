import { describe, expect, it } from "vitest";
import { ApiContractError, assertEnvelope, unwrapData, unwrapPage, unwrapWithMeta } from "@/api/envelope";

describe("API envelope", () => {
  it("unwraps success data and meta", () => {
    const payload = { ok: true, data: { id: "a" }, meta: { requestId: "r1" } };
    expect(unwrapData(payload)).toEqual({ id: "a" });
    expect(unwrapWithMeta(payload)).toEqual({ data: { id: "a" }, meta: { requestId: "r1" } });
  });

  it("rejects malformed envelopes", () => {
    expect(() => assertEnvelope({ data: {} })).toThrow(ApiContractError);
    expect(() => assertEnvelope({ ok: true })).toThrow(ApiContractError);
    expect(() => assertEnvelope({ ok: false })).toThrow(ApiContractError);
  });

  it("normalizes a paginated list and preserves screen extras", () => {
    const page = unwrapPage({
      ok: true,
      data: { items: [{ id: "1" }], summary: { totalBalance: "12.50" } },
      meta: { page: 2, limit: 10, total: 25, pages: 3, hasNext: true, hasPrevious: true },
    });
    expect(page.items).toHaveLength(1);
    expect(page.extra.summary.totalBalance).toBe("12.50");
    expect(page).toMatchObject({ page: 2, limit: 10, total: 25, pages: 3, hasNext: true, hasPrevious: true });
  });
});
