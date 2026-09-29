import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const SUPPLIER_ENDPOINTS = Object.freeze({
  screen: "/suppliers-screen", create: "/suppliers",
  details: (id) => `/suppliers/${encodeURIComponent(id)}`,
  entries: (id) => `/suppliers/${encodeURIComponent(id)}/account-entries`,
  entry: (id) => `/supplier-account-entries/${encodeURIComponent(id)}`,
});

// Financial writes include a database transaction, audit, and event persistence.
// Wait beyond the server's maximum configurable deadline (30s) for its response.
const mutationOptions = (idempotencyKey) => ({
  timeout: 35_000,
  headers: operationHeaders({ idempotencyKey }),
});

export const suppliersApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(SUPPLIER_ENDPOINTS.screen, { params: normalizePageParams(params) })); },
  async create(body, idempotencyKey) { return unwrapData(await v1Client.post(SUPPLIER_ENDPOINTS.create, body, mutationOptions(idempotencyKey))); },
  async details(id, include = ["account", "materials", "recentEntries"]) { return unwrapData(await v1Client.get(SUPPLIER_ENDPOINTS.details(id), { params: { include: include.join(",") } })); },
  async update(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(SUPPLIER_ENDPOINTS.details(id), body, mutationOptions(idempotencyKey))); },
  async deleteSupplier(id, body, idempotencyKey) { return unwrapData(await v1Client.delete(SUPPLIER_ENDPOINTS.details(id), { ...mutationOptions(idempotencyKey), data: body })); },
  async entries(id, params = {}) { return unwrapData(await v1Client.get(SUPPLIER_ENDPOINTS.entries(id), { params: normalizePageParams(params) })); },
  async createEntry(id, body, idempotencyKey) { return unwrapData(await v1Client.post(SUPPLIER_ENDPOINTS.entries(id), body, mutationOptions(idempotencyKey))); },
  async updateEntry(entryId, body, idempotencyKey) { return unwrapData(await v1Client.patch(SUPPLIER_ENDPOINTS.entry(entryId), body, mutationOptions(idempotencyKey))); },
  async deleteEntry(entryId, body, idempotencyKey) { return unwrapData(await v1Client.delete(SUPPLIER_ENDPOINTS.entry(entryId), { ...mutationOptions(idempotencyKey), data: body })); },
};

// Temporary bridge for inventory screens (phase 5 replaces it with a proper
// options source): first screen page shaped like the legacy axios payload.
export async function getSupplierOptions() {
  const screen = await suppliersApi.screen({ page: 1, limit: 10 });
  return { data: screen?.suppliers ?? [] };
}
