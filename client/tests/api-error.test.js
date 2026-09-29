import { describe, expect, it, vi } from "vitest";
import { applyFieldErrors, isConflict, isDevicePending, isPermissionDenied, isSessionExpired, normalizeApiError } from "@/api/apiError";

describe("API errors", () => {
  it("preserves backend error details and request id", () => {
    const result = normalizeApiError({ response: { status: 422, data: {
      ok: false,
      error: { code: "VALIDATION_ERROR", messageAr: "خطأ تحقق", fieldErrors: [{ path: "name", messageAr: "مطلوب" }] },
      meta: { requestId: "req-1", serverTime: "now" },
    } } });
    expect(result).toMatchObject({ status: 422, code: "VALIDATION_ERROR", message: "خطأ تحقق", requestId: "req-1" });
    const setError = vi.fn();
    expect(applyFieldErrors(setError, result)).toBe(1);
    expect(setError).toHaveBeenCalledWith("name", { type: "server", message: "مطلوب" });
  });

  it("classifies conflict, forbidden and pending-device errors", () => {
    expect(isConflict({ response: { status: 409, data: { error: { code: "VERSION_CONFLICT" } } } })).toBe(true);
    expect(isPermissionDenied({ response: { status: 403, data: { error: {} } } })).toBe(true);
    expect(isDevicePending({ response: { status: 202, data: { error: { code: "DEVICE_APPROVAL_REQUIRED" } } } })).toBe(true);
  });

  it("classifies a missing response as retryable network failure", () => {
    expect(normalizeApiError(new Error("offline"))).toMatchObject({ code: "NETWORK_ERROR", retryable: true });
  });

  it("treats only 401 as a dead session worth wiping", () => {
    expect(isSessionExpired({ response: { status: 401, data: {} } })).toBe(true);
    expect(isSessionExpired({ response: { status: 403, data: {} } })).toBe(false);
    expect(isSessionExpired({ response: { status: 500, data: {} } })).toBe(false);
    expect(isSessionExpired(new Error("offline"))).toBe(false);
  });
});
