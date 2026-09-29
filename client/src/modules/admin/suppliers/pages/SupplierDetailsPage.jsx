import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Building2, Package, Pencil, Receipt, Trash2, Truck } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { AsyncState, ConfirmAction, ConflictDialog, Money, ServerPagination } from "@/shared/components";
import { isConflict } from "@/api/apiError";
import { can } from "@/modules/auth/permissions/permission";
import { useAuthStore } from "@/store/authStore";
import SupplierEditor from "../components/SupplierEditor";
import { useSupplierDetailsQuery, useSupplierEntriesQuery } from "../hooks/supplier.queries";
import { useCreateSupplierEntry, useDeleteSupplier, useDeleteSupplierEntry, useUpdateSupplierEntry } from "../hooks/supplier.mutations";
import { firstSupplierFormError, supplierEntrySchema, updateEntrySchema } from "../schemas/supplier.schema";
import "./SupplierDetailsPage.css";

const today = () => new Date().toISOString().slice(0, 10);
const operations = {
  DEBT: { label: "تسجيل دين", help: "دين علينا للمورد ولا يحرك الدرج" },
  RECEIVABLE: { label: "تسجيل مستحق لنا", help: "مستحق لنا عند المورد ولا يحرك الدرج" },
  DEBT_PAYMENT: { label: "سداد دين نقدًا", help: "يخصم من رصيد الدين ويظهر في الدرج" },
  RECEIVABLE_COLLECTION: { label: "تحصيل مستحق نقدًا", help: "يخصم من المستحق ويظهر في الدرج" },
};
const kindLabel = (entry) => {
  switch (entry.kind) {
    case "DEBT": return "دين";
    case "RECEIVABLE": return "مستحق";
    case "DEBT_PAYMENT": return "سداد دين";
    case "RECEIVABLE_COLLECTION": return "تحصيل مستحق";
    default: return entry.kind || "—";
  }
};
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("ar-EG");
};

function EntryForm({ supplierId, accountVersion, canWrite }) {
  const [operation, setOperation] = useState("DEBT");
  const [form, setForm] = useState({ amount: "", occurredOn: today(), notes: "" });
  const [validationError, setValidationError] = useState("");
  const mutation = useCreateSupplierEntry(supplierId, {
    onSuccess: () => { setForm({ amount: "", occurredOn: today(), notes: "" }); setValidationError(""); },
  });
  if (!canWrite) return null;
  const submit = (event) => {
    event.preventDefault();
    const parsed = supplierEntrySchema.safeParse({
      kind: operation, amount: form.amount, occurredOn: form.occurredOn,
      notes: form.notes.trim() || undefined, expectedAccountVersion: accountVersion,
    });
    if (!parsed.success) { setValidationError(firstSupplierFormError(parsed)); return; }
    mutation.mutate(parsed.data);
  };
  return (
    <section className="supplier-section">
      <header><Receipt size={19} /><div><h2>تسجيل الديون والمستحقات والدفعات</h2><p>اختر العملية ثم أدخل المبلغ والتاريخ</p></div></header>
      <div className="transaction-operation-tabs" role="group" aria-label="نوع المعاملة">
        {Object.entries(operations).map(([key, item]) => (
          <button type="button" key={key} className={operation === key ? "active" : ""} onClick={() => setOperation(key)}>{item.label}</button>
        ))}
      </div>
      <p className="operation-help">{operations[operation].help}</p>
      <form className="transaction-compact-form" onSubmit={submit}>
        <label className="compact-field"><span>نوع العملية</span><input value={operations[operation].label} readOnly /></label>
        <label className="compact-field"><span>المبلغ</span><input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, amount: event.target.value })); }} /></label>
        <label className="compact-field"><span>التاريخ</span><input type="date" required value={form.occurredOn} onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, occurredOn: event.target.value })); }} /></label>
        <label className="compact-field"><span>ملاحظات</span><input value={form.notes} onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, notes: event.target.value })); }} /></label>
        <div className="compact-form-actions">
          <button disabled={mutation.isPending}>{mutation.isPending ? "جاري الحفظ..." : "حفظ المعاملة"}</button>
          {(validationError || mutation.isError) && !isConflict(mutation.error) && <span role="alert">{validationError || mutation.error?.message}</span>}
        </div>
      </form>
      <ConflictDialog open={mutation.isError && isConflict(mutation.error)} onClose={mutation.resetAttempt} onReload={async () => { mutation.resetAttempt(); }} pending={false} />
    </section>
  );
}

