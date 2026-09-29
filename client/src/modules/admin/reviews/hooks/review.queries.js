import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { reviewsApi } from "../api/reviews.api";
import { toOrderReview, toReviewsList } from "../adapters/review.adapter";

export function useReviewsList(params) {
  return useQuery({
    queryKey: queryKeys.reviews.list(params),
    queryFn: async () => toReviewsList(await reviewsApi.list(params)),
    placeholderData: (previous) => previous,
  });
}

export function useOrderReview(orderId) {
  return useQuery({
    queryKey: queryKeys.reviews.detail(orderId),
    queryFn: async () => toOrderReview(await reviewsApi.orderReviews(orderId)),
    enabled: Boolean(orderId),
  });
}
