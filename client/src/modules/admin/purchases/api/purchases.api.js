import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const PURCHASE_ENDPOINTS = Object.freeze({
  screen: "/purchases-screen",
  groups: "/purchase-groups",
  details: (id) => `/purchase-groups/${encodeURIComponent(id)}`,
  split: (id) => `/purchase-groups/${encodeURIComponent(id)}/split-by-supplier`,
  registerMany: (id) => `/purchase-groups/${encodeURIComponent(id)}/register-many`,
  registerItem: (id) => `/purchase-items/${encodeURIComponent(id)}/register`,
  groupPrint: (id) => `/purchase-groups/${encodeURIComponent(id)}/print-data`,
  invoicePrint: (id) => `/supplier-purchase-invoices/${encodeURIComponent(id)}/print-data`,
});

export const purchasesApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(PURCHASE_ENDPOINTS.screen, { params: normalizePageParams(params) })); },
  async create(body, idempotencyKey) { return unwrapData(await v1Client.post(PURCHASE_ENDPOINTS.groups, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async details(id) { return unwrapData(await v1Client.get(PURCHASE_ENDPOINTS.details(id))); },
  async update(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(PURCHASE_ENDPOINTS.details(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async remove(id, body, idempotencyKey) { return unwrapData(await v1Client.delete(PURCHASE_ENDPOINTS.details(id), { data: body, headers: operationHeaders({ idempotencyKey }) })); },
  async splitBySupplier(id, body, idempotencyKey) { return unwrapData(await v1Client.post(PURCHASE_ENDPOINTS.split(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async registerItem(id, body, idempotencyKey) { return unwrapData(await v1Client.post(PURCHASE_ENDPOINTS.registerItem(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async registerMany(id, body, idempotencyKey) { return unwrapData(await v1Client.post(PURCHASE_ENDPOINTS.registerMany(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async groupPrintData(id) { return unwrapData(await v1Client.get(PURCHASE_ENDPOINTS.groupPrint(id))); },
  async invoicePrintData(id) { return unwrapData(await v1Client.get(PURCHASE_ENDPOINTS.invoicePrint(id))); },
};
