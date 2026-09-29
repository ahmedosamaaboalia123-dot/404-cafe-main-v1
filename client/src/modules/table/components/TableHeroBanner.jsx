import React from "react";
import { Link } from "react-router-dom";
import {
  Coffee,
  Bell,
  Receipt,
  Sparkles,
  ArrowLeft,
  Flame,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useTable } from "../context/TableContext";

export default function TableHeroBanner() {
  const {
    tableNumber,
    activeOrder,
    setIsWaiterModalOpen,
    triggerRequestBill,
  } = useTable();

  return (
    <section className="tbl-hero-section">
      <div className="tbl-hero-card">
        <div className="tbl-hero-watermark">T-{tableNumber}</div>

        <div className="tbl-hero-content">
          {/* Top Pill Row */}
          <div className="tbl-hero-top-badge-row">
            <div className="tbl-hero-table-pill">
              <Sparkles size={14} className="text-coffee-gold" />
              <span>طاولة ضيافة رقم {tableNumber}</span>
            </div>

            {activeOrder ? (
              <div className="tbl-hero-order-pill">
                <Clock size={13} className="text-coffee-gold" />
                <span>
                  طلب نشط: <strong>#{activeOrder.orderNumber}</strong> • {activeOrder.statusText}
                </span>
              </div>
            ) : (
              <div className="tbl-hero-order-pill">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>الطاولة جاهزة لاستقبال طلبك</span>
              </div>
            )}
          </div>

          {/* Title & Greeting with Table Number */}
          <div className="tbl-hero-title-wrap">
            <h2 className="tbl-hero-greeting">
              مرحباً بك في 404 كافيه على{" "}
              <span className="tbl-hero-greeting-accent">طاولة رقم {tableNumber}</span> ☕
            </h2>
            <p className="tbl-hero-subtext">
              استمتع بأرقى أنواع القهوة المختصة والمخبوزات الطازجة. اطلب من هاتفك مباشرة
              وسيتم تقديم طلبك إلى طاولتك بعناية وسرعة فائقة.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="tbl-hero-quick-actions">
            <Link
              to={`/table/${tableNumber}/menu`}
              className="tbl-hero-action-btn-primary"
            >
              <Coffee size={18} />
              <span>تصفح منيو الطاولة واطلب الآن</span>
              <ArrowLeft size={16} />
            </Link>

            <button
              type="button"
              className="tbl-hero-action-btn-secondary"
              onClick={() => setIsWaiterModalOpen(true)}
            >
              <Bell size={16} className="text-coffee-gold" />
              <span>استدعاء الويتر</span>
            </button>

            {activeOrder && (
              <button
                type="button"
                className="tbl-hero-action-btn-secondary"
                onClick={() => triggerRequestBill("كاش أو فيزا")}
              >
                <Receipt size={16} className="text-coffee-gold" />
                <span>طلب الحساب والفاتورة</span>
              </button>
            )}

            <Link
              to={`/table/${tableNumber}/chatbot`}
              className="tbl-hero-action-btn-secondary"
            >
              <Sparkles size={16} className="text-coffee-gold" />
              <span>باريستا الطاولة الذكي</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
