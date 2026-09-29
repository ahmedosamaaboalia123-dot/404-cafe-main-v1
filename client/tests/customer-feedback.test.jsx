import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createTestQueryClient } from "@/test/renderApp";
import CustomerFeedbackPage from "@/modules/customer/feedback/pages/CustomerFeedbackPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

const publicListMock = vi.fn();
const historyMock = vi.fn();
const submitMock = vi.fn();

vi.mock("@/modules/admin/reviews/api/reviews.api", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    reviewsApi: { ...original.reviewsApi, publicList: (...args) => publicListMock(...args) },
  };
});

vi.mock("@/modules/customer/checkout/services/orderGateway", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    listV1CustomerHistory: (...args) => historyMock(...args),
    submitV1PublicReview: (...args) => submitMock(...args),
  };
});

const deliveredOrder = {
  orderNumber: "ORD-7",
  publicOrderNumber: "ORD-7",
  status: "DELIVERED",
  version: 3,
  total: 100,
};

function renderFeedback() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={["/customer/feedback"]}>
        <Routes>
          <Route path="/customer/feedback" element={<CustomerFeedbackPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function setAccess(orderNumber, token = "action-token-1234567890") {
  localStorage.setItem(
    "404:customer:order-access",
    JSON.stringify({ [orderNumber]: { orderNumber, orderActionToken: token, trackingReadToken: "read" } })
  );
}

beforeEach(() => {
  localStorage.clear();
  publicListMock.mockReset().mockResolvedValue({ items: [] });
  historyMock.mockReset().mockResolvedValue({ items: [] });
  submitMock.mockReset().mockResolvedValue({ review: { id: "rev1" } });
});

describe("customer feedback eligibility and submit", () => {
  it("blocks rating when no delivered order exists", async () => {
    historyMock.mockResolvedValue({ items: [{ ...deliveredOrder, status: "PREPARING" }] });
    const { unmount } = renderFeedback();
    await screen.findByText("آراء وتقييمات 404", {}, { timeout: 8000 });
    fireEvent.click(screen.getByText("اترك تقييمك"));
    expect(await screen.findByText("التقييم متاح بعد استلام أول طلب من طلباتك.")).toBeInTheDocument();
    unmount();
  });

  it("submits a review for the delivered order with its action token", async () => {
    setAccess("ORD-7");
    historyMock.mockResolvedValue({ items: [deliveredOrder] });
    const { unmount } = renderFeedback();
    await screen.findByText("لا توجد تقييمات بعد — كن أول من يقيّم", {}, { timeout: 8000 });
    fireEvent.click(screen.getByText("اترك تقييمك"));
    expect(await screen.findByText("كيف كانت تجربتك معنا في 404 Coffee؟")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("مثال: أحمد محمد"), { target: { value: "كريم" } });
    fireEvent.change(screen.getByPlaceholderText("أخبرنا عن جودة القهوة، الخدمة، أو الجو العام..."), {
      target: { value: "قهوة ممتازة" },
    });
    fireEvent.click(screen.getByText("إرسال التقييم"));
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(submitMock.mock.calls[0][0]).toBe("ORD-7");
    expect(submitMock.mock.calls[0][1]).toBe("action-token-1234567890");
    expect(submitMock.mock.calls[0][2]).toMatchObject({
      rating: 5,
      displayName: "كريم",
      comment: "قهوة ممتازة",
      expectedOrderVersion: 3,
    });
    await screen.findByText("شكراً لمشاركتك رأيك!");
    unmount();
  });

  it("shows the reviewer name on public comments", async () => {
    publicListMock.mockResolvedValue({
      items: [{ id: "r1", displayName: "كريم", rating: 5, comment: "جميل", submittedAt: "2026-09-18T10:00:00.000Z" }],
    });
    const { unmount } = renderFeedback();
    expect(await screen.findByText("كريم", {}, { timeout: 8000 })).toBeInTheDocument();
    unmount();
  });
});
