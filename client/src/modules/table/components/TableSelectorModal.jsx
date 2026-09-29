import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Check,
  ArrowRightLeft,
  Sparkles,
  MapPin,
  Coffee,
} from "lucide-react";
import { useTable } from "../context/TableContext";
import { AVAILABLE_TABLES } from "../data/tableData";

export default function TableSelectorModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { tableNumber, changeTableNumber } = useTable();
  const [selectedSection, setSelectedSection] = useState("all");

  if (!isOpen) return null;

  const sections = [
    { id: "all", title: "جميع الطاولات" },
    { id: "inside", title: "الصالة الداخلية" },
    { id: "terrace", title: "التراس الخارجي" },
  ];

  const filteredTables = AVAILABLE_TABLES.filter((tbl) => {
    if (selectedSection === "inside") return tbl.section.includes("الداخلية");
    if (selectedSection === "terrace") return tbl.section.includes("الخارجي") || tbl.section.includes("المذاكرة");
    return true;
  });

  const handleSelect = (num) => {
    changeTableNumber(num);
    navigate(`/table/${num}`);
  };

  return (
    <div className="tbl-modal-backdrop" onClick={onClose}>
      <div className="tbl-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="tbl-modal-header">
          <div className="tbl-modal-title-row">
            <ArrowRightLeft size={20} className="text-coffee-gold" />
            <h3 className="tbl-modal-title">اختيار أو تغيير رقم الطاولة</h3>
          </div>
          <button
            type="button"
            className="tbl-modal-close-btn"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="tbl-modal-body">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#FFF8EE",
              border: "1.5px solid var(--tbl-accent-amber)",
              borderRadius: "14px",
              padding: "10px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} className="text-coffee-gold" />
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--tbl-espresso-dark)" }}>
                الطاولة المحددة حالياً: <strong>طاولة رقم {tableNumber}</strong>
              </span>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--tbl-accent-amber)",
              }}
            >
              نشطة الآن
            </span>
          </div>

          {/* Section Filter Pills */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSection(sec.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  border: selectedSection === sec.id ? "1.5px solid var(--tbl-espresso-dark)" : "1px solid #E8DDCE",
                  background: selectedSection === sec.id ? "var(--tbl-espresso-dark)" : "#FAF6F0",
                  color: selectedSection === sec.id ? "#FFFFFF" : "var(--tbl-text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                {sec.title}
              </button>
            ))}
          </div>

          {/* Tables Grid */}
          <div className="tbl-tables-grid-picker">
            {filteredTables.map((tbl) => {
              const isCurrent = tbl.number === tableNumber;
              return (
                <button
                  key={tbl.number}
                  type="button"
                  className={`tbl-table-picker-item ${isCurrent ? "active" : ""}`}
                  onClick={() => handleSelect(tbl.number)}
                  title={`طاولة رقم ${tbl.number} - ${tbl.capacity} مقاعد`}
                >
                  <span className="tbl-picker-num">{tbl.number}</span>
                  <span className="tbl-picker-label">{tbl.capacity} أفراد</span>
                </button>
              );
            })}
          </div>

          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--tbl-text-muted)", textAlign: "center" }}>
            💡 عند مسح QR Code الخاص بأي طاولة داخل الفرع، سيتم التبديل إليها تلقائياً.
          </p>
        </div>
      </div>
    </div>
  );
}
