import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { mockServer } from "@/test/server";
import { suppliersApi } from "@/modules/admin/suppliers/api/suppliers.api";

describe("supplier mutation deadlines", () => {
  it("accepts delayed write responses and preserves bodies and operation keys", async () => {
    const received = [];
    mockServer.use(http.all("*/api/v1/*", async ({ request }) => {
      received.push({
        method: request.method,
        key: request.headers.get("Idempotency-Key"),
        body: await request.json(),
      });
      // Longer than the shared client's 10s deadline, within the server's 15s deadline.
      await delay(10_500);
      return HttpResponse.json({ ok: true, data: { saved: true } });
    }));
    const body = { amount: "25", expectedAccountVersion: 0 };
    const results = await Promise.all([
      suppliersApi.create(body, "create"),
      suppliersApi.update("s1", body, "update"),
      suppliersApi.deleteSupplier("s1", body, "delete"),
      suppliersApi.createEntry("s1", { ...body, kind: "DEBT" }, "debt"),
      suppliersApi.createEntry("s1", { ...body, kind: "RECEIVABLE" }, "receivable"),
      suppliersApi.updateEntry("e1", body, "edit-entry"),
      suppliersApi.deleteEntry("e1", body, "delete-entry"),
    ]);
    expect(results).toEqual(Array.from({ length: 7 }, () => ({ saved: true })));
    expect(received.map(({ key }) => key).sort()).toEqual([
      "create", "debt", "delete", "delete-entry", "edit-entry", "receivable", "update",
    ]);
    expect(received.every(({ body: value }) => value.amount === "25")).toBe(true);
    expect(received.filter(({ method }) => method === "DELETE")).toHaveLength(2);
  });
});