function EntryRow({ entry, accountVersion, canWrite, canDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ amount: entry.amount, occurredOn: entry.occurredOn, notes: entry.notes || "", reason: "" });
  const update = useUpdateSupplierEntry(entry.supplierId, { onSuccess: () => setEditing(false) });
  const remove = useDeleteSupplierEntry(entry.supplierId);
  const submit = (event) => { event.preventDefault(); const parsed = updateEntrySchema.safeParse({ amount: form.amount, occurredOn: form.occurredOn, notes: form.notes.trim() || undefined, reason: form.reason, expectedAccountVersion: accountVersion }); if (parsed.success) update.mutate({ entryId: entry.id, ...parsed.data }); };
  return (
    <>
    <tr>
      <td>{kindLabel(entry)}</td>
      <td><Money value={entry.amount} /></td>
      <td><Money value={entry.debtBalanceAfter} /></td>
      <td><Money value={entry.receivableBalanceAfter} /></td>
      <td>{formatDate(entry.occurredOn)}</td>
      <td>{entry.notes || "—"}</td>
      <td>
        <div className="entry-actions">{canWrite && <button type="button" className="transaction-edit" aria-label="تعديل القيد" onClick={() => setEditing((value) => !value)}><Pencil size={16}/></button>}{canDelete && <ConfirmAction requireReason danger pending={remove.isPending} title="حذف المعاملة" message="سيتم حذف المعاملة وتحديث رصيد المورد تلقائيًا." confirmLabel="حذف" onConfirm={(reason) => remove.mutateAsync({ entryId: entry.id, reason, expectedAccountVersion: accountVersion })}><Trash2 size={16}/><span>حذف</span></ConfirmAction>}</div>
        {(remove.isError || update.isError) && <small className="row-error" role="alert">{remove.error?.message || update.error?.message}</small>}
      </td>
    </tr>
    {editing && <tr><td colSpan="7"><form className="entry-edit-form" onSubmit={submit}><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({...form,amount:e.target.value})}/><input type="date" value={form.occurredOn} onChange={(e) => setForm({...form,occurredOn:e.target.value})}/><input placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})}/><input required minLength="3" placeholder="سبب التعديل" value={form.reason} onChange={(e) => setForm({...form,reason:e.target.value})}/><button disabled={update.isPending}>{update.isPending?"جاري الحفظ...":"حفظ التعديل"}</button><button type="button" onClick={() => setEditing(false)}>إلغاء</button></form></td></tr>}
    </>
  );
}

export default function SupplierDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const [page, setPage] = useState(1);
  const details = useSupplierDetailsQuery(id);
  const ledger = useSupplierEntriesQuery(id, { page, limit: 10 });
  const canUpdate = can(permissions, "suppliers.update");
  const canWrite = can(permissions, "suppliers.account.write");
  const canDeleteSupplier = can(permissions, "suppliers.update");
  const removeSupplier = useDeleteSupplier(id, { onSuccess: () => navigate("/admin/suppliers") });

  if (details.isLoading) return <div className="supplier-state">جاري تحميل المورد...</div>;
  if (details.isError || !details.data?.supplier) return <div className="supplier-state supplier-state--error">تعذر تحميل المورد.</div>;

  const { supplier, account, materials } = details.data;
  const entries = (ledger.data?.items || []);
  const accountVersion = Number(account?.version ?? 0);
  const refetchAll = async () => { await Promise.all([details.refetch(), ledger.refetch()]); };

  return (
    <div className="supplier-details-page">
      <PageHeader title={`المورد: ${supplier.name}`} breadcrumbs={["الموردين", "تفاصيل المورد"]} icon={Truck} />
      <main className="supplier-details-container">
        <div className="supplier-top-actions"><button className="supplier-back-btn" onClick={() => navigate("/admin/suppliers")}><ArrowRight size={17} />رجوع للموردين</button>{canDeleteSupplier && <ConfirmAction danger requireReason pending={removeSupplier.isPending} title="حذف المورد" message="لن يتم الحذف إذا كان المورد مرتبطًا بأي مادة أو فاتورة أو قيد مالي." confirmLabel="حذف المورد" onConfirm={(reason) => removeSupplier.mutateAsync({ reason, expectedVersion: supplier.version })}><Trash2 size={16}/> حذف المورد</ConfirmAction>}</div>

        <section className="supplier-section">
          <header><Building2 size={19} /><div><h2>البيانات الأساسية</h2><p>بيانات المورد والمسؤول وبيانات التعامل</p></div></header>
          <SupplierEditor supplier={supplier} canUpdate={canUpdate} onSaved={refetchAll} onReload={refetchAll} />
        </section>

        <section className="supplier-section">
          <header><Package size={19} /><div><h2>المواد الخام المرتبطة</h2><p>{materials.length} مادة مرتبطة بالمورد</p></div></header>
          <div className="supplier-table-wrap"><table><thead><tr><th>الكود</th><th>المادة الخام</th></tr></thead>
            <tbody>{materials.length ? materials.map((material) => (
              <tr key={material.id}><td>RM-{material.id.slice(-6)}</td><td>{material.name || "—"}</td></tr>
            )) : <tr><td colSpan="2">لا توجد مواد خام مرتبطة بالمورد.</td></tr>}</tbody></table></div>
        </section>

        <section className="supplier-summary">
          <article><span>الدين — للمورد عندنا</span><strong><Money value={account?.debtBalance ?? "0"} /></strong></article>
          <article><span>المستحق — لنا عند المورد</span><strong><Money value={account?.receivableBalance ?? "0"} /></strong></article>
        </section>

        <EntryForm supplierId={supplier.id} accountVersion={accountVersion} canWrite={canWrite} />

        <section className="supplier-section">
          <header><Receipt size={19} /><div><h2>كشف حساب المورد</h2><p>عدّل أو احذف المعاملة وسيتم تحديث الأرصدة تلقائيًا</p></div></header>
          <AsyncState loading={ledger.isLoading} error={ledger.error} onRetry={ledger.refetch} empty={!ledger.isLoading && entries.length === 0} emptyText="لا توجد معاملات مالية.">
            <div className="supplier-table-wrap"><table><thead><tr><th>العملية</th><th>المبلغ</th><th>الدين بعده</th><th>المستحق بعده</th><th>التاريخ</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead>
              <tbody>{entries.map((entry) => <EntryRow key={entry.id} entry={entry} accountVersion={Number(ledger.data?.account?.version ?? accountVersion)} canWrite={canWrite} canDelete={canWrite} />)}</tbody></table></div>
          </AsyncState>
          <ServerPagination meta={ledger.data?.pageMeta} onPageChange={setPage} disabled={ledger.isFetching} label="قيد" />
        </section>
      </main>
    </div>
  );
}
