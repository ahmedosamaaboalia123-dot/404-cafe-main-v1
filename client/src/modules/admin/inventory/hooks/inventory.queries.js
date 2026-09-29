import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { inventoryApi } from "../api/inventory.api";
import { toAllUnits, toMaterialDetails, toMaterialsScreen, toUnitOptions, toWithdrawalsList } from "../adapters/inventory.adapter";

export function useMaterialsScreen(params) {
  return useQuery({
    queryKey: queryKeys.materials.list(params),
    queryFn: async () => toMaterialsScreen(await inventoryApi.screen(params)),
    placeholderData: (previous) => previous,
  });
}

export function useMaterialDetailsQuery(id, include = ["batches", "movements"]) {
  return useQuery({
    queryKey: queryKeys.materials.detail(id, include.join(",")),
    queryFn: async () => toMaterialDetails(await inventoryApi.details(id, include)),
    enabled: Boolean(id),
  });
}

export function useUnitsQuery(params) {
  return useQuery({
    queryKey: ["units", params ?? null],
    queryFn: async () => toUnitOptions(await inventoryApi.units(params)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllUnitsQuery(params) {
  return useQuery({
    queryKey: ["units", "all", params ?? null],
    queryFn: async () => toAllUnits(await inventoryApi.units(params)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWithdrawalsQuery(params) {
  return useQuery({
    queryKey: ["withdrawals", params ?? null],
    queryFn: async () => toWithdrawalsList(await inventoryApi.withdrawals(params)),
    placeholderData: (previous) => previous,
  });
}
