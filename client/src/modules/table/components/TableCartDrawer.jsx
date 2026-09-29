import React from "react";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Coffee,
  Bell,
  Sparkles,
} from "lucide-react";
import { useTable } from "../context/TableContext";

export default function TableCartDrawer({ isOpen, onClose }) {
  const {
    tableNumber,
    tableCart,
    updateCartQuantity,
    removeFromCart,
    setIsWaiterModalOpen,
    totalCartItemsCount,
    submitTableOrder,
  } = useTable();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  if (!isOpen) return null;

  const subtotal = tableCart.reduce(
    (sum, it) => sum + (it.unitPrice || it.price || 0) * (it.quantity || 1),
    0
  );
  const handleCallWaiter = () => {
    if (tableCart.length === 0) return;
    onClose();
    setIsWaiterModalOpen(true);
  };
  const handleSubmitOrder = async () => {
    if (!tableCart.length || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    try { await submitTableOrder(); onClose(); }
    catch (error) { setSubmitError(error?.response?.data?.message || error.message || "تعذر إرسال الطلب"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="tbl-modal-backdrop" onClick={onClose}>
      <div
        className="tbl-modal-card"
        style={{ maxWidth: "520px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="tbl-modal-header">
          <div className="tbl-modal-title-row">
            <ShoppingBag size={20} className="text-coffee-gold" />
            <h3 className="tbl-modal-title">
              سلة طلب طاولة رقم {tableNumber} ({totalCartItemsCount})
            </h3>
          </div>
          <button
            type="button"
            className="tbl-modal-close-btn"
            onClick={onClose}
            aria-label="إغلاق السلة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Table notice */}
          <div
            style={{
              background: "#FAF6F0",
              border: "1px solid #E8DDCE",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "0.82rem",
              color: "#2C1E16",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Sparkles size={16} className="text-coffee-gold" />
            <span>
              ستُرسل السلة كمقترح للجرسون. لن يبدأ التحضير أو خصم المخزون قبل موافقة الإدارة لطاولة رقم <strong>{tableNumber}</strong>.
            </span>
          </div>

          {tableCart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px" }}>
              <Coffee size={44} style={{ color: "#C89058", margin: "0 auto 10px" }} />
              <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#2C1E16" }}>السلة فارغة حالياً</h4>
              <p style={{ fontSize: "0.85rem", color: "#7A695C", marginTop: "4px" }}>
                تصفح قائمة المشروبات والمأكولات واختر ما يناسب ذوقك لطاولة رقم {tableNumber}.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tableCart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E8DDCE",
                    borderRadius: "14px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: "50px", height: "50px", borderRadius: "10px", objectFit: "cover" }}
                      referrerPolicy="no-referrer"
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ fontSize: "0.9rem", color: "#2C1E16" }}>{item.name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "#7A695C" }}>
                        {item.customizations?.type || "عادي"} • {item.customizations?.size || "وسط"}
                      </span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#E5832E", marginTop: "2px" }}>
                        {(item.unitPrice || item.price) * item.quantity} EGP
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "#FAF6F0",
                        border: "1px solid #E8DDCE",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      {item.quantity === 1 ? <Trash2 size={13} color="#C81E1E" /> : <Minus size={13} />}
                    </button>
                    <span style={{ fontSize: "0.9rem", fontWeight: 800, minWidth: "18px", textAlign: "center" }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "#FAF6F0",
                        border: "1px solid #E8DDCE",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Local cart estimate only */}
              <div
                style={{
                  background: "#FAF6F0",
                  borderRadius: "12px",
                  padding: "12px",
                  fontSize: "0.82rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  border: "1px solid #E8DDCE",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#7A695C" }}>إجمالي استرشادي للسلة:</span>
                  <span style={{ fontWeight: 700 }}>{subtotal} EGP</span>
                </div>
                <small style={{ color: "#7A695C" }}>السعر النهائي يثبته الجرسون عند إدخال الطلب.</small>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {tableCart.length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #E8DDCE", background: "#FAF6F0" }}>
            {submitError && <p role="alert" style={{ color: "#a51d1d", margin: "0 0 10px" }}>{submitError}</p>}
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              style={{
                width: "100%",
                height: "48px",
                borderRadius: "12px",
                background: "#2C1E16",
                color: "#FFFFFF",
                border: "none",
                fontSize: "0.95rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <ShoppingBag size={18} />
              <span>{isSubmitting ? "جاري إرسال الطلب..." : `طلب الجرسون لطاولة رقم ${tableNumber}`}</span>
            </button>
            <button type="button" onClick={handleCallWaiter} style={{ width: "100%", minHeight: "44px", marginTop: "8px", border: "1px solid #E8DDCE", borderRadius: "12px", background: "#fff", cursor: "pointer" }}><Bell size={16}/> استدعاء الجرسون بدلًا من ذلك</button>
          </div>
        )}
      </div>
    </div>
  );
}
