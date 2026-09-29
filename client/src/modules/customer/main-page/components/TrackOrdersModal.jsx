import React from "react";
import { X, CheckCircle2, Clock, Truck, Coffee } from "lucide-react";

export default function TrackOrdersModal({
  isOpen,
  onClose,
  orders = [],
}) {
  if (!isOpen) return null;

  return (
    <div className="customer-modal-backdrop" onClick={onClose}>
      <div
        className="customer-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-sheet-header">
          <div className="modal-handle-bar" />
          <div className="modal-title-row">
            <h3 className="modal-title">متابعة طلباتي</h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-sheet-body">
          {orders.length === 0 ? (
            <div className="empty-orders-state">
              <Coffee size={48} className="empty-icon" />
              <p>لا توجد طلبات جارية حالياً</p>
            </div>
          ) : (
            <div className="orders-timeline-list">
              {orders.map((order) => (
                <div key={order.id} className="order-tracking-card">
                  <div className="order-card-top">
                    <div className="order-id-badge">{order.id}</div>
                    <span className="order-time-stamp">{order.time}</span>
                  </div>

                  <p className="order-items-summary">{order.items}</p>

                  <div className="order-status-stepper">
                    <div
                      className={`status-step ${
                        order.statusStep >= 1 ? "completed" : ""
                      }`}
                    >
                      <div className="step-dot">
                        <Clock size={12} />
                      </div>
                      <span className="step-text">تم الاستلام</span>
                    </div>
                    <div className="step-line" />
                    <div
                      className={`status-step ${
                        order.statusStep >= 2 ? "active" : ""
                      }`}
                    >
                      <div className="step-dot">
                        <Coffee size={12} />
                      </div>
                      <span className="step-text">جاري التجهيز</span>
                    </div>
                    <div className="step-line" />
                    <div
                      className={`status-step ${
                        order.statusStep >= 3 ? "completed" : ""
                      }`}
                    >
                      <div className="step-dot">
                        <CheckCircle2 size={12} />
                      </div>
                      <span className="step-text">جاهز للاستلام</span>
                    </div>
                  </div>

                  <div className="order-card-footer">
                    <span className="order-type-tag">{order.type}</span>
                    <span className="order-total-price">{order.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
