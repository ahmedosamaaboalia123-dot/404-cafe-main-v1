const STORAGE_KEY = "404_customer_orders_v2";

/**
 * Get all customer orders from localStorage.
 * No fake/demo seed data: an empty list is returned until a real order is saved.
 * Never clears client-side order data and never re-seeds demo orders.
 */
export function getCustomerOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error("Error reading customer orders:", err);
    return [];
  }
}

/**
 * Get single order by ID
 */
export function getCustomerOrderById(orderId) {
  const orders = getCustomerOrders();
  return (
    orders.find(
      (o) =>
        String(o.id).toLowerCase() === String(orderId).toLowerCase() ||
        String(o.orderNumber).toLowerCase() === String(orderId).toLowerCase()
    ) || null
  );
}

/**
 * Add a new order from cart / checkout
 */
export function saveCustomerOrder({
  items = [],
  customerInfo = {},
  paymentMethod = "cash",
  orderType = "online_pickup",
  branch = "فرع إيتاي البارود - البحيرة (شارع الجمهورية)",
}) {
  const currentOrders = getCustomerOrders();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderId = `ORD-404-${randomSuffix}`;
  const now = new Date();
  
  // Format Arabic Time
  const timeFormatter = new Intl.DateTimeFormat("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateFormatted = `اليوم، ${timeFormatter.format(now)}`;
  const timeNowStr = timeFormatter.format(now);

  const subtotal = items.reduce(
    (sum, it) => sum + (it.unitPrice || it.price || 0) * (it.quantity || 1),
    0
  );
  const deliveryFee = 0;
  const serviceFee = 10;
  const vat = +(subtotal * 0.14).toFixed(2);
  const discount = 0;
  const total = +(subtotal + deliveryFee + serviceFee + vat - discount).toFixed(2);

  const newOrder = {
    id: orderId,
    orderNumber: String(randomSuffix),
    createdAt: now.toISOString(),
    dateFormatted,
    status: "in_progress",
    statusText: "جاري العمل عليه",
    statusStep: 2, // 1: تأكيد الطلب, 2: جاري العمل عليه, 3: تم الانتهاء, 4: تم التسليم
    orderType: orderType || "online_pickup",
    orderTypeText:
      orderType === "delivery"
        ? "توصيل للمنزل"
        : orderType === "takeaway"
        ? "تيك أواي (Takeaway)"
        : "أونلاين - استلام من الفرع",
    branch: branch || "فرع إيتاي البارود - البحيرة (شارع الجمهورية)",
    paymentMethod: paymentMethod || "cash",
    paymentMethodText:
      paymentMethod === "visa"
        ? "بطاقة بنكية (فيزا / ماستركارد)"
        : paymentMethod === "vodafone_cash"
        ? "محفظة إلكترونية (فودافون كاش)"
        : "الدفع عند الاستلام (كاش)",
    paymentStatus: paymentMethod === "cash" ? "pending" : "paid",
    paymentStatusText:
      paymentMethod === "cash" ? "قيد التحصيل عند الاستلام" : "مدفوع بالكامل",
    estimatedTime: "10-15 دقيقة",
    timeline: [
      {
        id: 1,
        title: "تأكيد الطلب",
        subtitle: "تم استلام الطلب وتأكيده بنجاح من النظام",
        time: timeNowStr,
        completed: true,
        active: false,
      },
      {
        id: 2,
        title: "جاري العمل عليه",
        subtitle: "الباريستا يقوم بتحضير القهوة والطلبات حالياً",
        time: timeNowStr,
        completed: false,
        active: true,
      },
      {
        id: 3,
        title: "تم الانتهاء",
        subtitle: "الطلب جاهز للاستلام والتسليم على الكاونتر",
        time: "متوقع قريباً",
        completed: false,
        active: false,
      },
      {
        id: 4,
        title: "تم التسليم",
        subtitle: "تم تسليم الطلب بالكامل للعميل",
        time: "--",
        completed: false,
        active: false,
      },
    ],
    customerInfo: {
      name: customerInfo.name || "",
      phone: customerInfo.phone || "",
      address:
        customerInfo.address ||
        (orderType === "delivery" ? "عنوان التوصيل" : "استلام من الفرع"),
      notes: customerInfo.notes || "",
    },
    items: items.map((it, idx) => ({
      id: it.id || `item-${idx}`,
      name: it.name,
      englishName: it.englishName || "",
      image:
        it.image ||
        "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80",
      price: it.price || 0,
      quantity: it.quantity || 1,
      isReady: idx === 0 && items.length > 1 ? true : false, // First item ready if multiple items
      readyTime: idx === 0 && items.length > 1 ? timeNowStr : null,
      customizations: it.customizations || {
        size: it.size || "عادي",
        sugar: it.sugar || "مضبوط",
        milk: it.milk || "عادي",
        addons: it.addons || [],
        notes: it.notes || "",
      },
      unitPrice: it.unitPrice || it.price || 0,
      totalPrice: (it.unitPrice || it.price || 0) * (it.quantity || 1),
    })),
    pricing: {
      subtotal,
      deliveryFee,
      serviceFee,
      vat,
      discount,
      total,
    },
  };

  const updatedOrders = [newOrder, ...currentOrders];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
  } catch (e) {
    console.error("Error saving new order:", e);
  }

  return newOrder;
}

