import { describe, expect, it } from "vitest";
import {
  averageRating,
  isReviewableOrder,
  reviewSubmitErrorMessage,
  toReviewCard,
} from "@/modules/customer/feedback/services/reviewFlow";

describe("review flow helpers", () => {
  it("treats delivered and completed orders as reviewable", () => {
    expect(isReviewableOrder({ status: "DELIVERED" })).toBe(true);
    expect(isReviewableOrder({ status: "completed" })).toBe(true);
    expect(isReviewableOrder({ status: "PREPARING" })).toBe(false);
    expect(isReviewableOrder({})).toBe(false);
    expect(isReviewableOrder(null)).toBe(false);
  });

  it("maps backend review codes to Arabic messages", () => {
    expect(reviewSubmitErrorMessage({ code: "REVIEW_ALREADY_EXISTS" })).toBe("قيّمت هذا الطلب من قبل");
    expect(reviewSubmitErrorMessage({ code: "REVIEW_ORDER_NOT_COMPLETED" })).toBe("التقييم متاح بعد استلام طلبك");
    expect(reviewSubmitErrorMessage({ code: "ORDER_VERSION_CONFLICT" })).toContain("تغيرت بيانات الطلب");
    expect(reviewSubmitErrorMessage({ message: "boom" })).toBe("boom");
  });

  it("maps public reviews to display cards with safe fallbacks", () => {
    const card = toReviewCard({
      id: "r1",
      displayName: "كريم",
      rating: 4,
      comment: "جميل",
      submittedAt: "2026-09-18T10:00:00.000Z",
    });
    expect(card).toMatchObject({ id: "r1", initial: "ك", name: "كريم", rating: 4, comment: "جميل" });
    expect(card.date).not.toBe("—");
    const guest = toReviewCard({ rating: "bad" });
    expect(guest).toMatchObject({ name: "ضيف", initial: "ض", rating: 0, comment: "—", date: "—" });
  });

  it("averages ratings or returns null when empty", () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([{ rating: 5 }, { rating: 3 }])).toBe(4);
  });
});
