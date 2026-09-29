const STORAGE_KEY = "404_table_orders_v1";
const ACTIVE_TABLE_KEY = "404_active_table_number";

/**
 * Get current saved table number (default 4)
 */
export function getCurrentTableNumber() {
  try {
    const saved = localStorage.getItem(ACTIVE_TABLE_KEY);
    return saved ? parseInt(saved, 10) || 4 : 4;
  } catch {
    return 4;
  }
}

/**
 * Set current table number
 */
export function setCurrentTableNumber(tableNum) {
  try {
    localStorage.setItem(ACTIVE_TABLE_KEY, String(tableNum));
  } catch (e) {
    console.error("Error setting table number", e);
  }
}

/**
 * Get all table orders
 * No fake/demo seed data: an empty list is returned until a real order is saved.
 * Never clears client-side order data and never re-seeds demo orders.
 */
export function getAllTableOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error("Error reading table orders:", err);
    return [];
  }
}

/**
 * Get orders for a specific table
 */
export function getOrdersByTableNumber(tableNum) {
  const all = getAllTableOrders();
  const num = parseInt(tableNum, 10);
  return all.filter((o) => parseInt(o.tableNumber, 10) === num);
}

/**
 * Get the latest active order for a table (status: in_progress, confirmed, or ready)
 */
export function getActiveOrderByTableNumber(tableNum) {
  const orders = getOrdersByTableNumber(tableNum);
  return (
    orders.find((o) =>
      ["confirmed", "in_progress", "ready"].includes(o.status)
    ) || orders[0] || null
  );
}

/**
 * Get single table order by ID
 */
export function getTableOrderById(orderId) {
  const all = getAllTableOrders();
  return (
    all.find(
      (o) =>
        String(o.id).toLowerCase() === String(orderId).toLowerCase() ||
        String(o.orderNumber).toLowerCase() === String(orderId).toLowerCase()
    ) || null
  );
}

/**
 * Save / Create new Table Order (Dine-in)
 */
export function saveTableOrder({
  tableNumber = 4,
  items = [],
  customerInfo = {},
  paymentMethod = "cash",
  notes = "",
}) {
  const currentOrders = getAllTableOrders();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderId = `TBL-404-${randomSuffix}`;
  const now = new Date();

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
  const serviceFee = 15;
  const vat = +(subtotal * 0.14).toFixed(2);
  const discount = 0;
  const total = +(subtotal + serviceFee + vat - discount).toFixed(2);

  const newOrder = {
    id: orderId,
    orderNumber: String(randomSuffix),
    tableNumber: parseInt(tableNumber, 10) || 4,
    tableSection:
      parseInt(tableNumber, 10) < 8
        ? "الصالة الداخلية - الطابق الأرضي"
        : "التراس الخارجي",
    createdAt: now.toISOString(),
    dateFormatted,
    status: "in_progress",
    statusText: "جاري التحضير في البار",
    statusStep: 2, // 1: استلام وتأكيد, 2: جاري التحضير, 3: تم التجهيز, 4: تم التقديم على الطاولة
    orderType: "dine_in",
    orderTypeText: "تناول داخل الكافيه (طاولة)",
    waiterName: "كابتن سيف",
    paymentMethod: paymentMethod || "cash",
    paymentMethodText:
      paymentMethod === "visa"
        ? "بطاقة بنكية (POS عند الطاولة)"
        : paymentMethod === "vodafone_cash"
        ? "محفظة إلكترونية (فودافون كاش)"
        : "دفع نقدي (كاش) عند الطاولة",
    paymentStatus: paymentMethod === "cash" ? "pending" : "paid",
    paymentStatusText: paymentMethod === "cash" ? "قيد التحصيل" : "تم الدفع",
    estimatedTime: "5-10 دقائق",
    timeline: [
      {
        id: 1,
        title: "استلام وتأكيد الطلب",
        subtitle: `تم إرسال الطلب لكاونتر الباريستا لطاولة رقم ${tableNumber}`,
        time: timeNowStr,
        completed: true,
        active: false,
      },
      {
        id: 2,
        title: "جاري التحضير في البار",
        subtitle: "الباريستا يقوم بتحضير الأصناف بعناية وجودة عالية",
        time: timeNowStr,
        completed: false,
        active: true,
      },
      {
        id: 3,
        title: "تم التجهيز",
        subtitle: `المشروبات جاهزة وفي طريقها إلى طاولة رقم ${tableNumber}`,
        time: "متوقع قريباً",
        completed: false,
        active: false,
      },
      {
        id: 4,
        title: "تم التقديم على الطاولة",
        subtitle: `تم تسليم جميع الأصناف على طاولة رقم ${tableNumber} بنجاح`,
        time: "--",
        completed: false,
        active: false,
      },
    ],
    customerInfo: {
      name: customerInfo.name || `عميل طاولة ${tableNumber}`,
      phone: customerInfo.phone || "",
      notes: notes || customerInfo.notes || "",
    },
    items: items.map((it, idx) => ({
      id: it.id || `item-${idx}`,
      name: it.name,
      englishName: it.englishName || "",
      image:
        it.image ||
        "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80",
      price: it.price || 50,
      quantity: it.quantity || 1,
      isReady: idx === 0 && items.length > 1 ? true : false,
      readyTime: idx === 0 && items.length > 1 ? timeNowStr : null,
      customizations: it.customizations || {
        size: it.size || "عادي",
        sugar: it.sugar || "مضبوط",
        milk: it.milk || "عادي",
        addons: it.addons || [],
        notes: it.notes || "",
      },
      unitPrice: it.unitPrice || it.price || 50,
      totalPrice: (it.unitPrice || it.price || 50) * (it.quantity || 1),
    })),
    pricing: {
      subtotal,
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
    console.error("Error saving table order:", e);
  }

  return newOrder;
}

/**
 * Toggle Item Readiness on Table
 */
export function toggleTableItemReadiness(orderId, itemId) {
  const currentOrders = getAllTableOrders();
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
        newStatusText = `جاهز للتسليم على طاولة ${ord.tableNumber}`;
        newStep = 3;
      } else if (someReady && ord.status !== "completed") {
        newStatus = "in_progress";
        newStatusText = "جاري التحضير في البار";
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
  } catch (e) {
    console.error("Error updating item readiness:", e);
  }

  return updated.find((o) => o.id === orderId || o.orderNumber === orderId) || null;
}
