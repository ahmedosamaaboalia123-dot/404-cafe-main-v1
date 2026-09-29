import React from "react";
import { CheckCircle2, ReceiptText, Route, X } from "lucide-react";
import OrderBarcode from "./OrderBarcode";

export default function OrderSuccessModal({ order, onClose, onTrack }) {
  if (!order) return null;

  const code = order.orderNumber || order.publicCode || order.id;
  const isDelivery = order.fulfillmentType === "DELIVERY";

  return (
    <div className="checkout-modal-backdrop" onClick={onClose}>
      <section className="checkout-modal checkout-success-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="checkout-close-btn" onClick={onClose} aria-label="إغلاق">
          <X size={20} />
        </button>
        <CheckCircle2 size={48} className="checkout-success-icon" />
        <h2>تم تأكيد طلبك بنجاح</h2>
        <p>{isDelivery ? "سيتم تحضير الطلب وتسليمه إلى عنوانك." : "سيتم تحضير الطلب لاستلامه من الفرع."}</p>
        <div className="checkout-code-card">
          <span>رقم الطلب</span>
          <strong>{code}</strong>
          <OrderBarcode value={code} trackingToken={order.trackingToken} />
        </div>
        <div className="checkout-success-actions">
          <button type="button" className="checkout-primary-btn" onClick={() => onTrack(order)}>
            <Route size={18} />
            تتبع الطلب
          </button>
          <button type="button" className="checkout-secondary-btn" onClick={onClose}>
            <ReceiptText size={18} />
            إغلاق
          </button>
        </div>
      </section>
    </div>
  );
}
