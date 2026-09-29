import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";
const readHeaders = (token) => ({ "X-Tracking-Read-Token": token }); const actionHeaders = (token, key) => ({ "X-Order-Action-Token": token, ...operationHeaders({ idempotencyKey: key }) });
const encode = encodeURIComponent;
export const PUBLIC_ORDER_ENDPOINTS = Object.freeze({
  create: "/public-orders",
  lookup: "/public-orders/lookup",
  tracking: (number) => `/public-orders/${encode(number)}/tracking`,
  items: (number) => `/public-orders/${encode(number)}/items`,
  cancellation: (number) => `/public-orders/${encode(number)}/cancellation-request`,
  receive: (number) => `/public-orders/${encode(number)}/receive`,
  reviews: (number) => `/public-orders/${encode(number)}/reviews`,
  accessSessions: "/customer-access-sessions",
  history: "/customer/orders",
});
export const customerOrdersApi = {
  checkout: async (body, key) => unwrapData(await v1Client.post(PUBLIC_ORDER_ENDPOINTS.create, body, { headers: operationHeaders({ idempotencyKey: key }) })),
  lookup: async (body) => unwrapData(await v1Client.post(PUBLIC_ORDER_ENDPOINTS.lookup, body)),
  tracking: async (number, token) => unwrapData(await v1Client.get(PUBLIC_ORDER_ENDPOINTS.tracking(number), { headers: readHeaders(token) })),
  addItems: async (number, body, token, key) => unwrapData(await v1Client.post(PUBLIC_ORDER_ENDPOINTS.items(number), body, { headers: actionHeaders(token, key) })),
  cancel: async (number, body, token, key) => unwrapData(await v1Client.post(PUBLIC_ORDER_ENDPOINTS.cancellation(number), body, { headers: actionHeaders(token, key) })),
  receive: async (number, body, token, key) => unwrapData(await v1Client.post(PUBLIC_ORDER_ENDPOINTS.receive(number), body, { headers: actionHeaders(token, key) })),
  review: async (number, body, token, key) => unwrapData(await v1Client.post(PUBLIC_ORDER_ENDPOINTS.reviews(number), body, { headers: actionHeaders(token, key) })),
  createAccessSession: async (body, key) => unwrapData(await v1Client.post(PUBLIC_ORDER_ENDPOINTS.accessSessions, body, { headers: operationHeaders({ idempotencyKey: key }) })),
  history: async (params, sessionToken) => unwrapData(await v1Client.get(PUBLIC_ORDER_ENDPOINTS.history, { params: normalizePageParams(params), headers: { "X-Customer-Session": sessionToken } })),
};
