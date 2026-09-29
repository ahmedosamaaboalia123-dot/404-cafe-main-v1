import { QrCode } from "lucide-react";

/**
 * Printable table (dine-in) receipt.
 *
 * Mounted twice from one source of truth: inside the preview modal and inside the
 * shared print layer, so the printed ticket is identical to the on-screen preview.
 */
export default function TableInvoiceSheet({ order }) {
  if (!order) return null;

  const tableNumber = order.tableNumber || 4;

  return (
    <div className="tbl-receipt print-sheet">
      <header className="tbl-receipt__head">
        <h2 className="tbl-receipt__brand">404 COFFEE</h2>
        <p className="tbl-receipt__tagline">كافيه ومحمصة 404 للقهوة المختصة</p>
        <p className="tbl-receipt__branch">فرع إيتاي البارود - البحيرة (شارع الجمهورية)</p>
      </header>

      <div className="tbl-receipt__meta">
        <div>
          <span>رقم الطاولة</span>
          <strong>طاولة #{tableNumber}</strong>
        </div>
        <div>
          <span>رقم الطلب</span>
          <strong>#{order.orderNumber}</strong>
        </div>
        <div>
          <span>كابتن الصالة</span>
          <strong>{order.waiterName || "كابتن سيف"}</strong>
        </div>
        <div>
          <span>التاريخ والوقت</span>
          <strong>{order.dateFormatted}</strong>
        </div>
      </div>

      <section className="tbl-receipt__block">
        <h4 className="print-sheet__title">تفاصيل الأصناف المطلوبة</h4>
        <table className="tbl-receipt__table">
          <thead>
            <tr>
              <th>الصنف</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((it, idx) => (
              <tr key={idx}>
                <td>
                  <span className="tbl-receipt__item-name">{it.name}</span>
                  {it.customizations?.size && (
                    <span className="tbl-receipt__item-meta">
                      {it.customizations.size}
                      {it.customizations.sugar ? ` • ${it.customizations.sugar}` : ""}
                    </span>
                  )}
                </td>
                <td className="tbl-receipt__qty">×{it.quantity}</td>
                <td>{Number(it.unitPrice || it.price || 0).toFixed(2)}</td>
                <td className="tbl-receipt__line-total">
                  {Number(it.totalPrice ?? (it.unitPrice || it.price || 0) * (it.quantity || 1)).toFixed(2)} EGP
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!order.items?.length && <p className="print-sheet__empty">لا توجد أصناف في هذا الطلب.</p>}
      </section>

      <section className="tbl-receipt__totals print-sheet__totals">
        <div className="print-sheet__row">
          <span>المجموع الفرعي</span>
          <span>{order.pricing?.subtotal} EGP</span>
        </div>
        <div className="print-sheet__row">
          <span>خدمة الصالة والضيافة</span>
          <span>{order.pricing?.serviceFee || 15} EGP</span>
        </div>
        <div className="print-sheet__row">
          <span>ضريبة القيمة المضافة (14%)</span>
          <span>{order.pricing?.vat} EGP</span>
        </div>
        {order.pricing?.discount > 0 && (
          <div className="print-sheet__row">
            <span>الخصم المطبق</span>
            <span>-{order.pricing?.discount} EGP</span>
          </div>
        )}
        <div className="print-sheet__total">
          <span>الإجمالي المستحق</span>
          <span>{order.pricing?.total} EGP</span>
        </div>
      </section>

      <p className="tbl-receipt__payment">
        حالة الدفع: {order.paymentStatusText} ({order.paymentMethodText})
      </p>

      <footer className="print-sheet__footer">
        <QrCode size={40} className="tbl-receipt__qr" />
        <p>فاتورة إلكترونية ضريبية معتمدة • شكراً لزيارتكم 404 كافيه!</p>
      </footer>
    </div>
  );
}
