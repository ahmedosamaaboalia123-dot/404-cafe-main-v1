export const REVIEWABLE_ORDER_STATUSES = Object.freeze(["delivered", "completed"]);

export function isReviewableOrder(order) {
  return REVIEWABLE_ORDER_STATUSES.includes(String(order?.status || "").toLowerCase());
}

export function reviewSubmitErrorMessage(error) {
  const code = error?.code || error?.cause?.code || "";
  switch (code) {
    case "REVIEW_ALREADY_EXISTS":
      return "قيّمت هذا الطلب من قبل";
    case "REVIEW_ORDER_NOT_COMPLETED":
      return "التقييم متاح بعد استلام طلبك";
    case "ORDER_VERSION_CONFLICT":
      return "تغيرت بيانات الطلب، حدّث الصفحة وحاول مجددًا";
    case "ORDER_NOT_FOUND":
      return "الطلب غير موجود";
    case "REVIEW_FULFILLMENT_DEFERRED":
      return "تقييم الصالة يتم من جلسة الطاولة";
    case "REVIEW_OWNER_CONFLICT":
      return "هذا التقييم غير مرتبط بطلبك";
    default:
      return error?.message || "تعذر إرسال التقييم";
  }
}

const formatReviewDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ar-EG");
};

export function toReviewCard(review = {}) {
  const name = review.displayName || review.customerName || review.name || "ضيف";
  return {
    id: String(review.id ?? review._id ?? ""),
    initial: String(name).trim().charAt(0) || "ض",
    name,
    date: formatReviewDate(review.submittedAt || review.createdAt || review.date),
    rating: Math.max(0, Math.min(5, Number(review.rating) || 0)),
    comment: review.comment || review.text || "—",
  };
}

export function averageRating(reviews = []) {
  if (!reviews.length) return null;
  return reviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / reviews.length;
}
