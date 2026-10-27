import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, Search, Trash2, Truck, Undo2 } from "lucide-react";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { ServerPagination } from "@/shared/components";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import DelegateForm from "../components/DelegateForm";
import { deliveryApi } from "../api/delivery.api";
import "./DelegatesPage.css";

const msg = (e) => e?.response?.data?.error?.messageAr || e?.response?.data?.message || e?.message || "حدث خطأ أثناء تحميل البيانات";
const statusLabel = (s) => (s === "ACTIVE" ? "نشط" : "موقوف");
const totalCount = (d) => d?.summary?.total ?? d?.pageMeta?.total ?? d?.total ?? (Array.isArray(d?.delegates) ? d.delegates.length : 0);

export default function DelegatesPage() {
  const nav = useNavigate();
  const scope = useRef("delegate:create");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [data, setData] = useState({ delegates: [], pageMeta: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await deliveryApi.screen({ page, limit: 10, search: search.trim() || undefined, status }));
      setError("");
    } catch (e) {
      setError(msg(e));
      setData({ delegates: [], pageMeta: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [page, search, status]);

  const create = async (payload) => {
    setSaving(true);
    try {
      await deliveryApi.createDelegate(payload, beginOperation(scope.current));
      finishOperation(scope.current);
      await load();
    } catch (x) {
      setError(msg(x));
      throw x;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!archiving) return;
    const d = archiving.delegate;
    const deactivating = d.status === "ACTIVE";
    if (deactivating && archiving.reason.trim().length < 3) {
      setError("سبب الإيقاف مطلوب (3 أحرف على الأقل)");
      return;
    }
    setConfirming(true);
    try {
      const opScope = `delegate:status:${d.id}`;
      const key = beginOperation(opScope);
      await deliveryApi.updateDelegate(
        d.id,
        { status: deactivating ? "INACTIVE" : "ACTIVE", ...(deactivating ? { reason: archiving.reason.trim() } : {}), expectedVersion: d.version ?? 0 },
        key
      );
      finishOperation(opScope);
      setArchiving(null);
      setError("");
      await load();
    } catch (x) {
      setError(msg(x));
    } finally {
      setConfirming(false);
    }
  };

  const changeFilter = (v) => { setStatus(v); setPage(1); };
  const rows = Array.isArray(data?.delegates) ? data.delegates : [];

  return (
    <div className="delegates-page">
      <PageHeader title="المناديب" breadcrumbs={["الإدارة", "المناديب"]} icon={Truck} />
      <div className="delegates-content">
        <DelegateForm onSubmit={create} busy={saving} />
        {error && <p role="alert" className="delegates-error">{error}</p>}
        {loading ? (
          <div className="delegates-loading">جاري تحميل المناديب...</div>
        ) : (
          <section className="delegates-list">
            <div className="delegates-list__header">
              <h2>قائمة المناديب ({totalCount(data)})</h2>
              <label>
                <Search size={16} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="ابحث بالاسم أو الهاتف"
                />
              </label>
              <select
                className="delegates-status-filter"
                value={status}
                onChange={(e) => changeFilter(e.target.value)}
                aria-label="تصفية حسب الحالة"
              >
                <option value="ACTIVE">نشط</option>
                <option value="INACTIVE">موقوف</option>
              </select>
            </div>
            <div className="delegates-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الهاتف</th>
                    <th>نشط</th>
                    <th>تم التوصيل</th>
                    <th>السعة</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((d) => {
                    const active = d.status === "ACTIVE";
                    return (
                      <tr key={d.id} onClick={() => nav(`/admin/delegates/${d.id}`)}>
                        <td data-label="المندوب">{d.name || "—"}</td>
                        <td data-label="الهاتف" dir="ltr">{d.phone || "—"}</td>
                        <td data-label="نشط">{d.activeOrderCount ?? 0}</td>
                        <td data-label="تم التوصيل">{d.deliveredCount ?? 0}</td>
                        <td data-label="السعة">{d.activeOrderCount ?? 0}/{d.maxActiveOrders ?? "—"}</td>
                        <td data-label="الحالة">
                          <span className={`delegate-status ${active ? "delegate-status--available" : "delegate-status--unavailable"}`}>
                            {statusLabel(d.status)}
                          </span>
                        </td>
                        <td className="delegate-actions-cell" data-label="إجراءات">
                          <div className="delegate-row-actions">
                            <button
                              type="button"
                              className="delegate-edit-btn"
                              title="تعديل"
                              aria-label="تعديل"
                              onClick={(event) => {
                                event.stopPropagation();
                                nav(`/admin/delegates/${d.id}`, { state: { edit: true } });
                              }}
                            >
                              <Pencil size={14} /> تعديل
                            </button>
                            <button
                              type="button"
                              className={active ? "delegate-archive-btn" : "delegate-restore-btn"}
                              title={active ? "إيقاف" : "استعادة"}
                              aria-label={active ? "إيقاف" : "استعادة"}
                              onClick={(event) => {
                                event.stopPropagation();
                                setArchiving({ delegate: d, reason: "" });
                              }}
                            >
                              {active ? <Trash2 size={14} /> : <Undo2 size={14} />}
                              {active ? "إيقاف" : "استعادة"}
                            </button>
                            <button
                              type="button"
                              className="delegate-open-btn"
                              aria-label={`فتح صفحة ${d.name || ""}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                nav(`/admin/delegates/${d.id}`);
                              }}
                            >
                              <ChevronLeft size={16} /> فتح
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="7" className="delegates-empty">لا يوجد مناديب مطابقون للبحث.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ServerPagination meta={data.pageMeta} label="مندوب" onPageChange={setPage} />
          </section>
        )}
      </div>
      {archiving && (
        <div className="delegate-modal-backdrop" role="dialog" aria-modal="true" aria-label="تأكيد تغيير الحالة">
          <div className="delegate-modal">
            <h2>{archiving.delegate.status === "ACTIVE" ? "إيقاف المندوب" : "استعادة المندوب"}</h2>
            <p>{archiving.delegate.name} — <span dir="ltr">{archiving.delegate.phone}</span></p>
            {archiving.delegate.status === "ACTIVE" && (
              <label className="delegate-modal-reason">
                سبب الإيقاف
                <input
                  value={archiving.reason}
                  onChange={(e) => setArchiving({ ...archiving, reason: e.target.value })}
                  placeholder="مثال: انتهاء التعاون"
                  minLength={3}
                />
              </label>
            )}
            <div className="delegate-modal-actions">
              <button type="button" onClick={() => setArchiving(null)}>إلغاء</button>
              <button type="button" className="delegate-modal-confirm" disabled={confirming} onClick={changeStatus}>
                {confirming ? "جاري الحفظ..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
