import apiClient from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80";
const unwrap = (response) => response?.data ?? response;
const makeIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const tableHeaders = (tableToken, idempotencyKey) => ({
  headers: {
    ...(tableToken ? { "X-Table-Token": tableToken } : {}),
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  },
});

// The order endpoints validate 24-hex ids, so never forward a display label
// (size name / addon name) as an id: that would fail as a confusing 422.
const OBJECT_ID = /^[a-f\d]{24}$/i;
const asObjectId = (...candidates) => {
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (OBJECT_ID.test(text)) return text;
  }
  return null;
};
const productIdOf = (item) => asObjectId(item?.originalId, item?.productId, item?.id);
const sizeIdOf = (item) =>
  asObjectId(
    item?.productSizeId,
    item?.customizations?.sizeId,
    item?.customizations?.size?.productSizeId,
    item?.customizations?.size?.id
  );
const addonIdsOf = (item) => {
  const addons = item?.customizations?.addons || item?.addons || [];
  return [...new Set(addons.map((addon) => asObjectId(addon?.productAddonId, addon?.id, addon?._id, addon)).filter(Boolean))];
};

// Map backend status to the lowercase statuses the table UI already understands.
const toUiStatus = (status = "") => {
  const s = String(status || "").toUpperCase();
  if (["READY"].includes(s)) return "ready";
  if (["COMPLETED", "DELIVERED"].includes(s)) return "completed";
  if (["CANCELLED"].includes(s)) return "cancelled";
  return "in_progress"; // PENDING / CONFIRMED / PREPARING / any future cooking state
};

const statusTextOf = (status = "") => {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "READY": return "جاهز للتسليم";
    case "COMPLETED":
    case "DELIVERED": return "تم التسليم";
    case "CANCELLED": return "تم الإلغاء";
    case "PENDING": return "في انتظار التأكيد";
    case "CONFIRMED": return "تم تأكيد الطلب";
    default: return "جاري التحضير في البار";
  }
};

const itemIsReady = (item = {}) => {
  const st = String(item?.isReady || item?.status || "").toUpperCase();
  return item?.isReady === true || st === "READY";
};

/**
 * Maps the guest order DTO (GET /v1/table-experience/active-order — nested
 * `totals`, `productName`, `unitSellingPrice`) onto the flat shape the table
 * components already consume, then normalizes status/display fields.
 */
export function toTableOrderShape(order) {
  if (!order || typeof order !== "object") return order;
  if (order.__tableNormalized) return order;
  const totals = order.totals ?? {};
  const items = (order.items ?? []).map((it) => ({
    ...it,
    name: it.name || it.productName,
    product: it.product || (it.productName ? { name: it.productName } : null),
    unitPrice: it.unitPrice ?? it.unitSellingPrice,
    totalPrice: it.totalPrice ?? it.lineSubtotal,
    addonsText: it.addonsText ?? (Array.isArray(it.addons) && it.addons.length ? it.addons.join("، ") : ""),
  }));
  return {
    ...order,
    items,
    subtotal: totals.subtotal ?? order.subtotal,
    discount: totals.discount ?? order.discount,
    tax: totals.tax ?? order.tax,
    total: totals.total ?? order.total,
  };
}

/**
 * Converts a backend table order into the shape the existing table components
 * consume (pricing, item.name, lowercase status, dateFormatted, tableNumber,
 * orderTypeText, ...). Leaves data that is already in the local/demo shape
 * untouched.
 */
