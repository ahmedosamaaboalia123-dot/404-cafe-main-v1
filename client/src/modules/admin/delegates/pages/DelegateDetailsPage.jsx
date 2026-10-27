import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, MessageCircle, Pencil, Phone, Trash2, Truck, Undo2 } from "lucide-react";
import { beginOperation, finishOperation } from "@/api/idempotency";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { ordersApi } from "../../orders/api/orders.api";
import DelegateForm from "../components/DelegateForm";
import { deliveryApi } from "../api/delivery.api";
import { buildWhatsappInvoiceUrl } from "../utils/whatsapp";
import "./DelegateDetailsPage.css";

const msg = (e) => e?.response?.data?.error?.messageAr || e?.response?.data?.message || e?.message || "حدث خطأ أثناء تحميل البيانات";
const statusLabel = (s) => (s === "ACTIVE" ? "نشط" : "موقوف");
const labels = {
  ASSIGNED: "تم الإسناد",
  IN_PROGRESS: "خرج للتوصيل",
  DELIVERED: "تم التسليم",
  FAILED: "تعذر التوصيل",
  RETURNED: "عاد للمحل",
  REASSIGNED: "نقل لمندوب آخر",
};
const OPEN_STATES = ["ASSIGNED", "IN_PROGRESS"];

