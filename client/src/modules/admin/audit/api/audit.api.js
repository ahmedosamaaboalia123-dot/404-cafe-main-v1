import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const AUDIT_ENDPOINTS = Object.freeze({
  screen: "/audit-events-screen",
  details: (id) => `/audit-events/${encodeURIComponent(id)}`,
  timeline: (entityType, entityId) => `/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/timeline`,
  requestExport: "/audit-events/exports",
  exportStatus: (id) => `/audit-events/exports/${encodeURIComponent(id)}`,
});

export const auditApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(AUDIT_ENDPOINTS.screen, { params: normalizePageParams(params) })); },
  async details(id) { return unwrapData(await v1Client.get(AUDIT_ENDPOINTS.details(id))); },
  async timeline(entityType, entityId, params = {}) { return unwrapData(await v1Client.get(AUDIT_ENDPOINTS.timeline(entityType, entityId), { params: normalizePageParams(params) })); },
  async requestExport(body, idempotencyKey) { return unwrapData(await v1Client.post(AUDIT_ENDPOINTS.requestExport, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async exportStatus(statusUrl) { return unwrapData(await v1Client.get(statusUrl)); },
};