export function normalizeBackendTableOrder(order) {
  if (!order || typeof order !== "object") return order;
  // Already normalized / local shape (has display fields we populated).
  if (order.__tableNormalized) return order;

  const backendItemShaped =
    Array.isArray(order.items) &&
    order.items.some((it) => it && it.product && it.product.name);

  // Not a backend order -> return as-is if it already looks local.
  if (!backendItemShaped && (order.pricing || (Array.isArray(order.items) && order.items.some((it) => it && it.name)))) {
    return { ...order, __tableNormalized: true };
  }

  const itemsSubtotal = (order.items || []).reduce(
    (sum, it) => sum + Number(it.totalPrice || (Number(itemUnitPriceOf(it)) * Number(it.quantity || 1))),
    0
  );
  // Prefer the authoritative backend totals when it sent them.
  const subtotal = order.subtotal != null ? Number(order.subtotal) : itemsSubtotal;
  const total = order.total != null ? Number(order.total) : subtotal;
  // Without a backend breakdown, attribute the difference to VAT as a transparent
  // line so the total row always matches the authoritative backend total.
  const vat = order.tax != null ? Number(order.tax) : Math.max(0, Number((total - subtotal).toFixed(2)));
  const serviceFee = 0;
  const discount = Number(order.discount || 0);

  const items = (order.items || []).map((it, idx) => {
    const product = it.product || {};
    const productSize = it.productSize || {};
    const qty = Number(it.quantity || 1);
    const totalPrice = Number(it.totalPrice || it.price);
    const unitPrice = Number(it.unitPrice) || (qty ? Number((totalPrice / qty).toFixed(2)) : it.price || 0);
    const name = it.name || product.name || `صنف ${idx + 1}`;
    const uiStatus = it.status ? toUiStatus(it.status) : "in_progress";
    return {
      id: it.id,
      name,
      englishName: it.englishName || "",
      image: it.image || product.image || FALLBACK_IMAGE,
      price: unitPrice,
      unitPrice,
      quantity: qty,
      totalPrice: totalPrice || unitPrice * qty,
      isReady: itemIsReady(it),
      status: uiStatus,
      sizeName: it.sizeName || productSize.name || "",
      typeName: it.typeName || "",
      addonsText: it.addonsText || "",
      notes: it.notes || "",
      product: product,
    };
  });

  const uiStatus = toUiStatus(order.status);
  const tableNumber = parseInt(order.table ?? order.tableNumber, 10) || 4;

  return {
    __tableNormalized: true,
    id: order.id,
    orderNumber: order.orderNumber,
    trackingToken: order.trackingToken,
    tableNumber,
    table: order.table || String(tableNumber),
    tableSection:
      tableNumber < 8
        ? "الصالة الداخلية - الطابق الأرضي"
        : "التراس الخارجي",
    status: uiStatus,
    statusText: statusTextOf(order.status),
    statusStep: uiStatus === "ready" ? 3 : uiStatus === "completed" ? 4 : 1,
    orderType: "dine_in",
    orderTypeText: "تناول داخل الكافيه (طاولة)",
    fulfillmentType: order.fulfillmentType || "DINE_IN",
    waiterName: "كابتن الصالة",
    paymentMethod: "cash",
    paymentMethodText: "دفع نقدي (كاش) عند الطاولة",
    paymentStatus: order.paymentStatus || "pending",
    paymentStatusText: order.paymentStatusText || "قيد التحصيل",
    estimatedTime: "5-10 دقائق",
    branch: "فرع إيتاي البارود - البحيرة",
    createdAt: order.createdAt,
    timeoutAt: null,
    dateFormatted: formatDate(order.createdAt),
    timeline: [],
    customerInfo: {
      name: order.customerName || `عميل طاولة ${tableNumber}`,
      phone: order.phone || "",
      address: "",
      notes: order.notes || "",
    },
    items,
    pricing: { subtotal, serviceFee, vat, discount, total },
  };
}

function itemUnitPriceOf(it = {}) {
  return Number(it.unitPrice || it.price || 0);
}

