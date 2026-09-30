import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  MapPin,
  Phone,
  User,
  CreditCard,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  Flame,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  getCustomerOrderById,
  normalizeTrackedOrder,
} from "../services/customerOrdersService";
import {
  getTableOrderById,
  getActiveOrderByTableNumber,
} from "../../../table/services/tableOrdersService";
import { getActiveTableOrder } from "../../../table/services/tableGateway";
import { tableSessionStorage } from "../../../table/services/tableSessionStorage";
import { getPublicOrderTracking, lookupOrderByPhone } from "../../checkout/services/orderGateway";
import { getCustomerProfile, updateLastOrder } from "../../checkout/services/checkoutCustomerService";
import { createTrackingSocket } from "@/services/realtime";
import { customerStorage } from "../../services/customerStorage";
import OrderBarcode from "../../checkout/components/OrderBarcode";
import CustomerInvoiceModal from "../components/CustomerInvoiceModal";
import CustomerOrderActions from "../components/CustomerOrderActions";
import "../styles/CustomerOrders.css";

const itemStatusOf = (item = {}) => String(item?.status || "").toUpperCase();

// A customer/table product is "ready" only when the backend marks it READY.
const isItemReady = (item = {}) => itemStatusOf(item) === "READY" || item?.isReady === true;

const STATUS_LABELS = {
  PENDING: "جاري التحضير",
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  READY: "جاهز",
  OUT_FOR_DELIVERY: "في الطريق",
  DELIVERED: "تم التسليم",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};
const statusLabelOf = (order = {}) => STATUS_LABELS[itemStatusOf(order)] || "جاري التحضير";

