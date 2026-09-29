import React from "react";
import {
  X,
  Bell,
  Check,
  Coffee,
  Droplets,
  Sparkles,
  Receipt,
  Utensils,
  ChevronLeft,
} from "lucide-react";
import { useTable } from "../context/TableContext";

export default function CallWaiterModal({ isOpen, onClose }) {
  const { tableNumber, triggerCallWaiter } = useTable();

  if (!isOpen) return null;

  const waiterActions = [
    {
      id: "call",
      title: "طلب حضور الويتر إلى الطاولة",
      desc: "حضور الكابتن للمساعدة أو أخذ الطلب يدوياً",
      icon: Bell,
      badge: "عاجل",
    },
    {
      id: "water",
      title: "طلب ماء إضافي / ثلج",
      desc: "إحضار مياه معدنية أو ثلج إضافي للطاولة",
      icon: Droplets,
      badge: "سريع",
    },
    {
      id: "clean",
      title: "تنظيف وتعقيم الطاولة",
      desc: "مسح الطاولة وترتيب المناديل والأكواب",
      icon: Sparkles,
      badge: "نظافة",
    },
    {
      id: "sugar_napkins",
      title: "طلب سكر / مناديل / شاليموه",
      desc: "سكر دايت، سكر أبيض، مناديل إضافية",
      icon: Coffee,
      badge: "ملحقات",
    },
    {
      id: "bill",
      title: "طلب الحساب والفاتورة",
      desc: "إحضار الفاتورة مع ماكينة الدفع بالفيزا أو نقداً",
      icon: Receipt,
      badge: "دفع",
    },
  ];

  return (
    <div className="tbl-modal-backdrop" onClick={onClose}>
      <div className="tbl-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="tbl-modal-header">
          <div className="tbl-modal-title-row">
            <Bell size={20} className="text-coffee-gold" />
            <h3 className="tbl-modal-title">استدعاء الويتر • طاولة رقم {tableNumber}</h3>
          </div>
          <button
            type="button"
            className="tbl-modal-close-btn"
            onClick={onClose}
            aria-label="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="tbl-modal-body">
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--tbl-text-muted)" }}>
            اختر نوع الخدمة المطلوبة وسيصل إليك الكابتن المسؤول عن طاولة رقم {tableNumber} فوراً:
          </p>

          <div className="tbl-waiter-options-list">
            {waiterActions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  type="button"
                  className="tbl-waiter-opt-btn"
                  onClick={() => triggerCallWaiter(act.title)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "#FFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #E8DDCE",
                      }}
                    >
                      <Icon size={18} className="text-coffee-gold" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
                      <strong style={{ fontSize: "0.9rem", color: "var(--tbl-espresso-dark)" }}>
                        {act.title}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--tbl-text-muted)" }}>
                        {act.desc}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        background: "#FFF8EE",
                        color: "var(--tbl-accent-amber)",
                        padding: "2px 6px",
                        borderRadius: "6px",
                      }}
                    >
                      {act.badge}
                    </span>
                    <ChevronLeft size={16} className="text-coffee-gold" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
