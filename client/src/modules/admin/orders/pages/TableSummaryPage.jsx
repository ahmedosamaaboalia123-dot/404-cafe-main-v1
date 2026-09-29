import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { ConfirmAction, Money, PrintDocument } from "@/shared/components";
import { ordersApi } from "../api/orders.api";
import TableSessionSheet from "../components/TableSessionSheet";
import { useSessionDetails, useTableDetails } from "../hooks/order.queries";
import { useCancelSession, useCloseSession } from "../hooks/order.mutations";
import "../styles/TableSummary.css";

const errorText = (e) => e?.response?.data?.error?.messageAr || e?.message || "تعذر تنفيذ العملية";

const orderStatusText = {
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  READY: "جاهز",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

const itemStatusText = {
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  READY: "جاهز",
  CANCELLED: "ملغي",
};

export default function TableSummaryPage() {
  const { tableNumber: tableId } = useParams();
  const navigate = useNavigate();
  const tableQuery = useTableDetails(tableId);
  const sessionId = tableQuery.data?.session?.id;
  const sessionQuery = useSessionDetails(sessionId);
  const close = useCloseSession();
  const cancel = useCancelSession();
  const [error, setError] = useState("");
  const tableNo = tableQuery.data?.table?.tableNumber || "";
  const session = sessionQuery.data?.session;
  const order = sessionQuery.data?.order;
  const rows = sessionQuery.data?.items || [];
  const occupied = tableQuery.data?.occupancy === "OCCUPIED";

  const closeTable = async () => {
    const amount = String(order?.balanceDue || order?.total || "0");
    try {
      await close.mutateAsync({ sessionId, body: { expectedVersion: session.version, ...(Number(amount) > 0 ? { payment: { method: "CASH", amount } } : {}) } });
      navigate("/admin/orders/tables");
    } catch (e) { setError(errorText(e)); }
  };
  const cancelTable = async (reason) => {
    try {
      await cancel.mutateAsync({ sessionId, body: { reason, expectedVersion: session.version } });
      navigate("/admin/orders/tables");
    } catch (e) { setError(errorText(e)); }
  };

  if (tableQuery.isLoading || (sessionId && sessionQuery.isLoading)) return <p className="table-summary-state">جاري تحميل الطاولة...</p>;

  return (
    <div className="table-summary-page" dir="rtl">
      <PageHeader title={`طاولة ${tableNo}`} breadcrumbs={["الطلبات", "الطاولات", `طاولة ${tableNo}`]} />
      {error && <p role="alert">{error}</p>}
      <div className="table-summary-header">
        <button type="button" className="btn-back" onClick={() => navigate("/admin/orders/tables")}>
          <ArrowRight size={16} />
          رجوع
        </button>
        <span className={`table-summary-occupancy ${occupied ? "table-summary-occupancy--busy" : "table-summary-occupancy--free"}`}>
          {occupied ? "مشغولة" : "فارغة"}
        </span>
      </div>
      {order ? (
        <>
          <section className="table-order-card" aria-label={`طلب ${order.orderNumber}`}>
            <div className="table-order-card__top">
              <strong className="table-order-card__number">طلب {order.orderNumber}</strong>
              <span className={`table-order-card__status table-order-card__status--${order.status}`}>
                {orderStatusText[order.status] || order.status}
              </span>
            </div>
            <div className="table-order-card__meta">
              <span>{rows.length} منتج</span>
              <span className="table-order-card__total">
                الإجمالي: <Money value={order.total} />
              </span>
            </div>
            <ul className="table-order-items">
              {rows.map((x, i) => (
                <li key={`${x.productName}-${i}`} className="table-order-items__row">
                  <span className="table-order-items__name">
                    {x.productName} — {x.sizeName} × {x.quantity}
                  </span>
                  <span className={`table-order-card__status table-order-card__status--${x.status}`}>
                    {itemStatusText[x.status] || x.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <div className="table-summary-actions">
            <button type="button" className="btn-table-action btn-table-action--new" onClick={() => navigate(`/admin/orders/sales/table/${tableId}`)}>
              <Plus size={16} />
              إضافة منتجات
            </button>
            <PrintDocument title={`طاولة ${tableNo}`} loadPrintData={() => ordersApi.sessionPrint(sessionId)} render={(data) => <TableSessionSheet payload={data} />} />
            <ConfirmAction title="إلغاء جلسة الطاولة" requireReason pending={cancel.isPending} danger onConfirm={cancelTable}>
              <span>إلغاء الطلب</span>
            </ConfirmAction>
            <ConfirmAction title="إنهاء الطلب" message="سيتم تحصيل المبلغ نقدًا وإغلاق الطاولة وإنشاء الفاتورة." pending={close.isPending} onConfirm={closeTable}>
              <span>إنهاء وطباعة</span>
            </ConfirmAction>
          </div>
        </>
      ) : (
        <div className="table-summary-empty">
          الطاولة فارغة.
          <button type="button" onClick={() => navigate(`/admin/orders/sales/table/${tableId}`)}>إنشاء طلب</button>
        </div>
      )}
    </div>
  );
}
