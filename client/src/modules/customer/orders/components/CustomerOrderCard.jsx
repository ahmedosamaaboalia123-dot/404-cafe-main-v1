import React from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  ChevronLeft,
  RotateCcw,
  Activity,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";

export default function CustomerOrderCard({
  order,
  onOpenInvoice,
  onTrackOrder,
  onReorder,
}) {
  const getStatusConfig = (status) => {
    switch (String(status || "").toUpperCase()) {
      case "READY":
        return {
          bg: "#EBF7EE",
          color: "#1E7E34",
          border: "#C3E6CB",
          icon: CheckCircle2,
          text: "جاهز",
        };
      case "PENDING":
      case "CONFIRMED":
      case "PREPARING":
      case "IN_PROGRESS":
        return {
          bg: "#FFF6E5",
          color: "#B76E00",
          border: "#FFE2B3",
          icon: Clock,
          text: "جاري التحضير",
        };
      case "OUT_FOR_DELIVERY":
      case "ASSIGNED_TO_DELEGATE":
        return {
          bg: "#FFF6E5",
          color: "#B76E00",
          border: "#FFE2B3",
          icon: Activity,
          text: "في الطريق للتوصيل",
        };
      case "COMPLETED":
      case "DELIVERED":
        return {
          bg: "#E8F4FD",
          color: "#0B6BCB",
          border: "#BCE0FD",
          icon: CheckCircle2,
          text: "تم التسليم",
        };
      case "CANCELLED":
        return {
          bg: "#FDE8E8",
          color: "#C81E1E",
          border: "#F8B4B4",
          icon: AlertCircle,
          text: "تم الإلغاء",
        };
      default:
        return {
          bg: "#F4F1EA",
          color: "#5C4A3E",
          border: "#E0D7C9",
          icon: Coffee,
          text: "جاري التحضير",
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const orderNumber = order.orderNumber || order.id || "";
  const itemCount = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0;
  const readyItemsCount = order.items?.filter((it) => it.isReady || it.status === "READY").length || 0;
  const totalItemsTypeCount = order.items?.length || 0;
  const totalAmount = order.pricing?.total ?? order.total ?? 0;
  const dateText = order.dateFormatted || (order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("ar-EG")
    : "");

  return (
    <div
      className="customer-order-card"
      role="article"
      aria-label={`طلب رقم ${orderNumber}`}
    >
      {/* Top Header Row */}
      <div className="order-card-header">
        <div className="order-header-main-meta">
          <div className="order-id-pill">
            <ShoppingBag size={14} className="text-coffee-gold" />
            <span className="order-id-text">{orderNumber}</span>
          </div>
          <span className="order-date-text">{dateText}</span>
        </div>

        <div
          className="order-status-badge"
          style={{
            backgroundColor: statusConfig.bg,
            color: statusConfig.color,
            borderColor: statusConfig.border,
          }}
        >
          <StatusIcon size={14} />
          <span>{statusConfig.text}</span>
        </div>
      </div>

      {/* Items Preview List (Clean) */}
      <div className="order-items-preview-wrap">
        <div className="order-items-thumbs-row">
          {order.items?.slice(0, 3).map((item, idx) => (
            <div key={idx} className="order-thumb-box" title={item.name}>
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="order-thumb-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="order-thumb-placeholder">
                  <Coffee size={16} />
                </span>
              )}
              {item.quantity > 1 && (
                <span className="order-thumb-qty-bubble">×{item.quantity}</span>
              )}
            </div>
          ))}
          {order.items?.length > 3 && (
            <div className="order-more-thumbs-pill">
              +{order.items.length - 3}
            </div>
          )}
        </div>

        <div className="order-items-names-summary">
          <p className="order-items-title">
            {order.items?.map((it) => `${it.name} (×${it.quantity})`).join(" + ")}
          </p>
          <div className="order-items-meta-row">
            <span className="order-type-caption">
              {order.orderTypeText} • {itemCount} {itemCount === 1 ? "صنف" : "أصناف"}
            </span>
            {totalItemsTypeCount > 0 && (
              <span className="order-items-ready-mini-tag">
                {readyItemsCount}/{totalItemsTypeCount} جاهز
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Bottom: Total Price + Action Buttons */}
      <div className="order-card-bottom-actions">
        <div className="order-card-price-block">
          <span className="order-price-label">إجمالي الطلب:</span>
          <div className="order-price-value-row">
            <span className="order-price-amount">
              {Number(totalAmount).toFixed(2)}
            </span>
            <span className="order-price-cur">EGP</span>
          </div>
        </div>

        <div className="order-buttons-cluster">
          {/* Track Order Status Button (Requested) */}
          <button
            type="button"
            className="order-btn-track"
            onClick={() => onTrackOrder(order)}
            title="تتبع مراحل الطلب والمنتجات الجاهزة"
          >
            <Activity size={15} />
            <span>تتبع حالة الطلب</span>
            <ChevronLeft size={14} />
          </button>

          {/* View Invoice Button */}
          <button
            type="button"
            className="order-btn-invoice"
            onClick={() => onOpenInvoice(order)}
            title="عرض الفاتورة الإلكترونية"
          >
            <FileText size={15} />
            <span>الفاتورة</span>
          </button>

          {onReorder && (
            <button
              type="button"
              className="order-btn-secondary"
              onClick={() => onReorder(order)}
              title="إعادة طلب نفس الأصناف"
            >
              <RotateCcw size={14} />
              <span>إعادة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
