import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const REPORT_ENDPOINTS = Object.freeze({
  screen: "/financial-reports-screen",
  sales: "/financial-reports/sales",
  inventory: "/financial-reports/inventory",
  drawer: "/financial-reports/drawer",
  suppliers: "/financial-reports/suppliers",
  delegates: "/financial-reports/delegates",
  requestExport: "/financial-reports/exports",
  exportStatus: (id) => `/financial-reports/exports/${encodeURIComponent(id)}`,
});

export const reportsApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(REPORT_ENDPOINTS.screen, { params })); },
  async sales(params = {}) { return unwrapData(await v1Client.get(REPORT_ENDPOINTS.sales, { params: normalizePageParams(params) })); },
  async inventory(params = {}) { return unwrapData(await v1Client.get(REPORT_ENDPOINTS.inventory, { params: normalizePageParams(params) })); },
  async drawer(params = {}) { return unwrapData(await v1Client.get(REPORT_ENDPOINTS.drawer, { params: normalizePageParams(params) })); },
  async suppliers(params = {}) { return unwrapData(await v1Client.get(REPORT_ENDPOINTS.suppliers, { params: normalizePageParams(params) })); },
  async delegates(params = {}) { return unwrapData(await v1Client.get(REPORT_ENDPOINTS.delegates, { params: normalizePageParams(params) })); },
  async requestExport(body, idempotencyKey) { return unwrapData(await v1Client.post(REPORT_ENDPOINTS.requestExport, body, { headers: operationHeaders({ idempotencyKey }) })); },
  // statusUrl comes from the backend as "/financial-reports/exports/:id" (relative to /api/v1)
  async exportStatus(statusUrl) { return unwrapData(await v1Client.get(statusUrl)); },
};
