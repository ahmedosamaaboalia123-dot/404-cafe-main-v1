import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";
const post = async (url, body, key) => unwrapData(await v1Client.post(url, body, { headers: operationHeaders({ idempotencyKey: key }) }));
export const TABLE_PROPOSAL_ENDPOINTS = Object.freeze({
  list: "/table-order-proposals",
  details: (id) => `/table-order-proposals/${encodeURIComponent(id)}`,
  startReview: (id) => `/table-order-proposals/${encodeURIComponent(id)}/start-review`,
  requestChanges: (id) => `/table-order-proposals/${encodeURIComponent(id)}/request-changes`,
  reject: (id) => `/table-order-proposals/${encodeURIComponent(id)}/reject`,
  confirm: (id) => `/table-order-proposals/${encodeURIComponent(id)}/confirm`,
});
export const tableExperienceApi = {
  proposals: async (params) => unwrapData(await v1Client.get(TABLE_PROPOSAL_ENDPOINTS.list, { params: normalizePageParams(params) })),
  proposal: async (id) => unwrapData(await v1Client.get(TABLE_PROPOSAL_ENDPOINTS.details(id))),
  startReview: (id, body, key) => post(TABLE_PROPOSAL_ENDPOINTS.startReview(id), body, key),
  requestChanges: (id, body, key) => post(TABLE_PROPOSAL_ENDPOINTS.requestChanges(id), body, key),
  reject: (id, body, key) => post(TABLE_PROPOSAL_ENDPOINTS.reject(id), body, key),
  confirm: (id, body, key) => post(TABLE_PROPOSAL_ENDPOINTS.confirm(id), body, key),
};
