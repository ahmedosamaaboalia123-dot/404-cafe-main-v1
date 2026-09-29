import { QueryClient } from "@tanstack/react-query";
import { normalizeApiError } from "./apiError";

export function shouldRetryQuery(failureCount, error) {
  const normalized = normalizeApiError(error);
  if ([400, 401, 403, 404, 409, 422].includes(normalized.status)) return false;
  return failureCount < 1 && (normalized.retryable || normalized.status === 503 || Number(normalized.status) >= 500);
}

export function createQueryClient() {
  return new QueryClient({ defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: shouldRetryQuery, retryDelay: () => 300, refetchOnWindowFocus: false },
    mutations: { retry: false },
  } });
}

export const queryClient = createQueryClient();
