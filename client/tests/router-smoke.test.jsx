import { describe, expect, it } from "vitest";

describe("application router", () => {
  it("can be imported without an initialization ReferenceError", async () => {
    const module = await import("../src/app/router.jsx");
    expect(module.default).toBeTruthy();
  });
});
