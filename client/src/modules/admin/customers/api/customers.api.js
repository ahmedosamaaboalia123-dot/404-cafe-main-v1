import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const CUSTOMER_ENDPOINTS = Object.freeze({
  screen: "/customers-screen",
  create: "/customers",
  details: (id) => `/customers/${encodeURIComponent(id)}`,
});

export const customersApi = {
  screen: async (params = {}) => unwrapData(await v1Client.get(CUSTOMER_ENDPOINTS.screen, { params: normalizePageParams(params) })),
  create: async (body, key) => unwrapData(await v1Client.post(CUSTOMER_ENDPOINTS.create, body, { headers: operationHeaders({ idempotencyKey: key }) })),
  details: async (id, include = "orders,reviews") => unwrapData(await v1Client.get(CUSTOMER_ENDPOINTS.details(id), { params: { include } })),
  update: async (id, body, key) => unwrapData(await v1Client.patch(CUSTOMER_ENDPOINTS.details(id), body, { headers: operationHeaders({ idempotencyKey: key }) })),
};