/**
 * Persist a REAL backend order (created via the public API) into the same
 * local list so "My Orders / Tracking" can reflect actual server orders.
 * Old demo/local orders are preserved and never deleted.
 */
export function saveBackendOrder({ orderNumber = "", trackingToken = "", phone = "", name = "", fulfillmentType = "", total = 0, status = "PENDING", statusText = "جاري التحضير", items = [] }) {
  const currentOrders = getCustomerOrders();
  const dedup = currentOrders.filter(
    (o) => String(o.orderNumber || o.id || "").toLowerCase() !== String(orderNumber).toLowerCase()
  );
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });

  const newOrder = {
    id: String(orderNumber),
    orderNumber: String(orderNumber),
    backend: true,
    trackingToken,
    createdAt: now.toISOString(),
    dateFormatted: `اليوم، ${timeFormatter.format(now)}`,
    status,
    statusText,
    statusStep: status === "PENDING" ? 1 : 2,
    orderType: fulfillmentType === "DELIVERY" ? "delivery" : "online_pickup",
    orderTypeText: fulfillmentType === "DELIVERY" ? "توصيل للمنزل" : "تيك أواي (استلام من الفرع)",
    branch: "فرع إيتاي البارود - البحيرة (شارع الجمهورية)",
    paymentMethod: "cash",
    paymentStatus: "pending",
    customerInfo: { name: name || "", phone: phone || "" },
    items: (Array.isArray(items) ? items : []).map((it, idx) => ({
      id: it.id || `item-${idx}`,
      name: it.name || it.product?.name || `منتج ${idx + 1}`,
      englishName: it.englishName || "",
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice ?? it.price ?? 0,
      totalPrice: it.totalPrice ?? (it.unitPrice ?? it.price ?? 0) * (it.quantity || 1),
      isReady: false,
    })),
    pricing: { subtotal: Number(total) || 0, deliveryFee: 0, serviceFee: 0, vat: 0, discount: 0, total: Number(total) || 0 },
  };

  const updatedOrders = [newOrder, ...dedup];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
  } catch (e) {
    console.error("Error saving backend order:", e);
  }
  return newOrder;
}

/**
 * Toggle item readiness status (optional demo helper)
 */
