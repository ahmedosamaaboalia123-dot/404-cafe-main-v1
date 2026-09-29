import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X,
  Home,
  Coffee,
  Receipt,
  Bell,
  Sparkles,
  ArrowRightLeft,
  Star,
  Tag,
  Gamepad2,
  ExternalLink,
  Info,
} from "lucide-react";
import { useTable } from "../context/TableContext";

export default function TableNavDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const {
    tableNumber,
    activeOrder,
    setIsTableSelectorOpen,
    setIsWaiterModalOpen,
  } = useTable();

  if (!isOpen) return null;

  return (
    <div className="customer-drawer-backdrop" onClick={onClose}>
      <div
        className="customer-drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-header-section">
          <div className="drawer-brand-row">
            <div className="drawer-logo-icon">
              <Coffee size={24} />
            </div>
            <div>
              <h2 className="drawer-brand-name">404 COFFEE</h2>
              <span className="drawer-brand-sub">نظام خدمة الطاولات الذكي</span>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Table & Order Info Box in Drawer */}
        <div style={{ padding: "16px 20px 0" }}>
          <div
            style={{
              background: "#FAF6F0",
              border: "1.5px solid #E8DDCE",
              borderRadius: "16px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "1.1rem" }}>🪑</span>
                <strong style={{ fontSize: "0.95rem", color: "#2C1E16" }}>
                  طاولة ضيافة رقم {tableNumber}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsTableSelectorOpen(true);
                }}
                style={{
                  background: "#FFF",
                  border: "1px solid #E8DDCE",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#E5832E",
                  cursor: "pointer",
                }}
              >
                تغيير
              </button>
            </div>

            {activeOrder ? (
              <div
                style={{
                  background: "#EBF7EE",
                  border: "1px solid #A3E0B4",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  fontSize: "0.8rem",
                  color: "#1E7E34",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>طلب نشط: #{activeOrder.orderNumber}</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/table/${tableNumber}/orders/${activeOrder.id}/track`);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#1E7E34",
                    fontWeight: 800,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  تتبع الآن
                </button>
              </div>
            ) : (
              <span style={{ fontSize: "0.75rem", color: "#7A695C" }}>
                لا يوجد طلب نشط حالياً على هذه الطاولة.
              </span>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <div className="drawer-nav-list" style={{ padding: "16px 20px" }}>
          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              navigate(`/table/${tableNumber}`);
            }}
          >
            <Home size={18} />
            <span>الرئيسية (طاولة #{tableNumber})</span>
          </button>

          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              navigate(`/table/${tableNumber}/menu`);
            }}
          >
            <Coffee size={18} />
            <span>قائمة المينيو وتخصيص الطلبات</span>
          </button>

          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              navigate(`/table/${tableNumber}/orders`);
            }}
          >
            <Receipt size={18} />
            <span>طلبات وفواتير طاولة #{tableNumber}</span>
          </button>

          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              navigate(`/table/${tableNumber}/chatbot`);
            }}
          >
            <Sparkles size={18} />
            <span>باريستا الطاولة الذكي (AI Bot)</span>
          </button>

          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              setIsWaiterModalOpen(true);
            }}
          >
            <Bell size={18} />
            <span>استدعاء الويتر إلى الطاولة</span>
          </button>

          <hr style={{ border: "none", borderTop: "1px solid #E8DDCE", margin: "12px 0" }} />

          <button
            type="button"
            className="drawer-nav-item"
            onClick={() => {
              onClose();
              navigate("/customer");
            }}
          >
            <ExternalLink size={18} />
            <span>التبديل إلى طلبات الأونلاين والتوصيل</span>
          </button>
        </div>
      </div>
    </div>
  );
}
