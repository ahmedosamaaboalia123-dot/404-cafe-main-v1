import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function WaiterSuccessPopup({
  tableNumber,
  reason,
  title,
  message,
  tone = "success",
  onClose,
}) {
  const isError = tone === "error";
  const autoDismiss = !isError;
  React.useEffect(() => {
    if (!autoDismiss) return undefined;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose, autoDismiss]);
  const heading = title || (isError ? "تعذر إرسال الطلب" : "تم إرسال طلبك بنجاح");
  const body =
    message ||
    (isError
      ? "حدثت مشكلة أثناء إرسال الطلب، حاول مرة أخرى"
      : `${reason ? `${reason} — ` : ""}الجرسون في الطريق إلى طاولة رقم ${tableNumber}`);

  return (
    <div className="tbl-modal-backdrop" onClick={isError ? undefined : onClose}>
      <div
        className="tbl-modal-card"
        style={{ maxWidth: "380px", textAlign: "center", padding: "28px 22px", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
        role="alert"
      >
        {isError ? (
          <AlertTriangle size={52} style={{ color: "#C81E1E", margin: "0 auto 12px" }} />
        ) : (
          <CheckCircle2 size={52} style={{ color: "#2E7D32", margin: "0 auto 12px" }} />
        )}
        <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#2C1E16" }}>
          {heading}
        </h3>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#7A695C" }}>
          {body}
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: "48px",
            marginTop: "18px",
            borderRadius: "12px",
            background: "#2C1E16",
            color: "#FFFFFF",
            border: "none",
            fontSize: "0.95rem",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          تمام
        </button>
      </div>
    </div>
  );
}
