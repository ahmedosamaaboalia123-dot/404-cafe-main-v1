import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { returnsApi } from "../api/returns.api";
import { toReturnDetails, toReturnPrintData, toReturnsScreen } from "../adapters/return.adapter";

export function useReturnsScreen(params) {
  return useQuery({
    queryKey: queryKeys.returns.list(params),
    queryFn: async () => toReturnsScreen(await returnsApi.screen(params)),
    placeholderData: (previous) => previous,
  });
}

export function useReturnDetails(id) {
  return useQuery({
    queryKey: queryKeys.returns.detail(id),
    queryFn: async () => toReturnDetails(await returnsApi.details(id)),
    enabled: Boolean(id),
  });
}

export function useReturnPrintData(id) {
  return useQuery({
    queryKey: [...queryKeys.returns.detail(id), "print"],
    queryFn: async () => toReturnPrintData(await returnsApi.printData(id)),
    enabled: Boolean(id),
  });
}
