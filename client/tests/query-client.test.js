import { describe, expect, it } from "vitest";
import { shouldRetryQuery } from "@/api/queryClient";

describe("React Query retry policy", () => {
  it.each([400, 401, 403, 404, 409, 422])("does not retry business HTTP %s", (status) => {
    expect(shouldRetryQuery(0, { response: { status, data: { error: { code: "BUSINESS_ERROR" } } } })).toBe(false);
  });
  it("retries transient server errors once to avoid retry storms", () => {
    const error = { response: { status: 503, data: { error: { code: "UNAVAILABLE", retryable: true } } } };
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);
    expect(shouldRetryQuery(2, error)).toBe(false);
  });
});
