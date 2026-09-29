import { formatDecimal } from "@/shared/utils/decimal";

const money = (value) => `${formatDecimal(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

const FULFILLMENT_TEXT = {
  TABLE: "طاولة",
  DINE_IN: "داخل المطعم",
  TAKEAWAY: "تك أواي",
  DELIVERY: "توصيل",
  PICKUP: "استلام",
};

const STATUS_TEXT = {
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  READY: "جاهز",
  OUT_FOR_DELIVERY: "خرج للتوصيل",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

const CHANNEL_TEXT = {
  ONLINE: "أونلاين",
  TABLE: "طاولات",
  DELEGATE: "مندوب",
  POS: "نقطة بيع",
};

const MetaItem = ({ label, value }) => (
  <div>
    <span className="label">{label}</span>
    <span className="value">{value}</span>
  </div>
);

/**
 * Printable order invoice built from the `print-data` payload
 * (`GET /orders/:id/print-data`, also embedded on `GET /invoices/:id/print-data`
 * as `invoice.payload`).
 *
 * Shared by the invoice list, the order history and the customer details page so
 * every printed order document looks the same.
 */
export default function OrderInvoiceSheet({ payload, invoice }) {
  if (!payload) return <p className="print-sheet__empty">لا توجد بيانات فاتورة متاحة للطباعة.</p>;

  const { order = {}, items = [], totals = {}, customer = {}, balanceDue } = payload;

  return (
    <div className="print-sheet__doc">
      <header className="print-sheet__head">
        <div className="print-sheet__brand">404 COFFEE</div>
        <div className="print-sheet__sub">كافيه ومحمصة 404 للقهوة المختصة</div>
        <div className="print-sheet__sub">فرع إيتاي البارود - البحيرة (شارع الجمهورية)</div>
        <h1 className="print-sheet__title" style={{ margin: "6pt 0 0" }}>
          {invoice?.invoiceNumber ? `فاتورة ضريبية مبسطة ${invoice.invoiceNumber}` : "فاتورة ضريبية مبسطة"}
        </h1>
      </header>

      <dl className="print-sheet__meta">
        <MetaItem label="رقم الطلب" value={<span className="print-sheet__num">{order.orderNumber || order.id || "—"}</span>} />
        <MetaItem label="رقم الفاتورة" value={<span className="print-sheet__num">{invoice?.invoiceNumber || "—"}</span>} />
        <MetaItem label="نوع الطلب" value={FULFILLMENT_TEXT[order.fulfillmentType] || order.fulfillmentType || "—"} />
        <MetaItem label="القناة" value={CHANNEL_TEXT[order.channel] || order.channel || "—"} />
        <MetaItem label="الحالة" value={STATUS_TEXT[order.status] || order.status || "—"} />
        {/* Only the invoice endpoint carries an issue date; the order print payload
            has none, so the row is omitted rather than printed as a dash. */}
        {invoice?.finalizedAt && (
          <MetaItem label="تاريخ الإصدار" value={new Date(invoice.finalizedAt).toLocaleString("ar-EG")} />
        )}
        {order.tableSessionId && <MetaItem label="جلسة الطاولة" value={<span className="print-sheet__num">{order.tableSessionId}</span>} />}
        {customer?.name && <MetaItem label="العميل" value={customer.name} />}
        {customer?.phone && <MetaItem label="الهاتف" value={<span className="print-sheet__num">{customer.phone}</span>} />}
        {invoice?.printCount != null && <MetaItem label="مرات الطباعة" value={<span className="print-sheet__num">{invoice.printCount}</span>} />}
      </dl>

      <section className="print-sheet__block">
        <h2 className="print-sheet__title">الأصناف</h2>
        <table className="print-sheet__table">
          <thead>
            <tr>
              <th>الصنف</th>
              <th>الحجم</th>
              <th>الكمية</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.productName + index}>
                <td>{item.productName || "—"}</td>
                <td>{item.sizeName || "—"}</td>
                <td className="print-sheet__num">×{item.quantity ?? 1}</td>
                <td className="print-sheet__num">{money(item.unitSellingPrice)}</td>
                <td className="print-sheet__num">{money(item.lineSubtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="print-sheet__empty">لا توجد أصناف مسجلة على هذه الفاتورة.</p>}
      </section>

      <section className="print-sheet__totals">
        <div className="print-sheet__row">
          <span>المجموع الفرعي</span>
          <span className="print-sheet__num">{money(totals.subtotal)}</span>
        </div>
        {Number(totals.deliveryFee) > 0 && (
          <div className="print-sheet__row">
            <span>رسوم التوصيل</span>
            <span className="print-sheet__num">{money(totals.deliveryFee)}</span>
          </div>
        )}
        {Number(totals.tax) > 0 && (
          <div className="print-sheet__row">
            <span>ضريبة القيمة المضافة</span>
            <span className="print-sheet__num">{money(totals.tax)}</span>
          </div>
        )}
        {Number(totals.discount) > 0 && (
          <div className="print-sheet__row">
            <span>الخصم</span>
            <span className="print-sheet__num">- {money(totals.discount)}</span>
          </div>
        )}
        <div className="print-sheet__total">
          <span>الإجمالي</span>
          <span className="print-sheet__num">{money(totals.total)}</span>
        </div>
        {balanceDue != null && (
          <div className="print-sheet__row">
            <span>المتبقي على العميل</span>
            <span className="print-sheet__num">{money(balanceDue)}</span>
          </div>
        )}
      </section>

      {invoice?.checksum && (
        <p className="print-sheet__note">
          <strong>بصمة التحقق:</strong> <span className="print-sheet__num">{invoice.checksum}</span>
        </p>
      )}

      <footer className="print-sheet__footer">
        <p>فاتورة إلكترونية ضريبية مبسطة صادرة من نظام 404 كافيه.</p>
        <p>شكراً لاختياركم 404 كافيه ☕</p>
      </footer>
    </div>
  );
}
