import { Bell, Check, Clock } from "lucide-react";
import { formatDecimal } from "@/shared/utils/decimal";

const typeText = { CALL_WAITER: "مناداة جرسون", WATER_REQUEST: "طلب مياه", PARTY_SURPRISE: "تجهيز مفاجأة حفلة", BILL_REQUEST: "طلب الحساب", REPORT_PROBLEM: "ظهور مشكلة" };
const money = (value) => `${formatDecimal(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

function ServiceOrder({ order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  return <div className="service-order">
    <div className="service-order-head">
      <span className="service-order-ref">{order.proposalNumber}{order.orderNumber ? ` ← ${order.orderNumber}` : ""}</span>
      <span className="service-order-count">{order.quantityCount} قطعة</span>
      <strong className="service-order-total">{money(order.subtotal)}</strong>
    </div>
    <ul className="service-order-items">
      {items.map((item, index) => <li key={`${item.productName}-${index}`}>
        <span className="service-order-qty">{item.quantity}×</span>
        <span className="service-order-name">{item.productName}{item.sizeName ? ` — ${item.sizeName}` : ""}</span>
        <span className="service-order-line">{money(item.lineSubtotal)}</span>
        {item.notes ? <span className="service-order-note">{item.notes}</span> : null}
      </li>)}
    </ul>
  </div>;
}

export default function TableServiceRequestsList({ title, services, finished = false, pendingId, onStatusChange }) {
  return <section className="services-section"><h3>{title} ({services.length})</h3><div className="services-list">
    {services.length ? services.map((service) => <article key={service.id} className={`service-card ${finished ? "service-card--done" : "service-card--active"}`}>
      <div className={`service-icon ${finished ? "done" : ""}`}>{finished ? <Check size={20}/> : <Bell size={20}/>}</div>
      <div className="service-info"><span className="service-type">{service.purpose === "ORDER_REVIEW" ? "عميل يريد الطلب — مراجعة طلب" : (typeText[service.type] || service.reason || service.type)}</span><span className="service-table">طاولة {service.tableNumber}{service.purpose === "ORDER_REVIEW" ? " • سلة" : ""}</span></div>
      <div className="service-time"><Clock size={14}/>{service.priority === "HIGH" ? "أولوية عالية" : service.purpose === "ORDER_REVIEW" ? "مراجعة طلب" : service.serviceRequestNumber}</div>
      {!finished && <button className="btn-mark-done" disabled={pendingId === service.id} onClick={() => onStatusChange(service.id, service.version, "تم التعامل مع الطلب")}><Check size={16}/>{pendingId === service.id ? "جاري..." : "تم التعامل"}</button>}
      {service.order ? <ServiceOrder order={service.order}/> : null}
    </article>) : <div className="empty-msg">لا توجد طلبات</div>}
  </div></section>;
}
