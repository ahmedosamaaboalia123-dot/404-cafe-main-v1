import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const RETURN_ENDPOINTS = Object.freeze({
  screen: "/purchase-returns-screen",
  create: "/purchase-returns",
  details: (id) => `/purchase-returns/${encodeURIComponent(id)}`,
  print: (id) => `/purchase-returns/${encodeURIComponent(id)}/print-data`,
});

export const returnsApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(RETURN_ENDPOINTS.screen, { params: normalizePageParams(params) })); },
  async create(body, idempotencyKey) { return unwrapData(await v1Client.post(RETURN_ENDPOINTS.create, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async details(id) { return unwrapData(await v1Client.get(RETURN_ENDPOINTS.details(id))); },
  async printData(id) { return unwrapData(await v1Client.get(RETURN_ENDPOINTS.print(id))); },
};
