import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { reviewsApi } from "../api/reviews.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

function useReviewMutation(name, mutation, { reviewId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope(name));
  const result = useMutation({
    mutationFn: (variables) => mutation(variables, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
        reviewId ? queryClient.invalidateQueries({ queryKey: queryKeys.reviews.detail(reviewId) }) : Promise.resolve(),
      ]);
      onSuccess?.(data, variables);
    },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}

export const useUpdateReview = (reviewId, options) =>
  useReviewMutation("review:update", (body, key) => reviewsApi.update(reviewId, body, key), { reviewId, ...options });

export const useModerateReview = (reviewId, options) =>
  useReviewMutation("review:moderate", (body, key) => reviewsApi.moderate(reviewId, body, key), { reviewId, ...options });
