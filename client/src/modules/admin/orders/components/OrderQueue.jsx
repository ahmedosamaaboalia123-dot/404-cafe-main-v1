import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, MapPin, Phone, ReceiptText, UserRound } from "lucide-react";
import "../styles/OrderQueue.css";

const statusText = { PENDING: "جاري التحضير", CONFIRMED: "جاري التحضير", PREPARING: "جاري التحضير", READY: "جاهز", ASSIGNED_TO_DELEGATE: "مع المندوب", OUT_FOR_DELIVERY: "خارج للتوصيل", DELIVERED: "تم التسليم", COMPLETED: "مكتمل", CANCELLED: "ملغي" };

const formatDate = (value) => {
  if (!value) return "الآن";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "الآن" : date.toLocaleString("ar-EG");
};

export default function OrderQueue({ orders = [], emptyText }) {
  const navigate = useNavigate();
  if (orders.length === 0) {
    return <div className="admin-order-empty">{emptyText}</div>;
  }

  return (
    <div className="admin-order-queue">
      {orders.map((order) => {
        const name = order.customer?.name || order.customerInfo?.name || order.customerName || "عميل";
        const phone = order.customer?.phone || order.customerInfo?.phone || order.phone || "";
        const address = order.customer?.address || order.customerInfo?.address || "";
        const isDelivery = (order.fulfillmentType || order.orderType || "").toUpperCase() === "DELIVERY";
        const total = order.totals?.total ?? order.pricing?.total ?? order.total ?? 0;
        const items = Array.isArray(order.items) ? order.items : [];
        const itemsCount = order.progress?.total ?? items.length;
        return (
          <article
            className="admin-order-card admin-order-card--clickable"
            key={order.id}
            role="button"
            tabIndex={0}
            aria-label={`فتح الطلب ${order.orderNumber || order.id}`}
            onClick={() => navigate(`/admin/orders/busy/takeaway/${order.id}`)}
            onKeyDown={(event) => { if (event.key === "Enter") navigate(`/admin/orders/busy/takeaway/${order.id}`); }}
          >
            <header>
              <div>
                <span className="admin-order-code">{order.orderNumber || order.id}</span>
                <strong>{order.orderTypeText || (isDelivery ? "توصيل" : "تيك أواي")}</strong>
              </div>
              <span className="admin-order-status">{statusText[String(order.status || "").toUpperCase()] || order.statusText || order.status}</span>
              {order.assignedDelegate && <span className="admin-order-delegate">تم التسليم للمندوب{order.assignedDelegate.name ? ` — ${order.assignedDelegate.name}` : ""}</span>}
            </header>
            <div className="admin-order-meta">
              <span><UserRound size={15} />{name}</span>
              <span><Phone size={15} />{phone || "—"}</span>
              <span><Clock3 size={15} />{formatDate(order.createdAt || order.dateFormatted)}</span>
              {isDelivery && address && (
                <span><MapPin size={15} />{address}</span>
              )}
            </div>
            <div className="admin-order-items">
              {items.length ? items.map((item) => (
                <span key={item.id || item.name}>{item.quantity}× {item.name || item.productName}</span>
              )) : <span>{itemsCount} منتج</span>}
            </div>
            <footer>
              <span><ReceiptText size={16} /> الإجمالي</span>
              <strong>{total} ج.م</strong>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