export function toggleItemReadiness(orderId, itemId) {
  const currentOrders = getCustomerOrders();
  const updated = currentOrders.map((ord) => {
    if (ord.id === orderId || ord.orderNumber === orderId) {
      const updatedItems = ord.items.map((it) => {
        if (it.id === itemId) {
          const newReady = !it.isReady;
          return {
            ...it,
            isReady: newReady,
            readyTime: newReady
              ? new Intl.DateTimeFormat("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }).format(new Date())
              : null,
          };
        }
        return it;
      });

      const allReady = updatedItems.every((it) => it.isReady);
      const someReady = updatedItems.some((it) => it.isReady);

      let newStatus = ord.status;
      let newStatusText = ord.statusText;
      let newStep = ord.statusStep;

      if (allReady && ord.status !== "completed") {
        newStatus = "ready";
        newStatusText = "تم الانتهاء (جاهز للاستلام)";
        newStep = 3;
      } else if (someReady && ord.status !== "completed") {
        newStatus = "in_progress";
        newStatusText = "جاري العمل عليه";
        newStep = 2;
      }

      return {
        ...ord,
        items: updatedItems,
        status: newStatus,
        statusText: newStatusText,
        statusStep: newStep,
      };
    }
    return ord;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating item readiness:", e);
  }

  return updated.find((o) => o.id === orderId || o.orderNumber === orderId) || null;
}

const TRACK_STATUS_LABELS = {
  PENDING: "جاري التحضير",
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  IN_PROGRESS: "جاري التحضير",
  READY: "جاهز",
  ASSIGNED_TO_DELEGATE: "في الطريق للتوصيل",
  OUT_FOR_DELIVERY: "في الطريق للتوصيل",
  DELIVERED: "تم التسليم",
  COMPLETED: "تم التسليم",
  CANCELLED: "ملغي",
};

const trackStatusLabel = (status) =>
  TRACK_STATUS_LABELS[String(status || "").toUpperCase()] || "جاري التحضير";

const paymentTextOf = (paymentStatus = "") => {
  const status = String(paymentStatus || "").toUpperCase();
  if (["PAID", "COLLECTED", "SETTLED"].includes(status)) {
    return { paymentMethodText: "الدفع عند الاستلام (كاش)", paymentStatusText: "مدفوع بالكامل" };
  }
  return { paymentMethodText: "الدفع عند الاستلام (كاش)", paymentStatusText: "قيد التحصيل عند الاستلام" };
};

/**
 * Normalize a REAL backend order/tracking/history payload (public-orders) into the
 * client shape used by the tracking page, order cards and the printable invoice.
 * Safe for PENDING/CONFIRMED/PREPARING/READY/OUT_FOR_DELIVERY/DELIVERED/COMPLETED.
 */
export function normalizeTrackedOrder(remote = {}) {
  const customer = remote.customer || {};
  const totals = remote.totals || remote.pricing || {};
  const createdAt = remote.createdAt || new Date().toISOString();
  const fulfillmentType = String(remote.fulfillmentType || "").toUpperCase();
  const paymentInfo = paymentTextOf(remote.paymentStatus);
  const status = String(remote.status || "PENDING").toLowerCase();
  const statusStep =
    ["completed", "delivered"].includes(status) ? 4
    : ["ready", "assigned_to_delegate", "out_for_delivery"].includes(status) ? 3
    : ["confirmed", "preparing", "in_progress", "pending"].includes(status) ? 2
    : status === "cancelled" ? 0
    : 2;
  const orderNumber = String(remote.orderNumber || remote.publicOrderNumber || remote.id || "");

  return {
    ...remote,
    id: orderNumber,
    orderNumber,
    status,
    statusText: trackStatusLabel(status),
    statusStep,
    createdAt,
    dateFormatted: new Date(createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }),
    orderTypeText:
      fulfillmentType === "DELIVERY"
        ? "توصيل للمنزل"
        : fulfillmentType === "TAKEAWAY"
        ? "تيك أواي (استلام من الفرع)"
        : "استلام من الفرع",
    customerInfo: {
      name: customer.name || remote.customerName || "",
      phone: customer.phone || remote.customerPhone || "",
      address: customer.address || remote.customerAddress || "",
      notes: customer.notes || "",
    },
    paymentMethodText: paymentInfo.paymentMethodText,
    paymentStatusText: paymentInfo.paymentStatusText,
    items: (Array.isArray(remote.items) ? remote.items : []).map((it, idx) => ({
      id: it.id ?? `item-${idx}`,
      name: it.name || (it.product && it.product.name) || `صنف ${idx + 1}`,
      englishName: it.englishName || "",
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice || it.price || 0),
      totalPrice: Number(
        it.totalPrice ?? (it.unitPrice || it.price || 0) * (Number(it.quantity) || 1)
      ),
      status: it.status,
      sizeName: it.sizeName || "",
      typeName: it.typeName || "",
      notes: it.notes || "",
      customizations: {
        size: it.sizeName || it.size || "",
        type: it.typeName || it.type || "",
        ...(it.notes || it.customizations?.notes
          ? { notes: it.notes || it.customizations?.notes }
          : {}),
      },
    })),
    pricing: {
      subtotal: Number(totals.subtotal ?? totals.itemsTotal ?? 0),
      serviceFee: Number(totals.serviceFee || 0),
      deliveryFee: Number(totals.deliveryFee || 0),
      vat: Number(totals.tax ?? totals.vat ?? 0),
      discount: Number(totals.discount || 0),
      total: Number(totals.total ?? remote.total ?? 0),
    },
  };
}
