import apiClient from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
import { customerOrdersApi } from "@/modules/customer/api/customerOrders.api";
import { customerStorage } from "@/modules/customer/services/customerStorage";
import { getV1Menu } from "@/services/catalogService";
import { normalizeTrackedOrder } from "@/modules/customer/orders/services/customerOrdersService";

export const ORDER_FULFILLMENT = { ONLINE_DELIVERY: "DELIVERY", TAKEAWAY_PICKUP: "TAKEAWAY" };
const makeIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * يحول أصناف السلة (بأشكالها المختلفة) إلى body صالح لعقد الباك الصارم.
 * - يحل المقاس الناقص من أول مقاس في الكتالوج.
 * - يفلتر الإضافات غير الصالحة.
 * - يرمي خطأ عربيًا يسمي المنتج عند تعذر الحل (بدل 400 عام من الباك).
 */
export async function resolveOrderItems(items = []) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) throw new Error("السلة فارغة");
  let menu = null;
  const out = [];
  for (const item of list) {
    const name = item?.name || "المنتج";
    const productId = String(item?.originalId || item?.productId || item?.id || "");
    if (!OBJECT_ID.test(productId)) throw new Error(`بيانات غير صالحة للمنتج: ${name}`);
    let sizeId = String(item?.productSizeId || item?.customizations?.sizeId || "");
    if (!OBJECT_ID.test(sizeId)) {
      if (!menu) {
        try {
          menu = await getV1Menu();
        } catch {
          menu = { items: [] };
        }
      }
      if (!menu?.fromBackend) throw new Error("تعذر تحميل المنيو، حاول مجددًا");
      const product = (menu.items || []).find((p) => String(p?.id) === productId);
      if (!product) throw new Error(`اختر المقاس لمنتج: ${name}`);
      const fallback = product?.sizes?.[0];
      sizeId = String(fallback?.id || fallback?.productSizeId || "");
      if (!OBJECT_ID.test(sizeId)) throw new Error(`منتج "${name}" بدون مقاس مسجل — تواصل مع إدارة الكافيه`);
    }
    const addonIds = (item?.customizations?.addons || item?.addons || [])
      .map((addon) => String(addon?.id || addon?.productAddonId || addon))
      .filter((value) => OBJECT_ID.test(value));
    const quantity = Math.max(1, Math.min(100, Number(item?.quantity) || 1));
    const notes = String(item?.customizations?.notes || item?.notes || "").trim().slice(0, 500);
    out.push({
      productId,
      productSizeId: sizeId,
      quantity,
      ...(addonIds.length ? { addonIds } : {}),
      ...(notes ? { notes } : {}),
    });
  }
  return out;
}

export function buildPublicOrderPayload({ fulfillmentType, customer, items }) {
  const deliveryAddress = fulfillmentType === "DELIVERY" ? {
    city: customer.city?.trim(), area: customer.area?.trim(), street: customer.street?.trim(),
    building: customer.building?.trim(), floor: customer.floor?.trim(), landmark: customer.landmark?.trim(),
  } : null;
  return { channel: "CUSTOMER_WEB", fulfillmentType, customer: { name: customer.name.trim(), phone: customer.phone.trim() }, deliveryAddress, items: (items || []).map((item) => ({ productId: String(item.originalId || item.productId || item.id), productSizeId: String(item.productSizeId || item.customizations?.sizeId), quantity: Number(item.quantity) || 1 })) };
}

