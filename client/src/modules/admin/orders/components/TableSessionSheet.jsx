import { formatDecimal } from "@/shared/utils/decimal";

const money = (value) => `${formatDecimal(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

const STATUS_TEXT = {
  OPEN: "مفتوحة",
  CLOSED: "مغلقة",
  CANCELLED: "ملغاة",
};

const ITEM_STATUS_TEXT = {
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  READY: "جاهز",
  CANCELLED: "ملغي",
};

/**
 * Printable table-session order ticket
 * (`GET /table-sessions/:id/print-data`).
 *
 * Each ticket is one `print-sheet__block`-style section, and the print rules keep
 * every section on a single sheet and never let a row split across pages, so
 * printing several tables at once produces separated tickets with no overlap and
 * no blank pages.
 */
export default function TableSessionSheet({ payload }) {
  if (!payload) return <p className="print-sheet__empty">لا توجد بيانات جلسة طاولة متاحة للطباعة.</p>;

  const { session = {}, order = null, items = [], printedAt } = payload;

  return (
    <>
      <section className="print-sheet__doc print-sheet__doc--table">
        <header className="print-sheet__head">
          <div className="print-sheet__brand">404 COFFEE</div>
          <div className="print-sheet__sub">طلب طاولة</div>
          <h1 className="print-sheet__title" style={{ margin: "4pt 0 0" }}>
            طاولة رقم {session.tableNumber ?? "—"}
          </h1>
        </header>

        <dl className="print-sheet__meta">
          <div>
            <span className="label">رقم الطاولة</span>
            <span className="value print-sheet__num">{session.tableNumber ?? "—"}</span>
          </div>
          <div>
            <span className="label">رقم الطلب</span>
            <span className="value print-sheet__num">{order?.orderNumber || "—"}</span>
          </div>
          <div>
            <span className="label">رقم الجلسة</span>
            <span className="value print-sheet__num">{session.sessionNumber || "—"}</span>
          </div>
          <div>
            <span className="label">حالة الجلسة</span>
            <span className="value">{STATUS_TEXT[session.status] || session.status || "—"}</span>
          </div>
          <div>
            <span className="label">وقت الفتح</span>
            <span className="value">{session.openedAt ? new Date(session.openedAt).toLocaleString("ar-EG") : "—"}</span>
          </div>
          <div>
            <span className="label">وقت الطباعة</span>
            <span className="value">{printedAt ? new Date(printedAt).toLocaleString("ar-EG") : new Date().toLocaleString("ar-EG")}</span>
          </div>
        </dl>

        <section className="print-sheet__block">
          <h2 className="print-sheet__title">الأصناف المطلوبة</h2>
          <table className="print-sheet__table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الحجم</th>
                <th>الكمية</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.productName}-${index}`}>
                  <td>{item.productName || "—"}</td>
                  <td>{item.sizeName || "—"}</td>
                  <td className="print-sheet__num">×{item.quantity ?? 1}</td>
                  <td>{ITEM_STATUS_TEXT[item.status] || item.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <p className="print-sheet__empty">لا توجد أصناف على هذه الجلسة.</p>}
        </section>

        <section className="print-sheet__totals">
          <div className="print-sheet__row">
            <span>إجمالي الطلب</span>
            <span className="print-sheet__num">{money(order?.total)}</span>
          </div>
          <div className="print-sheet__row">
            <span>المتبقي على العميل</span>
            <span className="print-sheet__num">{money(order?.balanceDue)}</span>
          </div>
        </section>

        <footer className="print-sheet__footer">
          <p>404 كافيه — فرع إيتاي البارود. شكراً لزيارتكم ☕</p>
        </footer>
      </section>
    </>
  );
}
