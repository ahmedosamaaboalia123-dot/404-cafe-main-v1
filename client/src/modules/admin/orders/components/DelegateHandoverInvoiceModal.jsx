import { X, FileText, Check, Printer } from "lucide-react";
import "../styles/DelegateHandoverInvoiceModal.css";

const STATUS_LABELS = {
  PENDING: "جاري التحضير",
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  READY: "جاهز",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export default function DelegateHandoverInvoiceModal({ order, delegateName, onClose, onDone }) {
  if (!order) return null;

  const activeItems = (order.items || []).filter((it) => it.status !== "CANCELLED");
  const sale = order.sale || {};
  const total = Number(sale.total ?? order.total ?? 0);
  const print = () => window.print();

  return (
    <div className="dhi-overlay" onClick={onClose}>
      <div className="dhi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dhi-modal__header">
          <div className="dhi-modal__title">
            <FileText size={16} />
            <h3>فاتورة تسليم المندوب</h3>
          </div>
          <button className="dhi-modal__close" onClick={onClose} aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>

        <div className="dhi-modal__body">
          <div className="dhi-invoice-head">
            <div className="dhi-head-block"><span>رقم الطلب</span><strong>{order.orderNumber}</strong></div>
            <div className="dhi-head-block"><span>المندوب</span><strong>{delegateName || "—"}</strong></div>
            <div className="dhi-head-block"><span>العميل</span><strong>{order.customerName || "—"}</strong></div>
            <div className="dhi-head-block"><span>حالة الدفع</span><strong>مدفوع (ثمّ تسليمه للمندوب)</strong></div>
          </div>

          <div className="dhi-section">
            <span className="dhi-section__label">المنتجات ({activeItems.length})</span>
            <div className="dhi-items-list">
              {activeItems.map((item, idx) => (
                <div className="dhi-item" key={item.id || idx}>
                  <div className="dhi-item__info">
                    <strong className="dhi-item__name">{item.product?.name || item.name}</strong>
                    <span className="dhi-item__variant">{item.typeName || item.sizeName || ""}</span>
                  </div>
                  <span className="dhi-item__qty">×{Number(item.quantity)}</span>
                  {item.status === "READY" && <span className="dhi-item__ready"><Check size={12} /> جاهز</span>}
                  <span className="dhi-item__price">{Number(item.totalPrice).toFixed(2)} ج.م</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dhi-total">
            <span>الإجمالي المستحق</span>
            <strong>{total.toFixed(2)} ج.م</strong>
          </div>
        </div>

        <div className="dhi-modal__footer">
          <button className="dhi-print" onClick={print}><Printer size={16} /> طباعة الفاتورة</button>
          <button className="dhi-confirm" onClick={onDone}><Check size={16} /> تأكيد الإغلاق</button>
        </div>
      </div>
    </div>
  );
}
