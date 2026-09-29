import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Receipt, ChevronLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { useTable } from "../../context/TableContext";

export default function TableActiveOrderHeroBar({ onOpenInvoice }) {
  const navigate = useNavigate();
  const { tableNumber, activeOrder } = useTable();

  if (!activeOrder) return null;

  return (
    <div
      className="table-active-order-pinned-bar"
      style={{
        background: "linear-gradient(135deg, #2B211B 0%, #45250E 100%)",
        color: "#FFFFFF",
        padding: "12px 20px",
        margin: "0 0 16px 0",
        borderRadius: "16px",
        boxShadow: "0 8px 24px rgba(43, 33, 27, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        border: "1px solid rgba(194, 155, 114, 0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "rgba(224, 122, 95, 0.2)",
            border: "1px solid #E07A5F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#E07A5F",
          }}
        >
          <Clock size={20} className="animate-pulse" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800 }}>
              طلب نشط #{activeOrder.orderNumber}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                background: "#E07A5F",
                color: "#FFFFFF",
                padding: "2px 8px",
                borderRadius: "20px",
                fontWeight: 700,
              }}
            >
              طاولة {tableNumber}
            </span>
          </div>
          <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#EDE3D8" }}>
            الحالة: {activeOrder.statusText || "قيد التحضير في البار"} • الوقت المتوقع: {activeOrder.estimatedTime || "8 دقائق"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          onClick={() => onOpenInvoice && onOpenInvoice(activeOrder)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255, 255, 255, 0.12)",
            color: "#FFFFFF",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <Receipt size={16} />
          <span>الفاتورة</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/table/${tableNumber}/orders`)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#E07A5F",
            color: "#FFFFFF",
            border: "none",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(224, 122, 95, 0.3)",
          }}
        >
          <span>تتبع الطلب</span>
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}
