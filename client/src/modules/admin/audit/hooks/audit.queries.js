import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { auditApi } from "../api/audit.api";
import { toAuditEvent, toAuditScreen, toEntityTimeline } from "../adapters/audit.adapter";

export function useAuditScreen(params) {
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: async () => toAuditScreen(await auditApi.screen(params)),
    placeholderData: (previous) => previous,
  });
}

export function useAuditEvent(id) {
  return useQuery({
    queryKey: queryKeys.audit.detail(id),
    queryFn: async () => toAuditEvent(await auditApi.details(id)),
    enabled: Boolean(id),
  });
}

export function useEntityTimeline(entityType, entityId, params) {
  return useQuery({
    queryKey: [...queryKeys.audit.all, "timeline", String(entityType), String(entityId), params ?? null],
    queryFn: async () => toEntityTimeline(await auditApi.timeline(entityType, entityId, params)),
    enabled: Boolean(entityType && entityId),
  });
}

export function useAuditExportStatus(statusUrl, { enabled = false, pollInterval = 2000 } = {}) {
  return useQuery({
    queryKey: [...queryKeys.audit.all, "export-status", statusUrl],
    queryFn: async () => auditApi.exportStatus(statusUrl),
    enabled: Boolean(enabled && statusUrl),
    refetchInterval: (query) => (query.state.data?.export?.status === "READY" || query.state.data?.export?.status === "FAILED" ? false : pollInterval),
  });
}
