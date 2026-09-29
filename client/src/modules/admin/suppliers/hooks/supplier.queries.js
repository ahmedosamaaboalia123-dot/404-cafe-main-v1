import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { suppliersApi } from "../api/suppliers.api";
import { toSupplierDetails, toSupplierEntries, toSuppliersScreen } from "../adapters/supplier.adapter";

export function useSuppliersScreen(params) {
  return useQuery({ queryKey: queryKeys.suppliers.list(params), queryFn: async () => toSuppliersScreen(await suppliersApi.screen(params)), placeholderData: (previous) => previous });
}
export function useSupplierDetailsQuery(id) {
  return useQuery({ queryKey: queryKeys.suppliers.detail(id, "account,materials,recentEntries"), queryFn: async () => toSupplierDetails(await suppliersApi.details(id)), enabled: Boolean(id) });
}
export function useSupplierEntriesQuery(id, params) {
  return useQuery({ queryKey: ["suppliers", "entries", String(id), params], queryFn: async () => toSupplierEntries(await suppliersApi.entries(id, params)), enabled: Boolean(id), placeholderData: (previous) => previous });
}
