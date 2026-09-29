import { beforeEach, describe, expect, it } from "vitest";
import { tableSessionStorage } from "@/modules/table/services/tableSessionStorage";
describe("table guest session", () => {
  beforeEach(() => sessionStorage.clear());
  it("binds the guest token to exactly one table", () => { tableSessionStorage.save(3, { tableToken: "secret-token", session: { expiresAt: new Date(Date.now() + 60_000).toISOString() } }); expect(tableSessionStorage.read(3)?.tableToken).toBe("secret-token"); expect(tableSessionStorage.read(4)).toBeNull(); });
  it("rejects an expired guest session", () => { tableSessionStorage.save(2, { tableToken: "expired", session: { expiresAt: new Date(Date.now() - 60_000).toISOString() } }); expect(tableSessionStorage.read(2)).toBeNull(); });
});
