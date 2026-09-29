import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { productsApi } from "../api/products.api";
import { toProductDetails, toProductsScreen } from "../adapters/product.adapter";

export function useProductsScreen(params) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => toProductsScreen(await productsApi.screen(params)),
    placeholderData: (previous) => previous,
  });
}

export function useProductDetails(id) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: async () => toProductDetails(await productsApi.details(id)),
    enabled: Boolean(id),
  });
}

export function useCatalogPreview(params = {}, { enabled = false } = {}) {
  const { enabled: _ignored, ...query } = params;
  return useQuery({
    queryKey: [...queryKeys.catalog, query],
    queryFn: async () => productsApi.catalog(query),
    enabled,
  });
}
