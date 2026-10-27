/**
 * Phase 3 — Production acceptance for the table guest experience.
 *
 * Guards the contracts a real guest depends on: the order version must survive
 * normalization (otherwise every review is a version conflict), backend error
 * codes must surface as Arabic text (never raw status codes), and a stale
 * version must trigger exactly one retry with the fresh version.
 */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createTestQueryClient } from "@/test/renderApp";
import { normalizeBackendTableOrder } from "@/modules/table/services/tableGateway";
import { reviewSubmitErrorMessage } from "@/modules/customer/feedback/services/reviewFlow";
import { normalizeApiError } from "@/api/apiError";
import TableFeedbackPage from "@/modules/table/feedback/pages/TableFeedbackPage";

const publicListMock = vi.fn();
const submitTableMock = vi.fn();
const freshOrderMock = vi.fn();

vi.mock("@/modules/admin/reviews/api/reviews.api", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    reviewsApi: { ...original.reviewsApi, publicList: (...args) => publicListMock(...args) },
  };
});

vi.mock("@/modules/table/services/tableGateway", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    getActiveTableOrder: (...args) => freshOrderMock(...args),
    submitV1TableReview: (...args) => submitTableMock(...args),
  };
});

const tableState = {
  activeOrder: null,
  tableNumber: 11,
  tableToken: "table-token-abc",
  refreshTableData: vi.fn(async () => {}),
};

vi.mock("@/modules/table/context/TableContext", () => ({
  useTable: () => tableState,
}));

function renderTableFeedback() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={["/table/11/feedback"]}>
        <Routes>
          <Route path="/table/:tableId/feedback" element={<TableFeedbackPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  tableState.activeOrder = null;
  publicListMock.mockReset().mockResolvedValue({ items: [] });
  submitTableMock.mockReset().mockResolvedValue({ review: { id: "rev9" } });
  freshOrderMock.mockReset().mockResolvedValue(null);
});

describe("phase 3 — order version contract", () => {
  it("keeps the backend version through normalization", () => {
    const order = normalizeBackendTableOrder({
      id: "6ab6d3ac6ab0b6405f726010",
      orderNumber: "ORD-1042",
      status: "READY",
      fulfillmentType: "DINE_IN",
      tableNumber: 3,
      version: 4,
      createdAt: "2026-01-01T10:00:00.000Z",
      items: [
        {
          product: { name: "لاتيه" },
          quantity: 2,
          unitSellingPrice: "60",
          lineSubtotal: "120",
          status: "READY",
        },
      ],
    });
    expect(order.version).toBe(4);
    expect(order.id).toBe("6ab6d3ac6ab0b6405f726010");
  });

  it("defaults the version to 0 only when the backend omits it", () => {
    const order = normalizeBackendTableOrder({
      id: "6ab6d3ac6ab0b6405f726011",
      orderNumber: "ORD-1043",
      status: "READY",
      items: [{ product: { name: "قهوة" }, quantity: 1 }],
    });
    expect(order.version).toBe(0);
  });
});

describe("phase 3 — error message contract", () => {
  it("maps backend review codes to Arabic", () => {
    expect(reviewSubmitErrorMessage({ code: "REVIEW_ALREADY_EXISTS" })).toBe("قيّمت هذا الطلب من قبل");
    expect(reviewSubmitErrorMessage({ code: "REVIEW_ORDER_NOT_COMPLETED" })).toContain("التقييم");
    expect(reviewSubmitErrorMessage({ code: "REVIEW_GUEST_NOT_LINKED" })).toContain("جلس");
  });

  it("never leaks a raw HTTP status code to the guest", () => {
    const conflict = reviewSubmitErrorMessage({ response: { status: 409 } });
    expect(conflict).toBe("تم تقييم هذا الطلب مسبقًا أو يوجد تعارض في البيانات");
    expect(conflict).not.toMatch(/409/);

    // The 503 wording comes from the shared error normalizer; the review mapper
    // must pass it through untouched instead of emitting the numeric code.
    const unavailable = reviewSubmitErrorMessage({
      message: "الخدمة غير متاحة مؤقتًا، حاول مرة أخرى بعد قليل",
    });
    expect(unavailable).toContain("الخدمة غير متاحة مؤقتًا");
    expect(unavailable).not.toMatch(/503/);

    // A bare axios 503 must still degrade to an Arabic sentence, never the code.
    const bare = reviewSubmitErrorMessage({ response: { status: 503 } });
    expect(bare).not.toMatch(/503/);
    expect(bare.length).toBeGreaterThan(0);
  });

  it("prefers the normalized message when one is present", () => {
    expect(
      reviewSubmitErrorMessage({ message: "تم تقييم هذا الطلب مسبقًا أو يوجد تعارض في البيانات" })
    ).toBe("تم تقييم هذا الطلب مسبقًا أو يوجد تعارض في البيانات");
  });
});