export async function createPublicOrder(input, idempotencyKey = makeIdempotencyKey()) {
  const payload = await apiClient.post(endpoints.publicOrders.create, buildPublicOrderPayload(input), {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  // apiClient unwraps response.data -> { success, data }; return the real order.
  return payload?.data ?? payload;
}
export const isPublicOrdersApiEnabled = () => true;
export async function getPublicOrderTracking(code, token) {
  const access = customerStorage.getOrderAccess(code);
  return normalizeTrackedOrder(await customerOrdersApi.tracking(code, token || access?.trackingReadToken));
}

// Look up an order for customer tracking by order number + phone (manual search).
// The backend returns a SAFE projection: no ingredients/cost, no trackingToken.
// `response` is already response.data (axios interceptor) -> { success, data }.
export async function lookupOrderByPhone({ orderNumber, phone }) {
  return normalizeTrackedOrder(await customerOrdersApi.lookup({ orderNumber: String(orderNumber || "").trim(), phone: String(phone || "").trim() }));
}

// List the customer's real orders from the backend by phone (safe projection).
// Used by the "My Orders" page so it shows live server data, not stale local copies.
export async function listMyOrdersByPhone(phone) {
  const payload = await apiClient.get(endpoints.publicOrders.byPhone, {
    params: { phone: String(phone || "").trim() },
  });
  return Array.isArray(payload?.data) ? payload.data : [];
}

// ---------------------------------------------------------------------------
// v2 backend contract (/api/v1/public-orders). Same cart item shape in,
// v2 tracking object out. Old functions above stay untouched.
// ---------------------------------------------------------------------------
const normalizeV1Item = (item) => ({
  productId: String(item.originalId || item.productId || item.id),
  productSizeId: String(item.productSizeId || item.customizations?.sizeId),
  quantity: Number(item.quantity) || 1,
  ...(item.customizations?.addons?.length || item.addons?.length
    ? {
        addonIds: (item.customizations?.addons || item.addons || []).map((addon) =>
          String(addon.id || addon.productAddonId || addon)
        ),
      }
    : {}),
  ...((item.customizations?.notes || item.notes) && {
    notes: item.customizations?.notes || item.notes,
  }),
});

export async function createV1PublicOrder(
  { fulfillmentType, customer, items, address },
  idempotencyKey = makeIdempotencyKey()
) {
  const payload = await apiClient.post(
    endpoints.v1.publicOrders.create,
    {
      fulfillmentType,
      customer: {
        name: String(customer.name || "").trim(),
        phone: String(customer.phone || "").trim(),
        ...(address ? { address: String(address) } : {}),
      },
      items: items.map(normalizeV1Item),
    },
    { headers: { "Idempotency-Key": idempotencyKey } }
  );
  return payload?.data ?? payload;
}

export const normalizeCustomerAddress = (customer = {}) => [customer.city, customer.area, customer.street, customer.building && `مبنى ${customer.building}`, customer.floor, customer.landmark].filter(Boolean).join("، ");

const v1TrackingHeaders = (readToken) => ({
  headers: readToken ? { "X-Tracking-Read-Token": readToken } : {},
});

const v1ActionHeaders = (actionToken, idempotencyKey) => ({
  headers: {
    ...(actionToken ? { "X-Order-Action-Token": actionToken } : {}),
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  },
});

export async function getV1OrderTracking(orderNumber, readToken) {
  return customerOrdersApi.tracking(orderNumber, readToken);
}

export async function lookupV1Order({ orderNumber, phone }) {
  return customerOrdersApi.lookup({ orderNumber: String(orderNumber || "").trim(), phone: String(phone || "").trim() });
}

export async function addV1OrderItems(orderNumber, actionToken, { items, expectedVersion }) {
  const payload = await apiClient.post(
    endpoints.v1.publicOrders.items(orderNumber),
    { items: items.map(normalizeV1Item), expectedVersion },
    v1ActionHeaders(actionToken, makeIdempotencyKey())
  );
  return payload?.data ?? payload;
}

export async function requestV1OrderCancellation(orderNumber, actionToken, { reason, expectedVersion }) {
  const payload = await apiClient.post(
    endpoints.v1.publicOrders.cancel(orderNumber),
    { reason, expectedVersion },
    v1ActionHeaders(actionToken, makeIdempotencyKey())
  );
  return payload?.data ?? payload;
}

export async function confirmV1OrderReceipt(orderNumber, actionToken, expectedVersion) {
  const payload = await apiClient.post(
    endpoints.v1.publicOrders.receive(orderNumber),
    { expectedVersion },
    v1ActionHeaders(actionToken, makeIdempotencyKey())
  );
  return payload?.data ?? payload;
}

export async function submitV1PublicReview(orderNumber, actionToken, body) { return customerOrdersApi.review(orderNumber, body, actionToken, makeIdempotencyKey()); }
export async function createV1CustomerAccessSession(orderNumber, orderActionToken) { const result = await customerOrdersApi.createAccessSession({ orderNumber, orderActionToken }, makeIdempotencyKey()); customerStorage.saveAccessSession(result); return result; }
export async function listV1CustomerHistory(page = 1) { const session = customerStorage.loadAccessSession(); if (!session?.customerAccessToken) return { items: [], pageMeta: {} }; return customerOrdersApi.history({ page, limit: 10 }, session.customerAccessToken); }
