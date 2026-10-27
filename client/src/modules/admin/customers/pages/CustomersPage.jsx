import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, Search, Send, Trash2, Undo2, Users } from "lucide-react";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { Money, ServerPagination } from "@/shared/components";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import CustomerForm from "../components/CustomerForm";
import { customersApi } from "../api/customers.api";
import "../styles/CustomersPage.css";

const msg = (e) => e?.response?.data?.error?.messageAr || e?.response?.data?.message || e.message;
const statusLabel = (s) => s === "ACTIVE" ? "نشط" : s === "ARCHIVED" ? "مؤرشف" : s === "BLOCKED" ? "محظور" : s || "—";

export default function CustomersPage() {
  const nav = useNavigate();
  const scope = useRef("customer:create");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [data, setData] = useState({ customers: [], pageMeta: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await customersApi.screen({ page, limit: 10, search: search.trim() || undefined, status }));
      setError("");
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [page, search, status]);

  const create = async (payload) => {
    setSaving(true);
    try {
      await customersApi.create(payload, beginOperation(scope.current));
      finishOperation(scope.current);
      await load();
    } catch (e) {
      setError(msg(e));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const changeFilter = (v) => { setStatus(v); setPage(1); };

  const changeStatus = async () => {
    if (!archiving) return;
    const c = archiving;
    setConfirming(true);
    try {
      const opScope = `customer:status:${c.id}`;
      await customersApi.update(c.id, { status: c.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE", expectedVersion: c.version ?? 0 }, beginOperation(opScope));
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

  const rows = data.customers || [];

  return (
    <div className="customers-page">
      <PageHeader title="إدارة العملاء" breadcrumbs={["الرئيسية", "العملاء"]} />
      <button className="customer-edit-btn" type="button" onClick={() => nav("/admin/customers/marketing")}>
        <Send size={15} /> كتابة الرسائل التسويقية
      </button>

      <div className="customers-form-section">
        <h3>تسجيل عميل جديد</h3>
        <CustomerForm onSubmit={create} busy={saving} />
      </div>

      <div className="customers-list-section">
        <div className="customers-list-head">
          <h3><Users size={18} /> العملاء ({data.summary?.total ?? 0})</h3>
          <div className="customers-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ابحث بالاسم أو الهاتف أو العنوان"
            />
          </div>
          <select
            className="customers-status-filter"
            value={status}
            onChange={(e) => changeFilter(e.target.value)}
            aria-label="تصفية حسب الحالة"
          >
            <option value="ACTIVE">نشط</option>
            <option value="ARCHIVED">مؤرشف</option>
            <option value="BLOCKED">محظور</option>
          </select>
        </div>

        {error && <p role="alert" className="delegates-error">{error}</p>}

        {loading ? (
          <p>جاري تحميل العملاء...</p>
        ) : (
          <div className="customers-table-wrap">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>العنوان</th>
                  <th>الحالة</th>
                  <th>الطلبات</th>
                  <th>المكتملة</th>
                  <th>إجمالي المشتريات</th>
                  <th className="ct-actions-head">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((c) => (
                    <tr key={c.id} onClick={() => nav(`/admin/customers/${c.id}`)}>
                      <td data-label="الاسم" className="ct-name">{c.name || "—"}</td>
                      <td data-label="الهاتف" className="ct-phone">{c.phone || "—"}</td>
                      <td data-label="العنوان" className="ct-address" title={c.address || undefined}>{c.address || "—"}</td>
                      <td data-label="الحالة">
                        <span className={`customer-status customer-status--${String(c.status || "").toLowerCase()}`}>
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td data-label="الطلبات" className="ct-num">{c.orderCount ?? 0}</td>
                      <td data-label="المكتملة" className="ct-num">{c.completedOrderCount ?? 0}</td>
                      <td data-label="إجمالي المشتريات" className="ct-total">
                        <Money value={c.lifetimeValue} />
                      </td>
                      <td className="ct-actions-cell">
                        <div className="ct-row-actions">
                          <button
                            type="button"
                            className="ct-edit-btn"
                            title="تعديل"
                            aria-label="تعديل"
                            onClick={(event) => {
                              event.stopPropagation();
                              nav(`/admin/customers/${c.id}`, { state: { edit: true } });
                            }}
                          >
                            <Pencil size={14} /> تعديل
                          </button>
                          <button
                            type="button"
                            className={c.status === "ACTIVE" ? "ct-archive-btn" : "ct-restore-btn"}
                            title={c.status === "ACTIVE" ? "أرشفة" : "استعادة"}
                            aria-label={c.status === "ACTIVE" ? "أرشفة" : "استعادة"}
                            onClick={(event) => {
                              event.stopPropagation();
                              setArchiving(c);
                            }}
                          >
                            {c.status === "ACTIVE" ? <Trash2 size={14} /> : <Undo2 size={14} />}
                            {c.status === "ACTIVE" ? "أرشفة" : "استعادة"}
                          </button>
                          <button
                            type="button"
                            className="customer-open-btn"
                            aria-label={`فتح صفحة ${c.name || ""}`}
                            title="فتح"
                            onClick={(event) => {
                              event.stopPropagation();
                              nav(`/admin/customers/${c.id}`);
                            }}
                          >
                            <ChevronLeft size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="customers-empty-row">
                    <td colSpan="8">لا يوجد عملاء مطابقون للبحث.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <ServerPagination meta={data.pageMeta} disabled={loading} label="عميل" onPageChange={setPage} />
      </div>

      {archiving && (
        <div className="ct-modal-backdrop" role="dialog" aria-modal="true" aria-label="تأكيد تغيير حالة العميل">
          <div className="ct-modal">
            <h2>{archiving.status === "ACTIVE" ? "أرشفة العميل" : "استعادة العميل"}</h2>
            <p>{archiving.name} — <span dir="ltr">{archiving.phone}</span></p>
            <div className="ct-modal-actions">
              <button type="button" onClick={() => setArchiving(null)}>إلغاء</button>
              <button type="button" className="ct-modal-confirm" disabled={confirming} onClick={changeStatus}>
                {confirming ? "جاري الحفظ..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}