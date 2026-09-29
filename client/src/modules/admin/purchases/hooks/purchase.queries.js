import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { purchasesApi } from "../api/purchases.api";
import { toPurchaseGroupDetails, toPurchasePrintData, toPurchasesScreen } from "../adapters/purchase.adapter";

export function usePurchasesScreen(params) {
  return useQuery({
    queryKey: queryKeys.purchases.list(params),
    queryFn: async () => toPurchasesScreen(await purchasesApi.screen(params)),
    placeholderData: (previous) => previous,
  });
}

export function usePurchaseGroupDetails(id) {
  return useQuery({
    queryKey: queryKeys.purchases.detail(id),
    queryFn: async () => toPurchaseGroupDetails(await purchasesApi.details(id)),
    enabled: Boolean(id),
  });
}

export function usePurchasePrintData(id, kind = "group") {
  return useQuery({
    queryKey: [...queryKeys.purchases.detail(id), "print", kind],
    queryFn: async () => toPurchasePrintData(
      kind === "invoice" ? await purchasesApi.invoicePrintData(id) : await purchasesApi.groupPrintData(id),
    ),
    enabled: Boolean(id),
  });
}
