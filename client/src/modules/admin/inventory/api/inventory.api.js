import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const INVENTORY_ENDPOINTS = Object.freeze({
  screen: "/raw-materials-screen",
  create: "/raw-materials",
  details: (id) => `/raw-materials/${encodeURIComponent(id)}`,
  batches: (id) => `/raw-materials/${encodeURIComponent(id)}/batches`,
  units: "/measurement-units",
  withdraw: (id) => `/raw-materials/${encodeURIComponent(id)}/withdrawals`,
  priorities: (id) => `/raw-materials/${encodeURIComponent(id)}/batch-priorities`,
  withdrawals: "/withdrawals",
});

export const inventoryApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(INVENTORY_ENDPOINTS.screen, { params: normalizePageParams(params) })); },
  async create(body, idempotencyKey) { return unwrapData(await v1Client.post(INVENTORY_ENDPOINTS.create, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async details(id, include = ["batches", "movements"]) { return unwrapData(await v1Client.get(INVENTORY_ENDPOINTS.details(id), { params: { include: include.join(",") } })); },
  async update(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(INVENTORY_ENDPOINTS.details(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async deleteMaterial(id, body, idempotencyKey) { return unwrapData(await v1Client.delete(INVENTORY_ENDPOINTS.details(id), { data: body, headers: operationHeaders({ idempotencyKey }) })); },
  async withdraw(id, body, idempotencyKey) { return unwrapData(await v1Client.post(INVENTORY_ENDPOINTS.withdraw(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async reorderPriorities(id, body, idempotencyKey) { return unwrapData(await v1Client.put(INVENTORY_ENDPOINTS.priorities(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async updateBatch(id, batchId, body, idempotencyKey) { return unwrapData(await v1Client.patch(`${INVENTORY_ENDPOINTS.batches(id)}/${encodeURIComponent(batchId)}`, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async withdrawals(params = {}) { return unwrapData(await v1Client.get(INVENTORY_ENDPOINTS.withdrawals, { params: normalizePageParams(params) })); },
  async units(params = {}) { return unwrapData(await v1Client.get(INVENTORY_ENDPOINTS.units, { params })); },
};
