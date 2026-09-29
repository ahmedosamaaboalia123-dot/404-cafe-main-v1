import { readPageMeta } from "@/api/pagination";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));

export const REVIEW_STATUSES = Object.freeze({ VISIBLE: "ظاهر", HIDDEN: "مخفي" });

const cleanReview = (review = {}) => ({
  ...review,
  id: str(review.id),
  orderId: str(review.orderId),
  customerId: review.customerId ? str(review.customerId) : null,
  tableGuestSessionId: review.tableGuestSessionId ? str(review.tableGuestSessionId) : null,
  fulfillmentType: review.fulfillmentType || "",
  rating: Number(review.rating ?? 0),
  comment: review.comment ?? null,
  displayName: review.displayName ?? null,
  status: review.status || "VISIBLE",
  statusLabel: REVIEW_STATUSES[review.status] || review.status || "—",
  submittedAt: review.submittedAt ?? null,
  version: Number(review.version ?? 0),
});

export function toReviewsList(data = {}) {
  const items = (data.items || []).map(cleanReview);
  return {
    items,
    summary: {
      total: Number(data.summary?.total ?? items.length),
      visible: Number(data.summary?.visible ?? 0),
      hidden: Number(data.summary?.hidden ?? 0),
    },
    pageMeta: readPageMeta(data.pageMeta, items.length),
  };
}

export function toOrderReview(data = {}) {
  return { review: data.review ? cleanReview(data.review) : null };
}