export default function DelegateDetailsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(Boolean(location.state?.edit));
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await deliveryApi.delegate(id));
      setError("");
    } catch (e) {
      setError(msg(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (assignment, action, call) => {
    if (!assignment?.id) return;
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
    run(a, "deliver", (key) => deliveryApi.deliver(a.id, { expectedVersion: a.version ?? 0 }, key));

  const updateDelegate = async (payload) => {
    setSaving(true);
    try {
      const opScope = `delegate:update:${id}`;
      await deliveryApi.updateDelegate(
        id,
        { name: payload.name, maxActiveOrders: payload.maxActiveOrders, expectedVersion: data?.delegate?.version ?? 0 },
        beginOperation(opScope)
      );
      finishOperation(opScope);
      setEditing(false);
      setError("");
      await load();
    } catch (e) {
      setError(msg(e));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!archiving) return;
    const d = data?.delegate ?? {};
    const deactivating = d.status === "ACTIVE";
    if (deactivating && archiving.reason.trim().length < 3) {
      setError("سبب الإيقاف مطلوب (3 أحرف على الأقل)");
      return;
    }
    setSaving(true);
    try {
      const opScope = `delegate:status:${id}`;
      await deliveryApi.updateDelegate(
        id,
        {
          status: deactivating ? "INACTIVE" : "ACTIVE",
          ...(deactivating ? { reason: archiving.reason.trim() } : {}),
          expectedVersion: d.version ?? 0,
        },
        beginOperation(opScope)
      );
      finishOperation(opScope);
      setArchiving(null);
      setError("");
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async (a) => {
    const delegatePhone = data?.delegate?.phone;
    const popup = window.open("about:blank", "_blank");
    try {
      const print = await ordersApi.print(a.orderId);
      const orderNumber = print?.order?.orderNumber || a.orderId;
      const invoiceLink = `${window.location.origin}/customer/orders/${encodeURIComponent(orderNumber)}/track`;
      const url = buildWhatsappInvoiceUrl(delegatePhone, print, invoiceLink);
      if (!url) throw new Error("رقم واتساب المندوب غير صالح");
      if (popup) popup.location.href = url;
      try {
        await run(a, "whatsapp", (key) =>
          deliveryApi.recordWhatsapp(a.id, { expectedVersion: a.version ?? 0 }, key)
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
      <button disabled={busy === a.id} onClick={() => sendInvoice(a)}>
        <MessageCircle size={15} /> إرسال الفاتورة للمندوب
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="delegate-details-page">
        <PageHeader title="المندوب" breadcrumbs={["الإدارة", "المناديب"]} icon={Truck} />
        <div className="delegate-details-content">
          <div className="dd-loading">جاري تحميل بيانات المندوب...</div>
        </div>
      </div>
    );
  }

  if (!data?.delegate) {
    return (
      <div className="delegate-details-page">
        <PageHeader title="المندوب" breadcrumbs={["الإدارة", "المناديب"]} icon={Truck} />
        <div className="delegate-details-content">
          {error && <p role="alert" className="dd-error">{error}</p>}
          <button className="dd-back" onClick={() => nav("/admin/delegates")}>
            <ArrowRight /> رجوع لقائمة المناديب
          </button>
        </div>
      </div>
    );
  }

  const d = data.delegate;
  const activeOrders = Array.isArray(data.activeOrders) ? data.activeOrders : [];
  const history = Array.isArray(data.history) ? data.history : [];

  return (
    <div className="delegate-details-page">
      <PageHeader
        title={`${d.name || "المندوب"} — المندوب`}
        breadcrumbs={["الإدارة", "المناديب", d.name || ""]}
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
          <div className="dd-profile__top">
            <div className="dd-avatar">{String(d.name || "؟").trim().charAt(0) || "؟"}</div>
            <div className="dd-profile__name">
              <h2>{d.name || "—"}</h2>
              <p className="dd-phone">
                <Phone size={16} /> <span dir="ltr">{d.phone || "—"}</span>
              </p>
            </div>
            <span className={`delegate-status ${d.status === "ACTIVE" ? "delegate-status--available" : "delegate-status--unavailable"}`}>
              {statusLabel(d.status)}
            </span>
          </div>
          <div className="dd-stats">
            <span className="dd-stat">الطلبات النشطة<strong>{d.activeOrderCount ?? activeOrders.length ?? 0}/{d.maxActiveOrders ?? "—"}</strong></span>
            <span className="dd-stat">تم التوصيل<strong>{d.deliveredCount ?? 0}</strong></span>
            <span className="dd-stat">السعة القصوى<strong>{d.maxActiveOrders ?? "—"}</strong></span>
          </div>
          <div className="dd-actions">
            <button type="button" onClick={() => setEditing(!editing)}>
              <Pencil size={15} /> تعديل
            </button>
            <button
              type="button"
              className={d.status === "ACTIVE" ? "dd-danger" : undefined}
              onClick={() => setArchiving({ reason: "" })}
            >
              {d.status === "ACTIVE" ? (
                <><Trash2 size={15} /> إيقاف</>
              ) : (
                <><Undo2 size={15} /> استعادة</>
              )}
            </button>
          </div>
        </section>
        {editing && (
          <DelegateForm
            initial={d}
            busy={saving}
            onCancel={() => setEditing(false)}
            onSubmit={updateDelegate}
          />
        )}
        {archiving && (
          <div className="delegate-modal-backdrop" role="dialog" aria-modal="true" aria-label="تأكيد تغيير الحالة">
            <div className="delegate-modal">
              <h2>{d.status === "ACTIVE" ? "إيقاف المندوب" : "استعادة المندوب"}</h2>
              <p>
                {d.name} — <span dir="ltr">{d.phone}</span>
              </p>
              {d.status === "ACTIVE" && (
                <label className="delegate-modal-reason">
                  سبب الإيقاف
                  <input
                    value={archiving.reason}
                    onChange={(e) => setArchiving({ reason: e.target.value })}
                    placeholder="مثال: انتهاء التعاون"
                    minLength={3}
                  />
                </label>
              )}
              <div className="delegate-modal-actions">
                <button type="button" onClick={() => setArchiving(null)}>
                  إلغاء
                </button>
                <button type="button" className="delegate-modal-confirm" disabled={saving} onClick={changeStatus}>
                  {saving ? "جاري الحفظ..." : "تأكيد"}
                </button>
              </div>
            </div>
          </div>
        )}
        <section className="dd-orders">
          <h2>الطلبات النشطة ({activeOrders.length})</h2>
          {activeOrders.length ? activeOrders.map((a) => (
            <article key={a.id} className="dd-order-card">
              <h3>
                <span>{a.assignmentNo || a.id} — {labels[a.status] || a.status || "—"}</span>
                <span className="dd-order-status">{labels[a.status] || a.status || "—"}</span>
              </h3>
              <p>
                الطلب: {a.orderId || "—"} | الكاش: {a.cashExpected ?? "—"} ج.م
              </p>
              {actionButtons(a)}
            </article>
          )) : <p>لا توجد طلبات نشطة</p>}
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
                {history.map((a) => (
                  <tr key={a.id}>
                    <td data-label="رقم الإسناد">{a.assignmentNo || a.id}</td>
                    <td data-label="الحالة">{labels[a.status] || a.status}</td>
                    <td data-label="السبب">{a.reason || "—"}</td>
                    <td data-label="الإجراءات">{actionButtons(a)}</td>
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
