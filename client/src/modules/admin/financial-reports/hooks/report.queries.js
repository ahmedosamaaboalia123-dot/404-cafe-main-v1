import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { reportsApi } from "../api/reports.api";
import {
  toDelegateReport,
  toDrawerReport,
  toExportJob,
  toInventoryReport,
  toReportScreen,
  toSalesReport,
  toSupplierReport,
} from "../adapters/report.adapter";

export function useReportScreen(params) {
  return useQuery({
    queryKey: queryKeys.reports.financial(params),
    queryFn: async () => toReportScreen(await reportsApi.screen(params)),
    placeholderData: (previous) => previous,
    staleTime: 60 * 1000,
  });
}

export function useSalesReport(params) {
  return useQuery({
    queryKey: [...queryKeys.reports.financial(params), "sales"],
    queryFn: async () => toSalesReport(await reportsApi.sales(params)),
    placeholderData: (previous) => previous,
    staleTime: 60 * 1000,
  });
}

export function useInventoryReport(params) {
  return useQuery({
    queryKey: [...queryKeys.reports.financial(params), "inventory"],
    queryFn: async () => toInventoryReport(await reportsApi.inventory(params)),
    placeholderData: (previous) => previous,
    staleTime: 60 * 1000,
  });
}

export function useDrawerReport(params) {
  return useQuery({
    queryKey: [...queryKeys.reports.financial(params), "drawer"],
    queryFn: async () => toDrawerReport(await reportsApi.drawer(params)),
    placeholderData: (previous) => previous,
    staleTime: 60 * 1000,
  });
}

export function useSupplierReport(params) {
  return useQuery({
    queryKey: [...queryKeys.reports.financial(params), "suppliers"],
    queryFn: async () => toSupplierReport(await reportsApi.suppliers(params)),
    placeholderData: (previous) => previous,
    staleTime: 60 * 1000,
  });
}

export function useDelegateReport(params) {
  return useQuery({
    queryKey: [...queryKeys.reports.financial(params), "delegates"],
    queryFn: async () => toDelegateReport(await reportsApi.delegates(params)),
    placeholderData: (previous) => previous,
    staleTime: 60 * 1000,
  });
}

export function useExportStatus(statusUrl, { enabled = false, pollInterval = 2000 } = {}) {
  return useQuery({
    queryKey: [...queryKeys.reports.exports.all, "status", statusUrl],
    queryFn: async () => toExportJob(await reportsApi.exportStatus(statusUrl)),
    enabled: Boolean(enabled && statusUrl),
    refetchInterval: (query) => (query.state.data?.status === "READY" || query.state.data?.status === "FAILED" ? false : pollInterval),
  });
}
