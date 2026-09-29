import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const DELIVERY_ENDPOINTS = Object.freeze({
  screen: "/delegates-screen",
  create: "/delegates",
  delegate: (id) => `/delegates/${encodeURIComponent(id)}`,
  assign: (orderId) => `/orders/${encodeURIComponent(orderId)}/assign-delegate`,
  assignment: (id) => `/delivery-assignments/${encodeURIComponent(id)}`,
  handover: (id) => `/delivery-assignments/${encodeURIComponent(id)}/handover`,
  reassign: (id) => `/delivery-assignments/${encodeURIComponent(id)}/reassign`,
  failed: (id) => `/delivery-assignments/${encodeURIComponent(id)}/failed`,
  returned: (id) => `/delivery-assignments/${encodeURIComponent(id)}/returned`,
  confirm: (id) => `/delivery-assignments/${encodeURIComponent(id)}/admin-confirm-delivery`,
  deliver: (id) => `/delivery-assignments/${encodeURIComponent(id)}/deliver-to-customer`,
  settle: (id) => `/delivery-assignments/${encodeURIComponent(id)}/settle-cash`,
  recordWhatsapp: (id) => `/delivery-assignments/${encodeURIComponent(id)}/whatsapp-share-opened`,
});

const post = async (url, body, key) => unwrapData(await v1Client.post(url, body, { headers: operationHeaders({ idempotencyKey: key }) }));
export const deliveryApi = {
  screen: async (params = {}) => unwrapData(await v1Client.get(DELIVERY_ENDPOINTS.screen, { params: normalizePageParams(params) })),
  createDelegate: (body, key) => post(DELIVERY_ENDPOINTS.create, body, key),
  delegate: async (id, include = "activeOrders,history,cashLedger") => unwrapData(await v1Client.get(DELIVERY_ENDPOINTS.delegate(id), { params: { include } })),
  updateDelegate: async (id, body, key) => unwrapData(await v1Client.patch(DELIVERY_ENDPOINTS.delegate(id), body, { headers: operationHeaders({ idempotencyKey: key }) })),
  assign: (orderId, body, key) => post(DELIVERY_ENDPOINTS.assign(orderId), body, key),
  assignment: async (id) => unwrapData(await v1Client.get(DELIVERY_ENDPOINTS.assignment(id))),
  handover: (id, body, key) => post(DELIVERY_ENDPOINTS.handover(id), body, key),
  reassign: (id, body, key) => post(DELIVERY_ENDPOINTS.reassign(id), body, key),
  failed: (id, body, key) => post(DELIVERY_ENDPOINTS.failed(id), body, key),
  returned: (id, body, key) => post(DELIVERY_ENDPOINTS.returned(id), body, key),
  confirm: (id, body, key) => post(DELIVERY_ENDPOINTS.confirm(id), body, key),
  deliver: (id, body, key) => post(DELIVERY_ENDPOINTS.deliver(id), body, key),
  settle: (id, body, key) => post(DELIVERY_ENDPOINTS.settle(id), body, key),
  recordWhatsapp: (id, body, key) => post(DELIVERY_ENDPOINTS.recordWhatsapp(id), body, key),
};
