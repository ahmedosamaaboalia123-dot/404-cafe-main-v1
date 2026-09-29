import { afterEach, describe, expect, it } from "vitest";
import { beginOperation, clearAllOperations, finishOperation, operationHeaders, withExpectedVersion } from "@/api/idempotency";
import { normalizePageParams, readPageMeta, resetPageOnFilterChange } from "@/api/pagination";
import { cancelAllPendingRequests, cancelPendingRequest, replacePendingRequest } from "@/api/requestCancellation";
import { queryKeys } from "@/api/queryKeys";

afterEach(() => { clearAllOperations(); cancelAllPendingRequests(); });

describe("idempotency", () => {
  it("reuses a key for the same attempt and rotates after completion", () => {
    const first = beginOperation("supplier:create", "fixed-key");
    expect(beginOperation("supplier:create", "ignored-key")).toBe(first);
    finishOperation("supplier:create");
    expect(beginOperation("supplier:create", "new-key")).toBe("new-key");
  });
  it("builds operation metadata without dropping version zero", () => {
    expect(operationHeaders({ idempotencyKey: "k", requestId: "r" })).toEqual({ "Idempotency-Key": "k", "X-Request-Id": "r" });
    expect(withExpectedVersion({ reason: "x" }, 0)).toEqual({ reason: "x", expectedVersion: 0 });
  });
});

describe("pagination and keys", () => {
  it("clamps every operational page to a limit of ten", () => {
    expect(normalizePageParams({ page: -2, limit: 100, search: "قهوة" })).toEqual({ page: 1, limit: 10, search: "قهوة" });
    expect(readPageMeta({ page: 2, limit: 50, total: 21 })).toMatchObject({ page: 2, limit: 10, total: 21, pages: 3 });
  });
  it("resets page on filter changes and creates stable query keys", () => {
    expect(resetPageOnFilterChange({ page: 4, status: "A" }, { page: 4, status: "B" }).page).toBe(1);
    expect(queryKeys.suppliers.list({ search: "x", page: 2 })).toEqual(queryKeys.suppliers.list({ page: 2, search: "x" }));
  });
});

describe("request cancellation", () => {
  it("aborts the previous request sharing the same key", () => {
    const first = replacePendingRequest("search");
    const second = replacePendingRequest("search");
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    expect(cancelPendingRequest("search")).toBe(true);
    expect(second.aborted).toBe(true);
  });
});