describe("phase 3 — error surface contract", () => {
  it("maps transport-level status codes to Arabic, never the raw code", () => {
    const cases = [
      [503, "الخدمة غير متاحة مؤقتًا، حاول مرة أخرى بعد قليل"],
      [502, "الخدمة غير متاحة مؤقتًا"],
      [504, "انتهت مهلة الاتصال"],
    ];
    for (const [status, expected] of cases) {
      const message = normalizeApiError({ response: { status } }).message;
      expect(message, `status ${status}`).toBe(expected);
      expect(message).not.toMatch(new RegExp(String(status)));
    }
  });

  it("never leaks a raw status code even for unmapped statuses", () => {
    for (const status of [401, 403, 409]) {
      const message = normalizeApiError({ response: { status } }).message;
      expect(message, `status ${status}`).not.toMatch(new RegExp(String(status)));
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it("prefers the server Arabic message when present", () => {
    const normalized = normalizeApiError({
      response: { status: 409, data: { error: { code: "REVIEW_ALREADY_EXISTS", messageAr: "قيّمت هذا الطلب من قبل" } } },
    });
    expect(normalized.message).toBe("قيّمت هذا الطلب من قبل");
    expect(normalized.status).toBe(409);
  });

  it("falls back to a network error message when there is no response", () => {
    const normalized = normalizeApiError({ code: "ERR_NETWORK" });
    expect(normalized.message).toBe("لا يوجد اتصال بالخادم");
  });
});

describe("phase 3 — stale version retry", () => {
  it("retries once with the fresh version and does not leak the error", async () => {
    tableState.activeOrder = {
      id: "507f1f77bcf86cd799439011",
      orderNumber: "ORD-9",
      version: 2,
      status: "COMPLETED",
    };
    submitTableMock
      .mockRejectedValueOnce({ code: "ORDER_VERSION_CONFLICT" })
      .mockResolvedValueOnce({ review: { id: "rev10" } });
    freshOrderMock.mockResolvedValueOnce({
      id: "507f1f77bcf86cd799439011",
      orderNumber: "ORD-9",
      version: 5,
      status: "COMPLETED",
    });

    const { unmount } = renderTableFeedback();
    await screen.findByText("رأيك يصنع تجربة أفضل", {}, { timeout: 8000 });
    fireEvent.click(screen.getByText("اترك تقييمك"));
    fireEvent.change(screen.getByPlaceholderText("أخبرنا عن جودة القهوة، الخدمة، أو الجو العام..."), {
      target: { value: "ممتاز" },
    });
    fireEvent.click(screen.getByText("إرسال التقييم"));

    await waitFor(() => expect(submitTableMock).toHaveBeenCalledTimes(2), { timeout: 5000 });
    expect(submitTableMock.mock.calls[1][2]).toMatchObject({ expectedOrderVersion: 5 });
    await screen.findByText("شكراً لمشاركتك رأيك!");
    unmount();
  });

  it("surfaces an Arabic message when the retry also fails", async () => {
    tableState.activeOrder = {
      id: "507f1f77bcf86cd799439011",
      orderNumber: "ORD-9",
      version: 2,
      status: "COMPLETED",
    };
    submitTableMock.mockRejectedValue({ response: { status: 409 } });
    freshOrderMock.mockResolvedValueOnce({ id: "507f1f77bcf86cd799439011", version: 5, status: "COMPLETED" });

    const { unmount } = renderTableFeedback();
    await screen.findByText("رأيك يصنع تجربة أفضل", {}, { timeout: 8000 });
    fireEvent.click(screen.getByText("اترك تقييمك"));
    fireEvent.change(screen.getByPlaceholderText("أخبرنا عن جودة القهوة، الخدمة، أو الجو العام..."), {
      target: { value: "جيد" },
    });
    fireEvent.click(screen.getByText("إرسال التقييم"));

    expect(
      await screen.findByText("تم تقييم هذا الطلب مسبقًا أو يوجد تعارض في البيانات", {}, { timeout: 5000 })
    ).toBeInTheDocument();
    unmount();
  });
});
