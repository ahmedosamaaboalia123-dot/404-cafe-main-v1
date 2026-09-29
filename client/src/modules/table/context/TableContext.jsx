import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCurrentTableNumber,
  setCurrentTableNumber,
  getActiveOrderByTableNumber,
  getOrdersByTableNumber,
} from "../services/tableOrdersService";
import { bootstrapV1TableGuest, cancelV1CurrentProposal, createV1TableService, getV1CurrentProposal, submitV1TableProposal } from "../services/tableGateway";
import { tableSessionStorage } from "../services/tableSessionStorage";
import { createTrackingSocket } from "@/services/realtime";

const TableContext = createContext(null);

export function TableProvider({ children }) {
  const params = useParams();
  const navigate = useNavigate();

  // Active table number (from param or saved)
  const [tableNumber, setTableNumberState] = useState(() => {
    if (params.tableId && !isNaN(parseInt(params.tableId, 10))) {
      return parseInt(params.tableId, 10);
    }
    return null;
  });

  const [guestAccess, setGuestAccess] = useState(() => params.tableId ? tableSessionStorage.read(params.tableId) : null);
  const tableToken = guestAccess?.tableToken || "";
  const [currentProposal, setCurrentProposal] = useState(null);
  const [accessError, setAccessError] = useState("");

  const [activeOrder, setActiveOrder] = useState(null);
  const [tableOrders, setTableOrders] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
  const refreshInFlight = useRef(null);

  // Table Cart State
  const [tableCart, setTableCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`404_table_cart_${tableNumber}`) || "[]");
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync with URL params if tableId changes
  useEffect(() => {
    if (params.tableId && !isNaN(parseInt(params.tableId, 10))) {
      const pNum = parseInt(params.tableId, 10);
      if (pNum !== tableNumber) {
        setTableNumberState(pNum);
        setCurrentTableNumber(pNum);
      }
    }
  }, [params.tableId]);

  useEffect(() => { if (!params.tableId) return; const stored = tableSessionStorage.read(params.tableId); if (stored) { setGuestAccess(stored); return; } bootstrapV1TableGuest({ tableNumber: Number(params.tableId) }).then((value) => { tableSessionStorage.save(params.tableId, value); setGuestAccess(value); setAccessError(""); }).catch((e) => setAccessError(e?.response?.data?.error?.messageAr || e.message)); }, [params.tableId]);

  // Load orders for current table — real backend + local fallback
  const refreshTableData = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const task = (async () => {
    const orders = getOrdersByTableNumber(tableNumber);
    setTableOrders(orders);
    const localActive = getActiveOrderByTableNumber(tableNumber);
    setActiveOrder(localActive);
    if (tableToken) {
      try { const result = await getV1CurrentProposal(tableToken); setCurrentProposal(result?.proposal || null); } catch { setCurrentProposal(null); }
      // Try to load real active order for this table (automatic tableNumber)
      try {
        const { getActiveTableOrder } = await import("../services/tableGateway");
        const real = await getActiveTableOrder(tableNumber, tableToken);
        if (real && real.id) {
          // Backend order has real status + tableNumber; use it as source of truth
          setActiveOrder((prev) => {
            const merged = { ...prev, ...real, tableNumber: real.tableNumber || tableNumber };
            return merged;
          });
          setTableOrders((prev) => {
            const exists = prev.some((o) => String(o.id) === String(real.id));
            if (exists) return prev.map((o) => String(o.id) === String(real.id) ? { ...o, ...real } : o);
            return [real, ...prev];
          });
        }
      } catch {}
    }
    })();
    refreshInFlight.current = task;
    try {
      return await task;
    } finally {
      refreshInFlight.current = null;
    }
  }, [tableNumber, tableToken]);

  useEffect(() => {
    refreshTableData();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshTableData();
    };
    const intervalId = window.setInterval(refreshWhenVisible, 60000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [tableNumber, refreshTableData]);

  useEffect(() => {
    const trackingToken = activeOrder?.trackingToken;
    if (!trackingToken) return undefined;
    const socket = createTrackingSocket(trackingToken);
    const handleOrderUpdate = (payload) => {
      const updated = payload?.order;
      if (!updated || String(updated.id) !== String(activeOrder.id)) return;
      setActiveOrder(updated);
      setTableOrders((current) => [updated, ...current.filter((order) => String(order.id) !== String(updated.id))]);
    };
    socket.on("order:updated", handleOrderUpdate);
    return () => {
      socket.off("order:updated", handleOrderUpdate);
      socket.disconnect();
    };
  }, [activeOrder?.id, activeOrder?.trackingToken]);

  useEffect(() => {
    try {
      localStorage.setItem(`404_table_cart_${tableNumber}`, JSON.stringify(tableCart));
    } catch {
      // The cart still works in memory when storage is unavailable.
    }
  }, [tableCart, tableNumber]);

  useEffect(() => {
    const syncCart = (event) => {
      if (Number(event.detail?.tableNumber) === Number(tableNumber)) {
        setTableCart(event.detail.items || []);
      }
    };
    window.addEventListener("table-cart-updated", syncCart);
    return () => window.removeEventListener("table-cart-updated", syncCart);
  }, [tableNumber]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const changeTableNumber = (newTableNum) => {
    const num = parseInt(newTableNum, 10);
    if (!isNaN(num) && num > 0) {
      setTableNumberState(num);
      setCurrentTableNumber(num);
      showToast(`تم التبديل إلى طاولة رقم ${num} بنجاح 🪑`);
      setIsTableSelectorOpen(false);
    }
  };

  // Waiter Call
  const triggerCallWaiter = async (reason = "طلب حضور الويتر") => {
    await createV1TableService({ type: "CALL_WAITER", details: reason }, tableToken);
    showToast(`تم إرسال تنبيه للجرسون للحضور إلى طاولة رقم ${tableNumber} (${reason})`);
    setIsWaiterModalOpen(false);
  };

  // Bill Request
  const triggerRequestBill = async (method = "كاش") => {
    await createV1TableService({ type: "BILL_REQUEST", details: method }, tableToken);
    showToast(`🧾 تم إرسال طلب الحساب والفاتورة (${method}) لكاشير طاولة رقم ${tableNumber}`);
  };

  // Cart operations
  const addToTableCart = (product) => {
    if (!product) return;
    // Quick-add has no size picker, so preselect the same size the details
    // modal defaults to. The proposal endpoint requires a real productSizeId.
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const size = sizes[1] ?? sizes[0] ?? null;
    setTableCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + (product.quantity || 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          originalId: product.originalId ?? product.id,
          name: product.name,
          englishName: product.englishName || "",
          price: product.price,
          unitPrice: product.price,
          quantity: product.quantity || 1,
          image: product.image,
          productSizeId: product.productSizeId ?? size?.productSizeId ?? null,
          customizations: product.customizations || {
            sizeId: product.productSizeId ?? size?.productSizeId ?? null,
            size: size?.name || product.size || "عادي",
            sugar: product.sugar || "مضبوط",
            milk: product.milk || "عادي",
            addons: product.addons || [],
            notes: product.notes || "",
          },
        },
      ];
    });
    showToast(`تمت إضافة ${product.name} إلى سلة طلب طاولة رقم ${tableNumber} ☕`);
  };

  const updateCartQuantity = (id, newQty) => {
    if (newQty <= 0) {
      setTableCart((prev) => prev.filter((item) => item.id !== id));
    } else {
      setTableCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
      );
    }
  };

  const removeFromCart = (id) => {
    setTableCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCartItemsCount = tableCart.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const hasOrderableSize = (item) =>
    /^[a-f\d]{24}$/i.test(
      String(item?.productSizeId ?? item?.customizations?.sizeId ?? item?.customizations?.size?.productSizeId ?? "")
    );

  const submitTableOrder = async () => {
    if (!tableCart.length) return null;
    // The proposal contract requires a real productSizeId per line; catch the
    // unconfigured-size case here instead of surfacing a raw 422.
    const incomplete = tableCart.find((item) => !hasOrderableSize(item));
    if (incomplete) {
      showToast(`المنتج "${incomplete.name}" بدون مقاسات مفعّلة — اختر مقاسًا من صفحة المنتج`);
      return null;
    }
    const created = await submitV1TableProposal(tableCart, tableToken);
    setTableCart([]);
    setCurrentProposal(created?.proposal || null);
    await refreshTableData();
    showToast(`تم إرسال طلب طاولة رقم ${tableNumber} بنجاح`);
    return created;
  };
  const cancelCurrentProposal = async () => { const result = await cancelV1CurrentProposal(tableToken); setCurrentProposal(result?.proposal || null); return result; };

  const value = {
    tableNumber,
    changeTableNumber,
    activeOrder,
    tableOrders,
    refreshTableData,
    toastMessage,
    showToast,
    isWaiterModalOpen,
    setIsWaiterModalOpen,
    isTableSelectorOpen,
    setIsTableSelectorOpen,
    triggerCallWaiter,
    triggerRequestBill,
    // Cart
    tableCart,
    isCartOpen,
    setIsCartOpen,
    addToTableCart,
    updateCartQuantity,
    removeFromCart,
    totalCartItemsCount,
    submitTableOrder,
    currentProposal,
    cancelCurrentProposal,
    tableToken,
    accessError,
    hasTableAccess: Boolean(tableToken),
  };

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTable() {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error("useTable must be used within a TableProvider");
  }
  return context;
}
