import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const NOTIFICATION_ENDPOINTS = Object.freeze({
  list: "/notifications",
  read: (id) => `/notifications/${encodeURIComponent(id)}/read`,
  readAll: "/notifications/read-all",
});

export const notificationsApi = {
  async list(params = {}) { return unwrapData(await v1Client.get(NOTIFICATION_ENDPOINTS.list, { params: normalizePageParams(params) })); },
  async markRead(id, idempotencyKey) { return unwrapData(await v1Client.post(NOTIFICATION_ENDPOINTS.read(id), {}, { headers: operationHeaders({ idempotencyKey }) })); },
  async markAllRead(body = {}, idempotencyKey) { return unwrapData(await v1Client.post(NOTIFICATION_ENDPOINTS.readAll, body, { headers: operationHeaders({ idempotencyKey }) })); },
};
