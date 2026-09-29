import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const REVIEW_ENDPOINTS = Object.freeze({
  list: "/reviews",
  publicList: "/public-reviews",
  orderReviews: (id) => `/orders/${encodeURIComponent(id)}/reviews`,
  details: (id) => `/reviews/${encodeURIComponent(id)}`,
  moderation: (id) => `/reviews/${encodeURIComponent(id)}/moderation`,
});

export const reviewsApi = {
  async list(params = {}) { return unwrapData(await v1Client.get(REVIEW_ENDPOINTS.list, { params: normalizePageParams(params) })); },
  async publicList(params = {}) { return unwrapData(await v1Client.get(REVIEW_ENDPOINTS.publicList, { params: normalizePageParams(params) })); },
  async orderReviews(id, params = {}) { return unwrapData(await v1Client.get(REVIEW_ENDPOINTS.orderReviews(id), { params: normalizePageParams(params) })); },
  async update(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(REVIEW_ENDPOINTS.details(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async moderate(id, body, idempotencyKey) { return unwrapData(await v1Client.post(REVIEW_ENDPOINTS.moderation(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
};