export default function OrderTrackingPage({ tableMode = false }) {
  const { orderId, tableId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNumber = Number(tableId) || 4;
  const ordersPath = tableMode ? `/table/${tableNumber}/orders` : "/customer/orders";
  const menuPath = tableMode ? `/table/${tableNumber}/menu` : "/menu";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Manual search (customer): prefill from saved profile, search on button click.
  const [trackNumberInput, setTrackNumberInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load Order
  useEffect(() => {
    setLoading(true);
    setSearchError("");
    if (tableMode) {
      const found = orderId ? getTableOrderById(orderId) : getActiveOrderByTableNumber(tableNumber);
      setOrder(found || null);
      // The table has a single active order; prefer the fresh backend copy.
      getActiveTableOrder(tableNumber, tableSessionStorage.read(tableNumber)?.tableToken)
        .then((remoteOrder) => {
          if (remoteOrder && (!found || String(remoteOrder.id) === String(found.id))) {
            setOrder(remoteOrder);
          }
        })
        .catch(() => {});
      setLoading(false);
      return;
    }

    // Customer: prefill the search fields from the saved profile (no auto-search).
    const profile = getCustomerProfile();
    if (profile.lastOrder?.orderNumber) setTrackNumberInput(profile.lastOrder.orderNumber);
    if (profile.phone) setPhoneInput(profile.phone);

    // Direct orderNumber in the URL (e.g. customer/orders/:orderId/track).
    if (orderId) {
      // Show saved local copy instantly (real backend order persisted at checkout),
      // then always refresh from the backend so the status is up to date.
      const local = getCustomerOrderById(orderId);
      if (local) setOrder(local);
      getPublicOrderTracking(orderId, searchParams.get("token"))
        .then((remoteOrder) => {
          if (remoteOrder) {
            setOrder(remoteOrder);
            setHasSearched(true);
            try {
              const code = String(remoteOrder.orderNumber || remoteOrder.publicOrderNumber || orderId);
              const profile = getCustomerProfile();
              if (!profile.lastOrder?.orderNumber || String(profile.lastOrder.orderNumber) === code) {
                updateLastOrder({
                  orderNumber: code,
                  status: String(remoteOrder.status || "").toUpperCase(),
                  version: Number(remoteOrder.version ?? remoteOrder.eventSequence ?? 0) || 0,
                });
              }
            } catch {}
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }
    // No orderId -> expect the customer to use the manual search form.
    setOrder(null);
    setLoading(false);
  }, [orderId, tableMode, tableNumber, searchParams]);

  const handleManualTrack = async () => {
    const num = trackNumberInput.trim();
    const ph = phoneInput.trim();
    if (!/^0\d{9,10}$/.test(ph)) {
      setSearchError("اكتب رقم الهاتف بشكل صحيح (مثال: 01xxxxxxxxx)");
      return;
    }
    setIsSearching(true);
    setSearchError("");
    setHasSearched(true);
    try {
      const result = await lookupOrderByPhone({ orderNumber: num, phone: ph });
      if (result) {
        const resolvedOrderNumber = result.publicOrderNumber || result.orderNumber;
        const access = customerStorage.getOrderAccess(resolvedOrderNumber);
        if (access?.trackingReadToken) {
          const tracked = await getPublicOrderTracking(resolvedOrderNumber, access.trackingReadToken);
          setOrder({ ...tracked, trackingToken: access.trackingReadToken });
        } else {
          setOrder(result);
          setSearchError("تم التحقق من الطلب، لكن إجراءات المتابعة الكاملة تحتاج رمز الوصول المحفوظ على جهاز إنشاء الطلب.");
        }
      } else {
        setOrder(null);
        setSearchError("لم نعثر على طلب بهذه البيانات");
      }
    } catch (err) {
      setOrder(null);
      setSearchError(err?.response?.status === 404 ? "لم نعثر على طلب بهذه البيانات" : "تعذر الاتصال بالخادم، حاول لاحقاً");
    } finally {
      setIsSearching(false);
    }
  };

  // Manual tracking form shown for the customer site (order number + phone).
  const renderManualSearch = () => (
    <div className="orders-page-container">
      <div className="tracking-manual-search-card">
        <div className="tracking-search-title-wrap">
          <Coffee size={22} className="text-coffee-gold" />
          <h3>تتبع طلبك</h3>
          <p>اكتب رقم هاتفك للعثور على أحدث طلب، ويمكنك إضافة رقم الطلب لتحديده.</p>
        </div>

        <div className="tracking-search-fields">
          <label className="tracking-search-field">
            <span>رقم الطلب (اختياري)</span>
            <input
              type="text"
              value={trackNumberInput}
              onChange={(e) => { setTrackNumberInput(e.target.value); setSearchError(""); }}
              placeholder="مثال: 10234 أو T4-00012"
              className="tracking-search-input"
            />
          </label>

          <label className="tracking-search-field">
            <span>رقم الهاتف</span>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => { setPhoneInput(e.target.value); setSearchError(""); }}
              placeholder="01xxxxxxxxx"
              className="tracking-search-input"
            />
          </label>
        </div>

        {searchError && <p className="tracking-search-error">{searchError}</p>}

        <button
          type="button"
          className="tracking-search-btn"
          onClick={handleManualTrack}
          disabled={isSearching}
        >
          {isSearching ? "جاري البحث..." : "تتبع الطلب"}
        </button>
      </div>
    </div>
  );

  // Real-time socket: keeps the displayed order fresh. Works for BOTH the table
  // (token from table order) and the customer (token from the tracking URL).
  useEffect(() => {
    if (!tableMode && !hasSearched) return undefined;
    const token = order?.trackingToken || searchParams.get("token");
    if (!token) return undefined;
    const socket = createTrackingSocket(token);
    const onUpdate = (payload) => payload?.order && setOrder(normalizeTrackedOrder(payload.order));
    socket.on("order:updated", onUpdate);
    return () => { socket.off("order:updated", onUpdate); socket.disconnect(); };
  }, [order?.trackingToken, tableMode, searchParams, hasSearched]);

  // Polling fallback so the customer tracking status actually updates even when
  // there is no real-time socket (manual lookup by phone has no tracking token).
  const pollOrderRef = useRef(null);
  useEffect(() => {
    if (tableMode) return undefined;
    if (!order) return undefined;
    // Only poll for an active (non-terminal) order.
    const status = String(order.status || "").toUpperCase();
    if (["COMPLETED", "CANCELLED", "DELIVERED"].includes(status)) return undefined;
    pollOrderRef.current = window.setInterval(() => {
      const code = order.orderNumber || order.id;
      if (!code) return;
      if (order.trackingToken || searchParams.get("token")) {
        getPublicOrderTracking(code, order.trackingToken || searchParams.get("token"))
          .then((remote) => remote && setOrder(remote))
          .catch(() => {});
      } else {
        lookupOrderByPhone({ orderNumber: code, phone: order.phone || phoneInput })
          .then((remote) => remote && setOrder(remote))
          .catch(() => {});
      }
    }, 15000);
    return () => { if (pollOrderRef.current) window.clearInterval(pollOrderRef.current); };
  }, [order, tableMode, searchParams, phoneInput]);

  // Readiness stats calculations
  const stats = useMemo(() => {
    if (!order || !order.items) {
      return { totalItems: 0, readyCount: 0, pendingCount: 0, percent: 0 };
    }
    const totalItems = order.items.length;
    const readyCount = order.items.filter((it) => it.isReady || it.status === "READY").length;
    const pendingCount = totalItems - readyCount;
    const percent = totalItems > 0 ? Math.round((readyCount / totalItems) * 100) : 0;

    return { totalItems, readyCount, pendingCount, percent };
  }, [order]);

  // Determine 4-Stage Timeline
  // Stages: 1. تأكيد الطلب | 2. جاري العمل عليه | 3. تم الانتهاء | 4. تم التسليم
  const currentStep = useMemo(() => {
    if (!order) return 1;
    const status = String(order.status || "").toUpperCase();
    if (["COMPLETED", "DELIVERED"].includes(status)) return 4;
    if (["READY", "ASSIGNED_TO_DELEGATE", "OUT_FOR_DELIVERY"].includes(status)) return 3;
    if (["CONFIRMED", "PREPARING", "IN_PROGRESS"].includes(status)) return 2;
    if (status === "CANCELLED") return 0;
    return order.statusStep || 1;
  }, [order]);

  const orderCode = useMemo(
    () => String(order?.orderNumber || order?.publicCode || order?.id || ""),
    [order]
  );

  const timelineSteps = [
    {
      step: 1,
      title: "تأكيد الطلب",
      desc: "تم استلام الطلب وتسجيله في النظام",
      time: "",
      icon: CheckCircle2,
    },
    {
      step: 2,
      title: "جاري العمل عليه",
      desc: "جارٍ إعداد أصناف طلبك",
      time: "",
      icon: Flame,
    },
    {
      step: 3,
      title: "تم الانتهاء",
      desc: "الأصناف جاهزة للتسليم والاستلام",
      time: "",
      icon: Coffee,
    },
    {
      step: 4,
      title: "تم التسليم",
      desc: "تم تسليم الطلب بالكامل",
      time: "",
      icon: Sparkles,
    },
  ];

  if (loading) {
    return (
      <div className="customer-orders-page-root">
        <div className="orders-loading-box">
          <div className="orders-spinner" />
          <p>جاري تحميل بيانات تتبع الطلب...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    if (!tableMode) {
      return (
        <div className="customer-orders-page-root">
          <header className="orders-page-header">
            <div className="orders-page-header-inner">
              <div className="orders-header-title-wrap">
                <button
                  type="button"
                  className="orders-back-btn"
                  onClick={() => navigate(ordersPath)}
                  aria-label="الرجوع إلى قائمة الطلبات"
                  title="الرجوع لطلباتي"
                >
                  <ArrowRight size={20} />
                </button>
                <div>
                  <h1 className="orders-page-main-heading">تتبع حالة الطلب</h1>
                  <span className="order-header-id-highlight">ابحث عن طلبك</span>
                </div>
              </div>
            </div>
          </header>
          {renderManualSearch()}
        </div>
      );
    }
    return (
      <div className="customer-orders-page-root">
        <div className="orders-page-container">
          <div className="orders-empty-state-card">
            <Coffee size={40} className="text-coffee-gold" />
            <h3>لا يوجد طلب نشط</h3>
            <p>لا يوجد طلب جارٍ على هذه الطاولة حالياً.</p>
            <Link to={menuPath} className="orders-empty-cta-btn">
              العودة للقائمة
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-orders-page-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="pd-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <header className="orders-page-header">
        <div className="orders-page-header-inner">
          <div className="orders-header-title-wrap">
            <button
              type="button"
              className="orders-back-btn"
              onClick={() => navigate(ordersPath)}
              aria-label="الرجوع إلى قائمة الطلبات"
              title="الرجوع لطلباتي"
            >
              <ArrowRight size={20} />
            </button>

            <div>
              <h1 className="orders-page-main-heading">
                {tableMode ? `تتبع طلب طاولة رقم ${tableNumber}` : "تتبع حالة الطلب"}
              </h1>
              <span className="order-header-id-highlight">طلب رقم {orderCode}</span>
            </div>
          </div>

          <div className="orders-header-actions">
            <button
              type="button"
              className="order-header-invoice-btn"
              onClick={() => setIsInvoiceOpen(true)}
            >
              <FileText size={16} />
              <span>عرض الفاتورة</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Tracking Content */}
      <main className="orders-page-container tracking-page-layout">
        {/* Manual search panel (customer): allow searching another order */}
        {!tableMode && renderManualSearch()}
        {/* Top Overview Banner */}
        <div className="tracking-hero-card">
          <div className="tracking-hero-status-row">
            <div className="tracking-status-badge-wrap">
              <span className="tracking-live-pulse-dot" />
              <h2 className="tracking-current-status-title">
                {statusLabelOf(order)}
              </h2>
            </div>
            {order.estimatedTime && (
              <span className="tracking-est-time-pill">
                <Clock size={14} />
                <span>{order.estimatedTime}</span>
              </span>
            )}
          </div>

          <div className="tracking-barcode-row">
              <OrderBarcode value={orderCode} trackingToken={order.trackingToken} />
              <span className="tracking-barcode-code">رقم الطلب: {orderCode}</span>
            </div>

          {order.branch && (
            <p className="tracking-branch-address">
              <MapPin size={15} />
              <span>{order.branch}</span>
              {order.orderTypeText && (
                <>
                  <span className="meta-separator">•</span>
                  <span>{order.orderTypeText}</span>
                </>
              )}
            </p>
          )}
        </div>

        {/* 3. The 4-Stage Timeline (Requested) */}
        <section className="tracking-section-card">
          <div className="tracking-section-header">
            <Clock size={18} className="text-coffee-gold" />
            <h3 className="tracking-section-title">خط سير ومراحل الطلب</h3>
          </div>

          <div className="order-4steps-timeline">
            {timelineSteps.map((stepItem, idx) => {
              const isCompleted = currentStep > stepItem.step || (currentStep === 4 && stepItem.step === 4);
              const isCurrent = currentStep === stepItem.step && order.status !== "completed";
              const isPending = currentStep < stepItem.step;
              const StepIcon = stepItem.icon;

              return (
                <div
                  key={stepItem.step}
                  className={`timeline-step-item ${
                    isCompleted ? "is-completed" : isCurrent ? "is-current" : "is-pending"
                  }`}
                >
                  <div className="step-node-col">
                    <div className="step-node-bubble">
                      {isCompleted ? (
                        <Check size={16} />
                      ) : (
                        <StepIcon size={15} />
                      )}
                    </div>
                    {idx < timelineSteps.length - 1 && (
                      <div
                        className={`step-vertical-line ${
                          currentStep > stepItem.step ? "line-completed" : ""
                        }`}
                      />
                    )}
                  </div>

                  <div className="step-content-box">
                    <div className="step-title-time-row">
                      <h4 className="step-main-title">{stepItem.title}</h4>
                      {stepItem.time && <span className="step-timestamp">{stepItem.time}</span>}
                    </div>
                    <p className="step-description">{stepItem.desc}</p>
                    {isCurrent && (
                      <span className="step-current-tag">
                        <span className="mini-pulse" /> المرحلة الحالية
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Item Readiness Statistics (Requested) */}
        <section className="tracking-section-card">
          <div className="tracking-section-header">
            <Sparkles size={18} className="text-coffee-gold" />
            <h3 className="tracking-section-title">إحصائيات تجهيز المنتجات</h3>
          </div>

          {/* Stat Metric Cards */}
          <div className="readiness-metrics-grid">
            <div className="readiness-stat-card stat-ready">
              <div className="stat-icon-wrap">
                <CheckCircle2 size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-number">{stats.readyCount}</span>
                <span className="stat-label">أصناف جاهزة</span>
              </div>
            </div>

            <div className="readiness-stat-card stat-pending">
              <div className="stat-icon-wrap">
                <Clock size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-number">{stats.pendingCount}</span>
                <span className="stat-label">متبقي قيد الإعداد</span>
              </div>
            </div>

            <div className="readiness-stat-card stat-total">
              <div className="stat-icon-wrap">
                <Coffee size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-number">{stats.totalItems}</span>
                <span className="stat-label">إجمالي الأصناف</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="readiness-progress-wrapper">
            <div className="readiness-progress-header">
              <span className="progress-lbl">نسبة جاهزية الطلب الإجمالية</span>
              <span className="progress-val">{stats.percent}% مكتمل</span>
            </div>
            <div className="readiness-progress-bar-bg">
              <div
                className="readiness-progress-bar-fill"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>
        </section>

        {/* 5. Products List with Individual Readiness Badge (Requested) */}
        <section className="tracking-section-card">
          <div className="tracking-section-header">
            <Coffee size={18} className="text-coffee-gold" />
            <div className="tracking-section-title-wrap">
              <h3 className="tracking-section-title">أصناف الطلب وحالة كل منتج</h3>
              <span className="tracking-subtitle">
                متابعة دقيقة لحالة تجهيز كل مشروب ووجبة في طلبك
              </span>
            </div>
          </div>

          <div className="tracking-items-list">
            {order.items?.map((item, idx) => {
              const realStatus = itemStatusOf(item);
              const cust = item.customizations || {};
              const itemName = item.name || (item.product && item.product.name) || `صنف ${idx + 1}`;
              const itemImage = item.image || "";
              const isCancelled = realStatus === "CANCELLED";
              const sizeName = item.sizeName || cust.size || "";
              const typeName = item.typeName || cust.type || "";
              const addonsNames = (Array.isArray(cust.addons) ? cust.addons.map((a) => a.name || a) : (item.addons || []))
                .filter(Boolean);
              const hasCustomizations = sizeName || cust.sugar || cust.milk || addonsNames.length > 0 || cust.notes;

              return (
                <div
                  key={item.id || idx}
                  className={`tracking-product-item-card ${isCancelled ? "is-cancelled-card" : isItemReady(item) ? "is-ready-card" : "is-preparing-card"}`}
                >
                  <div className="product-item-main-row">
                    <div className="product-item-thumb-box">
                      {itemImage ? (
                        <img
                          src={itemImage}
                          alt={itemName}
                          className="product-item-thumb-img"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="product-item-thumb-placeholder">
                          <Coffee size={20} />
                        </span>
                      )}
                      <span className="product-item-qty-tag">×{item.quantity}</span>
                    </div>

                    <div className="product-item-details-col">
                      <div className="product-title-row">
                        <h4 className="product-name-ar">{itemName}</h4>
                        {item.englishName && (
                          <span className="product-name-en">{item.englishName}</span>
                        )}
                      </div>

                      {hasCustomizations && (
                        <div className="product-customizations-tags">
                          {sizeName && (
                            <span className="track-cust-pill">الحجم: {sizeName}</span>
                          )}
                          {cust.sugar && (
                            <span className="track-cust-pill">السكر: {cust.sugar}</span>
                          )}
                          {cust.milk && cust.milk !== "بدون" && (
                            <span className="track-cust-pill">الحليب: {cust.milk}</span>
                          )}
                          {typeName && (
                            <span className="track-cust-pill">النوع: {typeName}</span>
                          )}
                          {addonsNames.length > 0 && (
                            <span className="track-cust-pill addon">
                              +{addonsNames.join(", ")}
                            </span>
                          )}
                          {cust.notes && (
                            <span className="track-cust-pill note">
                              ملاحظة: {cust.notes}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="product-item-price-row">
                        <span className="product-item-price">
                          {Number(
                            item.totalPrice ??
                            ((item.unitPrice || item.price || 0) * (item.quantity || 1))
                          ).toFixed(2)}{" "}
                          EGP
                        </span>
                      </div>
                    </div>

                    {/* Product Readiness Badge (from backend items[].status) */}
                    <div className="product-readiness-badge-col">
                      {isCancelled ? (
                        <div className="item-voided-badge">
                          <AlertCircle size={16} className="badge-icon" />
                          <span className="badge-text">ملغي</span>
                        </div>
                      ) : isItemReady(item) ? (
                        <div className="item-ready-badge">
                          <CheckCircle2 size={16} className="badge-icon" />
                          <span className="badge-text">جاهز للتقديم</span>
                          {item.readyTime && (
                            <span className="badge-sub-time">{item.readyTime}</span>
                          )}
                        </div>
                      ) : (
                        <div className="item-preparing-badge">
                          <Clock size={16} className="badge-icon" />
                          <span className="badge-text">جاري التحضير</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. Customer & Delivery Info Card */}
        <section className="tracking-section-card">
          <div className="tracking-section-header">
            <User size={18} className="text-coffee-gold" />
            <h3 className="tracking-section-title">بيانات الاستلام والتوصيل</h3>
          </div>

          <div className="tracking-info-grid">
            <div className="tracking-info-block">
              <span className="info-lbl">العميل</span>
              <span className="info-val">{order.customerInfo?.name || order.customerName || "—"}</span>
            </div>

            <div className="tracking-info-block">
              <span className="info-lbl">رقم الهاتف</span>
              <span className="info-val dir-ltr">{order.customerInfo?.phone || order.phone || "—"}</span>
            </div>

            <div className="tracking-info-block">
              <span className="info-lbl">العنوان / طريقة الاستلام</span>
              <span className="info-val">{order.customerInfo?.address || order.orderTypeText}</span>
            </div>

            <div className="tracking-info-block">
              <span className="info-lbl">طريقة الدفع</span>
              <span className="info-val">
                {order.paymentMethodText} ({order.paymentStatusText})
              </span>
            </div>
          </div>

          {order.customerInfo?.notes && (
            <div className="tracking-note-bubble">
              <strong>ملاحظات العميل:</strong> {order.customerInfo.notes}
            </div>
          )}
        </section>

        {/* Bottom Actions */}
        {!tableMode && <CustomerOrderActions order={order} onChanged={async () => { const access = customerStorage.getOrderAccess(orderCode); if (access?.trackingReadToken) setOrder(await getPublicOrderTracking(orderCode, access.trackingReadToken)); }}/>} 
        <div className="tracking-bottom-actions-bar">
          <button
            type="button"
            className="tracking-btn-invoice"
            onClick={() => setIsInvoiceOpen(true)}
          >
            <FileText size={18} />
            <span>عرض تفاصيل الفاتورة الضريبية</span>
          </button>

          <button
            type="button"
            className="tracking-btn-back"
            onClick={() => navigate(ordersPath)}
          >
            <ArrowRight size={18} />
            <span>الرجوع لقائمة طلباتي</span>
          </button>
        </div>
      </main>

      {/* Invoice Modal */}
      <CustomerInvoiceModal
        isOpen={isInvoiceOpen}
        order={order}
        onClose={() => setIsInvoiceOpen(false)}
        onReorder={() => {
          setIsInvoiceOpen(false);
          setToastMessage(`☕ جاري إعادة طلب أصناف الطلب ${order.id}...`);
          setTimeout(() => navigate(menuPath), 900);
        }}
      />
    </div>
  );
}
