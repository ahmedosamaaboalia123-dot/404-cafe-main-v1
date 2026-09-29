import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, MessageCircle, Phone, Truck } from "lucide-react";
import { beginOperation, finishOperation } from "@/api/idempotency";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { ordersApi } from "../../orders/api/orders.api";
import { deliveryApi } from "../api/delivery.api";
import { buildWhatsappInvoiceUrl } from "../utils/whatsapp";
import "./DelegateDetailsPage.css";

const msg = (e) => e?.response?.data?.error?.messageAr || e?.response?.data?.message || e.message;
const labels = {
  ASSIGNED: "تم الإسناد",
  IN_PROGRESS: "خرج للتوصيل",
  DELIVERED: "تم التسليم",
  FAILED: "تعذر التوصيل",
  RETURNED: "عاد للمحل",
  REASSIGNED: "نقل لمندوب آخر",
};
// The order is still in the delegate's hands, so delivery can be confirmed or the
// order can be cancelled. Once it is delivered/returned the only thing left to do
// is hand the customer their invoice.
const OPEN_STATES = ["ASSIGNED", "IN_PROGRESS"];

export default function DelegateDetailsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await deliveryApi.delegate(id));
      setError("");
    } catch (e) {
      setError(msg(e));
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (assignment, action, call) => {
    setBusy(assignment.id);
    try {
      const scope = `delivery:${assignment.id}:${action}`;
      await call(beginOperation(scope));
      finishOperation(scope);
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy("");
    }
  };

  const confirmDelivery = (a) =>
    run(a, "deliver", (key) => deliveryApi.deliver(a.id, { expectedVersion: a.version }, key));

  const cancelOrder = async (a) => {
    const reason = window.prompt("سبب إلغاء الطلب؟")?.trim();
    if (!reason) return;
    setBusy(a.id);
    try {
      // The cancel contract needs the order version, which the assignment list
      // does not carry — read it before cancelling.
      const details = await ordersApi.details(a.orderId);
      const order = details?.order ?? details;
      await run(a, "cancel", (key) =>
        ordersApi.cancel(
          a.orderId,
          { reason, expectedVersion: order?.version ?? 0 },
          key
        )
      );
    } catch (e) {
      setError(msg(e));
      setBusy("");
    }
  };

  const sendInvoice = async (a) => {
    const popup = window.open("about:blank", "_blank");
    try {
      const print = await ordersApi.print(a.orderId);
      const orderNumber = print?.order?.orderNumber || a.orderId;
      const invoiceLink = `${window.location.origin}/customer/orders/${encodeURIComponent(
        orderNumber
      )}/track`;
      const url = buildWhatsappInvoiceUrl(d.phone, print, invoiceLink);
      if (!url) throw new Error("رقم واتساب المندوب غير صالح");
      if (popup) popup.location.href = url;
      // Best-effort: recording the share must never stop the chat from opening.
      try {
        await run(a, "whatsapp", (key) =>
          deliveryApi.recordWhatsapp(a.id, { expectedVersion: a.version }, key)
        );
      } catch {}
    } catch (e) {
      popup?.close?.();
      setError(msg(e));
    }
  };

  const actionButtons = (a) => (
    <div className="dd-actions">
      {OPEN_STATES.includes(a.status) && (
        <button disabled={busy === a.id} onClick={() => confirmDelivery(a)}>
          تأكيد التسليم
        </button>
      )}
      {OPEN_STATES.includes(a.status) && (
        <button
          className="dd-danger"
          disabled={busy === a.id}
          onClick={() => cancelOrder(a)}
        >
          إلغاء الطلب
        </button>
      )}
      <button disabled={busy === a.id} onClick={() => sendInvoice(a)}>
        <MessageCircle size={15} /> إرسال الفاتورة للمندوب
      </button>
    </div>
  );

  if (!data)
    return (
      <div className="delegate-details-page">
        <PageHeader title="المندوب" />
        {error || "جاري التحميل..."}
      </div>
    );
  const d = data.delegate;
  return (
    <div className="delegate-details-page">
      <PageHeader
        title={`${d.name} — المندوب`}
        breadcrumbs={["الإدارة", "المناديب", d.name]}
        icon={Truck}
      />
      <div className="delegate-details-content">
        <button className="dd-back" onClick={() => nav("/admin/delegates")}>
          <ArrowRight /> رجوع
        </button>
        {error && (
          <p role="alert" className="dd-error">
            {error}
          </p>
        )}
        <section className="dd-profile">
          <h2>{d.name}</h2>
          <p>
            <Phone size={16} /> {d.phone}
          </p>
          <p>
            الحالة: {d.status} — الطلبات النشطة: {d.activeOrderCount}/{d.maxActiveOrders} — تم
            التوصيل: {d.deliveredCount}
          </p>
        </section>
        <section className="dd-orders">
          <h2>الطلبات النشطة</h2>
          {(data.activeOrders || []).map((a) => (
            <article key={a.id} className="dd-profile">
              <h3>
                {a.assignmentNo} — {labels[a.status]}
              </h3>
              <p>
                الطلب: {a.orderId} | الكاش: {a.cashExpected} ج.م
              </p>
              {actionButtons(a)}
            </article>
          ))}
          {!(data.activeOrders || []).length && <p>لا توجد طلبات نشطة</p>}
          <h2>آخر العمليات</h2>
          <div className="dd-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم الإسناد</th>
                  <th>الحالة</th>
                  <th>السبب</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {(data.history || []).map((a) => (
                  <tr key={a.id}>
                    <td>{a.assignmentNo}</td>
                    <td>{labels[a.status] || a.status}</td>
                    <td>{a.reason || "—"}</td>
                    <td>{actionButtons(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