function formatDate(value) {
  try {
    const d = value ? new Date(value) : new Date();
    return new Intl.DateTimeFormat("ar-EG", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

export async function requestTableService({ tableNumber, type = "WAITER", reason, tableToken }) {
  const payload = { type, reason };
  return unwrap(await apiClient.post(endpoints.tableSessions.serviceRequests(tableNumber), payload, tableHeaders(tableToken, makeIdempotencyKey())));
}

export async function getTableSession(tableNumber, tableToken) {
  return unwrap(await apiClient.get(endpoints.tableSessions.byTable(tableNumber), tableHeaders(tableToken)));
}

export async function createTableOrder({ tableNumber, items, tableToken }, idempotencyKey = makeIdempotencyKey()) {
  const payload = {
    items: items.map((item) => ({
      productId: productIdOf(item),
      productSizeId: sizeIdOf(item),
      typeName: item.customizations?.type || item.typeName || item.type,
      addonIds: addonIdsOf(item),
      quantity: Number(item.quantity) || 1,
      notes: item.customizations?.notes || item.notes || "",
    })),
  };
  return unwrap(await apiClient.post(endpoints.tableSessions.orders(tableNumber), payload, tableHeaders(tableToken, idempotencyKey)));
}

/**
 * The live order of the table the token is bound to. Returns null when the table
 * has no order yet — the token, not the table number, decides which table is
 * read, so the URL table number stays a display-only argument.
 */
export async function getActiveTableOrder(tableNumber, tableToken) {
  if (!tableToken) return null;
  const payload = unwrap(await apiClient.get(endpoints.v1.tableGuest.activeOrder, v1GuestHeaders(tableToken)));
  const order = payload?.order ?? null;
  if (!order) return null;
  return normalizeBackendTableOrder(
    toTableOrderShape({ ...order, table: order.table ?? order.tableNumber ?? tableNumber })
  );
}

export function isTableApiEnabled() {
  return true;
}

// ---------------------------------------------------------------------------
// v2 backend contract (/api/v1/table-experience). Guest token flows with the
// X-Table-Token header. Old functions above stay untouched.
// ---------------------------------------------------------------------------
const v1GuestHeaders = (tableToken, idempotencyKey) => ({
  headers: {
    ...(tableToken ? { "X-Table-Token": tableToken } : {}),
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  },
});

export async function bootstrapV1TableGuest({ tableNumber }) {
  const payload = await apiClient.post(endpoints.v1.tableGuest.bootstrap, {
    tableNumber: Number(tableNumber),
  });
  return unwrap(payload);
}

export async function submitV1TableProposal(items, tableToken) {
  const payload = await apiClient.post(
    endpoints.v1.tableGuest.proposals,
    {
      items: items.map((item) => ({
        productId: productIdOf(item),
        productSizeId: sizeIdOf(item),
        addonIds: addonIdsOf(item),
        quantity: Number(item.quantity) || 1,
        notes: item.customizations?.notes || item.notes || "",
      })),
    },
    v1GuestHeaders(tableToken, makeIdempotencyKey())
  );
  return unwrap(payload);
}

export async function getV1CurrentProposal(tableToken) {
  return unwrap(
    await apiClient.get(endpoints.v1.tableGuest.currentProposal, v1GuestHeaders(tableToken))
  );
}

export async function cancelV1CurrentProposal(tableToken) {
  return unwrap(
    await apiClient.post(
      endpoints.v1.tableGuest.cancelProposal,
      {},
      v1GuestHeaders(tableToken, makeIdempotencyKey())
    )
  );
}

export async function createV1TableService({ type, details, requestedQuantity }, tableToken) {
  return unwrap(
    await apiClient.post(
      endpoints.v1.tableGuest.services,
      { type, details, requestedQuantity },
      v1GuestHeaders(tableToken, makeIdempotencyKey())
    )
  );
}

export async function cancelV1TableService(serviceId, tableToken) {
  return unwrap(
    await apiClient.post(
      endpoints.v1.tableGuest.cancelService(serviceId),
      {},
      v1GuestHeaders(tableToken, makeIdempotencyKey())
    )
  );
}

export async function submitV1TableReview(orderId, tableToken, { rating, comment, expectedOrderVersion }) {
  return unwrap(
    await apiClient.post(
      endpoints.v1.tableGuest.reviews(orderId),
      { rating, comment, expectedOrderVersion },
      v1GuestHeaders(tableToken, makeIdempotencyKey())
    )
  );
}
