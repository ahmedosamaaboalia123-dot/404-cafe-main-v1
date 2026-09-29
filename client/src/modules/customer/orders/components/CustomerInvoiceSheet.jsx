import {
  Coffee,
  CreditCard,
  QrCode,
  MapPin,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

const getStatusBadge = (order) => {
  switch (String(order.status || "").toLowerCase()) {
    case "ready":
      return { bg: "#EBF7EE", color: "#1E7E34", border: "#C3E6CB", icon: CheckCircle2, text: "جاهز للتسليم" };
    case "pending":
    case "confirmed":
    case "in_progress":
    case "preparing":
      return { bg: "#FFF6E5", color: "#B76E00", border: "#FFE2B3", icon: Clock, text: "جاري التحضير" };
    case "completed":
    case "delivered":
      return { bg: "#E8F4FD", color: "#0B6BCB", border: "#BCE0FD", icon: CheckCircle2, text: "تم التسليم بنجاح" };
    case "out_for_delivery":
    case "assigned_to_delegate":
      return { bg: "#FFF6E5", color: "#B76E00", border: "#FFE2B3", icon: Clock, text: "في الطريق للتوصيل" };
    case "cancelled":
      return { bg: "#FDE8E8", color: "#C81E1E", border: "#F8B4B4", icon: AlertCircle, text: "تم الإلغاء" };
    default:
      return { bg: "#F4F1EA", color: "#5C4A3E", border: "#E0D7C9", icon: Coffee, text: order.statusText || "جاري التحضير" };
  }
};

/**
 * The printable customer receipt.
 *
 * Rendered twice from a single source of truth: once inside the preview modal and
 * once inside the shared print layer, so what the customer sees on screen is
 * exactly what comes out of the printer.
 */
export default function CustomerInvoiceSheet({ order }) {
  if (!order) return null;

  const statusBadge = getStatusBadge(order);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="invoice-printable-body print-sheet">
      {/* 1. Official Coffee Shop Receipt Header */}
      <div className="invoice-brand-header">
        <div className="invoice-brand-badge">
          <span className="brand-404-tag">404</span>
          <span className="brand-coffee-tag">COFFEE</span>
          <span className="brand-est-tag">EST. 2025</span>
        </div>
        <h2 className="invoice-main-heading">فاتورة إلكترونية ضريبية مبسطة</h2>
        <p className="invoice-sub-branch">
          {order.branch || "فرع إيتاي البارود - البحيرة (شارع الجمهورية)"}
        </p>
        <div className="invoice-tax-meta-row">
          <span>الرقم الضريبي: 404-892-311</span>
          <span className="meta-separator">•</span>
          <span>س.ت: 2025/1198</span>
        </div>
      </div>

      <div className="invoice-dashed-divider" />

      {/* 2. Order Primary Meta Details */}
      <div className="invoice-order-meta-grid">
        <div className="invoice-meta-item">
          <span className="meta-lbl">رقم الطلب / الفاتورة</span>
          <strong className="meta-val highlight-order-id">{order.id}</strong>
        </div>

        <div className="invoice-meta-item">
          <span className="meta-lbl">تاريخ ووقت الطلب</span>
          <strong className="meta-val">{order.dateFormatted}</strong>
        </div>

        <div className="invoice-meta-item">
          <span className="meta-lbl">نوع الطلب</span>
          <strong className="meta-val order-type-chip">{order.orderTypeText}</strong>
        </div>

        <div className="invoice-meta-item">
          <span className="meta-lbl">حالة الطلب</span>
          <span
            className="invoice-status-pill"
            style={{ backgroundColor: statusBadge.bg, color: statusBadge.color, borderColor: statusBadge.border }}
          >
            <StatusIcon size={14} />
            <span>{statusBadge.text}</span>
          </span>
        </div>
      </div>

      {/* 3. Customer & Payment Information */}
      <div className="invoice-info-card-box">
        <div className="invoice-info-row">
          <div className="info-sub-item">
            <User size={15} className="info-icon" />
            <div>
              <span className="info-sub-label">اسم العميل</span>
              <span className="info-sub-value">{order.customerInfo?.name || "عميل"}</span>
            </div>
          </div>

          {order.customerInfo?.phone && (
            <div className="info-sub-item">
              <Phone size={15} className="info-icon" />
              <div>
                <span className="info-sub-label">رقم الهاتف</span>
                <span className="info-sub-value dir-ltr">{order.customerInfo.phone}</span>
              </div>
            </div>
          )}
        </div>

        <div className="invoice-info-row mt-2">
          <div className="info-sub-item">
            <CreditCard size={15} className="info-icon" />
            <div>
              <span className="info-sub-label">طريقة الدفع</span>
              <span className="info-sub-value">
                {order.paymentMethodText} ({order.paymentStatusText})
              </span>
            </div>
          </div>

          {order.customerInfo?.address && (
            <div className="info-sub-item">
              <MapPin size={15} className="info-icon" />
              <div>
                <span className="info-sub-label">العنوان / الاستلام</span>
                <span className="info-sub-value">{order.customerInfo.address}</span>
              </div>
            </div>
          )}
        </div>

        {order.customerInfo?.notes && (
          <div className="invoice-note-bubble">
            <strong>ملاحظة العميل:</strong> {order.customerInfo.notes}
          </div>
        )}
      </div>

      <div className="invoice-dashed-divider" />

      {/* 4. Ordered Items Breakdown Table */}
      <div className="invoice-items-section">
        <div className="invoice-section-title-row">
          <Coffee size={17} className="text-coffee-primary" />
          <h4 className="invoice-section-title">تفاصيل الأصناف والطلبات</h4>
        </div>

        <div className="invoice-table-wrap">
          <table className="invoice-products-table">
            <thead>
              <tr>
                <th className="th-item">الصنف والتخصيص</th>
                <th className="th-qty">الكمية</th>
                <th className="th-unit-price">السعر</th>
                <th className="th-total">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => {
                const cust = item.customizations || {};
                const hasCustomizations =
                  cust.size || cust.sugar || cust.milk || (cust.addons && cust.addons.length > 0) || cust.notes;

                return (
                  <tr key={item.id || idx} className="invoice-item-row">
                    <td className="td-item-info">
                      <div className="invoice-item-title-wrap">
                        <span className="invoice-item-name">{item.name}</span>
                        {item.englishName && <span className="invoice-item-sub">{item.englishName}</span>}
                      </div>

                      {hasCustomizations && (
                        <div className="invoice-item-cust-tags">
                          {cust.size && <span className="cust-pill">الحجم: {cust.size}</span>}
                          {cust.sugar && <span className="cust-pill">السكر: {cust.sugar}</span>}
                          {cust.milk && cust.milk !== "بدون" && <span className="cust-pill">الحليب: {cust.milk}</span>}
                          {cust.addons && cust.addons.length > 0 && (
                            <span className="cust-pill addon-pill">
                              + {cust.addons.map((addon) => addon.name || addon).join(", ")}
                            </span>
                          )}
                          {cust.notes && <span className="cust-pill note-pill">ملاحظة: {cust.notes}</span>}
                        </div>
                      )}
                    </td>
                    <td className="td-qty font-bold text-center">× {item.quantity}</td>
                    <td className="td-unit-price">
                      {Number(item.unitPrice || item.price || 0).toFixed(2)} EGP
                    </td>
                    <td className="td-total font-bold text-coffee-primary">
                      {Number(
                        item.totalPrice ?? (item.unitPrice || item.price || 0) * (item.quantity || 1)
                      ).toFixed(2)}{" "}
                      EGP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="invoice-dashed-divider" />

      {/* 5. Financial Summary / Calculations */}
      <div className="invoice-financial-summary">
        <div className="summary-row">
          <span className="summary-lbl">المجموع الفرعي (الأصناف):</span>
          <span className="summary-val">{Number(order.pricing?.subtotal || 0).toFixed(2)} EGP</span>
        </div>

        {order.pricing?.serviceFee > 0 && (
          <div className="summary-row">
            <span className="summary-lbl">رسوم الخدمة والتجهيز:</span>
            <span className="summary-val">{Number(order.pricing.serviceFee).toFixed(2)} EGP</span>
          </div>
        )}

        {order.pricing?.deliveryFee > 0 && (
          <div className="summary-row">
            <span className="summary-lbl">خدمة التوصيل:</span>
            <span className="summary-val">{Number(order.pricing.deliveryFee).toFixed(2)} EGP</span>
          </div>
        )}

        {order.pricing?.vat > 0 && (
          <div className="summary-row">
            <span className="summary-lbl">ضريبة القيمة المضافة (14%):</span>
            <span className="summary-val">{Number(order.pricing.vat).toFixed(2)} EGP</span>
          </div>
        )}

        {order.pricing?.discount > 0 && (
          <div className="summary-row discount-row">
            <span className="summary-lbl">
              الخصم الترويجي {order.pricing?.discountCode ? `(${order.pricing.discountCode})` : ""}:
            </span>
            <span className="summary-val">- {Number(order.pricing.discount).toFixed(2)} EGP</span>
          </div>
        )}

        <div className="summary-total-banner">
          <div className="total-text-group">
            <span className="total-main-label">الإجمالي النهائي المستحق</span>
            <span className="total-tax-note">شامل جميع الضرائب والرسوم</span>
          </div>
          <div className="total-price-value">
            <span className="price-num">{Number(order.pricing?.total || 0).toFixed(2)}</span>
            <span className="price-cur">EGP</span>
          </div>
        </div>
      </div>

      {/* 6. Footer QR Code & Thank You Stamp */}
      <div className="invoice-receipt-footer">
        <div className="invoice-qr-box">
          <div className="invoice-qr-graphic">
            <QrCode size={56} className="text-coffee-primary" />
          </div>
          <span className="qr-caption">امسح للتحقق من صحة الفاتورة</span>
        </div>

        <div className="invoice-thankyou-text">
          <p className="thank-primary">شكراً لاختياركم 404 كافيه! نتمنى لكم يوماً رائعاً ☕</p>
          <p className="thank-sub">لأي استفسارات أو شكاوى يرجى الاتصال بنا على: 01098765432</p>
        </div>
      </div>
    </div>
  );
}
