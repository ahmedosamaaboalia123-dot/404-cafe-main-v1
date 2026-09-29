import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createTestQueryClient } from "@/test/renderApp";
import TableFeedbackPage from "@/modules/table/feedback/pages/TableFeedbackPage";

const publicListMock = vi.fn();
const submitTableMock = vi.fn();

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
    getActiveTableOrder: vi.fn(async () => null),
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
});

describe("table feedback eligibility and submit", () => {
  it("blocks rating when no running order exists", async () => {
    const { unmount } = renderTableFeedback();
    await screen.findByText("رأيك يصنع تجربة أفضل", {}, { timeout: 8000 });
    fireEvent.click(screen.getByText("اترك تقييمك"));
    expect(
      await screen.findByText("التقييم متاح عند وجود طلب شغال على هذه الطاولة.")
    ).toBeInTheDocument();
    expect(submitTableMock).not.toHaveBeenCalled();
    unmount();
  });

  it("submits a review for the running table order", async () => {
    tableState.activeOrder = {
      id: "507f1f77bcf86cd799439011",
      orderNumber: "ORD-9",
      version: 2,
      status: "COMPLETED",
    };
    const { unmount } = renderTableFeedback();
    await screen.findByText("رأيك يصنع تجربة أفضل", {}, { timeout: 8000 });
    fireEvent.click(screen.getByText("اترك تقييمك"));
    expect(await screen.findByText("كيف كانت تجربتك معنا في 404 Coffee؟")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("أخبرنا عن جودة القهوة، الخدمة، أو الجو العام..."), {
      target: { value: "خدمة سريعة" },
    });
    fireEvent.click(screen.getByText("إرسال التقييم"));
    await waitFor(() => expect(submitTableMock).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(submitTableMock.mock.calls[0][0]).toBe("507f1f77bcf86cd799439011");
    expect(submitTableMock.mock.calls[0][1]).toBe("table-token-abc");
    expect(submitTableMock.mock.calls[0][2]).toMatchObject({
      rating: 5,
      comment: "خدمة سريعة",
      expectedOrderVersion: 2,
    });
    await screen.findByText("شكراً لمشاركتك رأيك!");
    unmount();
  });
});
