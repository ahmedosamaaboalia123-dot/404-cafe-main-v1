import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { warningsApi } from "../api/warnings.api";
import { toWarningsScreen, toWarningsSummary } from "../adapters/warning.adapter";

export function useWarningsScreen(params) {
  return useQuery({
    queryKey: queryKeys.warnings.screen(params),
    queryFn: async () => toWarningsScreen(await warningsApi.screen(params)),
    placeholderData: (previous) => previous,
  });
}

export function useWarningsSummary() {
  return useQuery({
    queryKey: queryKeys.warnings.summary,
    queryFn: async () => toWarningsSummary(await warningsApi.summary()),
    staleTime: 30 * 1000,
  });
}
