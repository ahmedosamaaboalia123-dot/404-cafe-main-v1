import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Boxes } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { ConflictDialog, Money } from "@/shared/components";
import { isConflict } from "@/api/apiError";
import { can } from "@/modules/auth/permissions/permission";
import { useAuthStore } from "@/store/authStore";
import { convertForDisplay, toSmallQuantityString } from "../adapters/inventory.adapter";
import { useMaterialDetailsQuery, useMaterialsScreen, useUnitsQuery } from "../hooks/inventory.queries";
import { useReorderPriorities, useUpdateBatchExpiry, useUpdateMaterial, useWithdrawMaterial } from "../hooks/inventory.mutations";
import { firstInventoryFormError, withdrawFormSchema } from "../schemas/inventory.schema";
import WithdrawnMaterialsTable from "../components/WithdrawnMaterialsTable";
import "./MaterialDetailsPage.css";

const dateValue = (value) => (value ? String(value).slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("ar-EG") : "—");

function GeneralEditor({ material, supplierName, supplierOptions, unitOptions, largeUnitName, smallUnitName, onSaved, onReload, canUpdate }) {
  const [form, setForm] = useState({ name: material.name, supplierId: material.supplierId, largeUnitId: material.largeUnitId, smallUnitId: material.smallUnitId, conversionFactor: material.conversionFactor, smallQuantityStep: material.smallQuantityStep, referenceLargeUnitPrice: material.referenceLargeUnitPrice ?? "", minStockLarge: convertForDisplay(material.minStockSmall, material.conversionFactor, "small-to-large"), expiryAlertDays: material.expiryAlertDays ?? "" });
  const [validationError, setValidationError] = useState("");
  const mutation = useUpdateMaterial(material.id, { onSuccess: onSaved });
  if (!canUpdate) return <dl className="supplier-readonly"><div><dt>اسم المادة</dt><dd>{material.name}</dd></div><div><dt>الحد الأدنى</dt><dd>{convertForDisplay(material.minStockSmall, material.conversionFactor, "small-to-large")}</dd></div><div><dt>التنبيه قبل الصلاحية</dt><dd>{material.expiryAlertDays ?? "—"}</dd></div></dl>;
  const change = (event) => {
    mutation.resetAttempt();
    setValidationError("");
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "largeUnitId" || name === "smallUnitId") {
        const large = unitOptions.find((unit) => String(unit.value) === String(next.largeUnitId));
        const small = unitOptions.find((unit) => String(unit.value) === String(next.smallUnitId));
        const largeFactor = Number(large?.physicalFactor);
        const smallFactor = Number(small?.physicalFactor);
        if (largeFactor > 0 && smallFactor > 0) next.conversionFactor = String(largeFactor / smallFactor);
      }
      return next;
    });
  };
  const submit = (event) => {
    event.preventDefault();
    // The threshold is entered in the large unit; the server stores the small one.
    const activeFactor = material.unitsLocked ? material.conversionFactor : form.conversionFactor;
    const minStockSmall = toSmallQuantityString(form.minStockLarge, activeFactor);
    if (minStockSmall == null) { setValidationError("راجع الحد الأدنى ومعامل التحويل"); return; }
    if (Number(form.minStockLarge) > 0 && Number(minStockSmall) === 0) { setValidationError("الحد الأدنى صغير جدًا مقارنة بالوحدة المختارة"); return; }
    const parsed = {
      name: form.name.trim(), minStockSmall,
      expiryAlertDays: form.expiryAlertDays === "" ? undefined : Number(form.expiryAlertDays),
      expectedVersion: material.version,
    };
    if (!material.unitsLocked) Object.assign(parsed, { supplierId: String(form.supplierId), largeUnitId: String(form.largeUnitId), smallUnitId: String(form.smallUnitId), conversionFactor: String(form.conversionFactor), smallQuantityStep: String(form.smallQuantityStep) });
    if (String(form.referenceLargeUnitPrice).trim()) parsed.referenceLargeUnitPrice = String(form.referenceLargeUnitPrice);
    if (parsed.name.length < 2) { setValidationError("اسم المادة لا يقل عن حرفين"); return; }
    mutation.mutate(parsed);
  };
  return <>
    <form className="edit-form-grid" onSubmit={submit}>
      <div className="edit-field"><label>اسم المادة</label><input className="mat-input" name="name" value={form.name} onChange={change} required /></div>
      <div className="edit-field"><label>المورد {material.unitsLocked ? "(مقفل بعد أول استخدام)" : ""}</label>{material.unitsLocked ? <input className="mat-input" value={supplierName || material.supplierId} readOnly /> : <select className="mat-input" name="supplierId" value={form.supplierId} onChange={change}>{supplierOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</div>
      <div className="edit-field"><label>الوحدة الكبيرة</label>{material.unitsLocked ? <input className="mat-input" value={largeUnitName || material.largeUnitId} readOnly /> : <select className="mat-input" name="largeUnitId" value={form.largeUnitId} onChange={change}>{unitOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}</div>
      <div className="edit-field"><label>الوحدة الصغيرة</label>{material.unitsLocked ? <input className="mat-input" value={smallUnitName || material.smallUnitId} readOnly /> : <select className="mat-input" name="smallUnitId" value={form.smallUnitId} onChange={change}>{unitOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>}</div>
      <div className="edit-field"><label>معامل التحويل (تلقائي)</label><input className="mat-input" name="conversionFactor" value={form.conversionFactor} readOnly onChange={change} required /></div>
      <div className="edit-field"><label>أقل خطوة للوحدة الصغيرة</label><input className="mat-input" name="smallQuantityStep" value={form.smallQuantityStep} readOnly={material.unitsLocked} onChange={change} required /></div>
      <div className="edit-field"><label>السعر المرجعي للوحدة الكبيرة</label><input className="mat-input" name="referenceLargeUnitPrice" value={form.referenceLargeUnitPrice} onChange={change} /></div>
      <div className="edit-field"><label>الحد الأدنى للمخزون (كبيرة)</label><input className="mat-input" name="minStockLarge" type="number" min="0" step="any" value={form.minStockLarge} onChange={change} required /></div>
      <div className="edit-field"><label>التنبيه قبل الصلاحية (أيام)</label><input className="mat-input" name="expiryAlertDays" type="number" min="0" value={form.expiryAlertDays} onChange={change} /></div>
      <div className="form-submit-cell"><button className="btn-save-edit" disabled={mutation.isPending}>{mutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}</button></div>
      {(validationError || mutation.isError) && !isConflict(mutation.error) && <p className="form-api-error grid-message" role="alert">{validationError || mutation.error?.message}</p>}
    </form>
    <ConflictDialog open={mutation.isError && isConflict(mutation.error)} onClose={mutation.resetAttempt} onReload={async () => { mutation.resetAttempt(); await onReload?.(); }} pending={false} />
  </>;
}

function WithdrawForm({ materialId, batches, conversionFactor, canWithdraw }) {
  const [form, setForm] = useState({ batchId: "", quantityLarge: "", reason: "", occurredOn: today() });
  const [validationError, setValidationError] = useState("");
  const mutation = useWithdrawMaterial(materialId, {
    onSuccess: () => { setForm({ batchId: "", quantityLarge: "", reason: "", occurredOn: today() }); setValidationError(""); },
  });
  if (!canWithdraw) return null;
  const selectedBatch = batches.find((item) => String(item.id) === String(form.batchId));
  const submit = (event) => {
    event.preventDefault();
    const parsed = withdrawFormSchema.safeParse({ ...form, expectedBatchVersion: Number(selectedBatch?.version ?? 0) });
    if (!parsed.success) { setValidationError(firstInventoryFormError(parsed)); return; }
    mutation.mutate(parsed.data);
  };
  return (
    <section className="mat-general-card">
      <div className="mat-card-header"><div className="mat-card-title"><ArrowRight size={18} /><span>سحب يدوي من المخزون (نهائي)</span></div></div>
      <form className="edit-form-grid" onSubmit={submit}>
        <div className="edit-field"><label>الدفعة</label><select className="mat-input" value={form.batchId} onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, batchId: event.target.value })); }} required><option value="">اختر الدفعة</option>{batches.filter((item) => Number(item.remainingQuantitySmall) > 0).map((item) => <option value={item.id} key={item.id}>#{item.batchNumber || item.id} — متاح {convertForDisplay(item.remainingQuantitySmall, conversionFactor, "small-to-large")} (كبيرة)</option>)}</select></div>
        <div className="edit-field"><label>الكمية (كبيرة)</label><input className="mat-input" type="number" min="0.000001" step="any" value={form.quantityLarge} onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, quantityLarge: event.target.value })); }} required /></div>
        <div className="edit-field"><label>التاريخ</label><input className="mat-input" type="date" value={form.occurredOn} onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, occurredOn: event.target.value })); }} required /></div>
        <div className="edit-field"><label>سبب السحب</label><input className="mat-input" value={form.reason} onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, reason: event.target.value })); }} required /></div>
        <div className="form-submit-cell"><button className="btn-save-edit" disabled={mutation.isPending}>{mutation.isPending ? "جاري التنفيذ..." : "تأكيد السحب النهائي"}</button></div>
        {(validationError || mutation.isError) && !isConflict(mutation.error) && <p className="form-api-error grid-message" role="alert">{validationError || mutation.error?.message}</p>}
      </form>
      <ConflictDialog open={mutation.isError && isConflict(mutation.error)} onClose={mutation.resetAttempt} onReload={async () => { mutation.resetAttempt(); }} pending={false} />
    </section>
  );
}

function BatchExpiryEditor({ materialId, batch, onSaved }) {
  const [value, setValue] = useState(dateValue(batch.expiryOn));
  const mutation = useUpdateBatchExpiry(materialId, batch.id, { onSuccess: onSaved });
  return (
    <div className="batch-expiry-editor">
      <input
        aria-label={`تاريخ صلاحية الدفعة ${batch.batchNumber || batch.id}`}
        type="date"
        className="mat-input batch-expiry-input"
        value={value}
        disabled={mutation.isPending}
        onChange={(event) => {
          mutation.resetAttempt();
          const next = event.target.value;
          setValue(next);
          mutation.mutate({ expectedBatchVersion: Number(batch.version ?? 0), expiryOn: next || undefined });
        }}
      />
      {mutation.isPending && <span className="batch-expiry-saving">حفظ...</span>}
      {mutation.isError && !isConflict(mutation.error) && <span className="form-api-error" role="alert">{mutation.error?.message}</span>}
      <ConflictDialog open={mutation.isError && isConflict(mutation.error)} onClose={mutation.resetAttempt} onReload={async () => { mutation.resetAttempt(); await onSaved?.(); }} pending={false} />
    </div>
  );
}

export default function MaterialDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const query = useMaterialDetailsQuery(id);
  const reorder = useReorderPriorities(id);
  const canManage = can(permissions, "inventory.manage");
  const canWithdraw = can(permissions, "inventory.withdraw");
  const canPriorities = can(permissions, "inventory.priorities");
  const material = query.data?.material;
  const stockSummary = query.data?.stockSummary;
  const lastPurchasePrice = material?.lastPurchasePrice ?? null;
  const batches = useMemo(() => [...(query.data?.batches?.items || [])].sort((a, b) => Number(a.salePriority) - Number(b.salePriority)), [query.data]);
  // Name maps only (IDs stay the source of truth): units + suppliers lists are cached layer-wide.
  const unitsQuery = useUnitsQuery();
  const screenQuery = useMaterialsScreen({ page: 1, limit: 1 });
  const unitNameOf = useMemo(() => {
    const map = new Map((unitsQuery.data || []).map((unit) => [String(unit.value), unit.label]));
    return (unitId) => map.get(String(unitId || "")) || "";
  }, [unitsQuery.data]);
  const supplierNameOf = useMemo(() => {
    const map = new Map(((screenQuery.data?.filters?.suppliers) || []).map((supplier) => [String(supplier.id), supplier.name]));
    return (supplierId) => map.get(String(supplierId || "")) || "";
  }, [screenQuery.data]);
  const refetch = () => query.refetch();

  const changePriority = (batchId, nextPriority) => {
    if (!material || reorder.isPending) return;
    const ordered = batches.map((item) => String(item.id));
    const currentIndex = ordered.indexOf(String(batchId));
    const targetIndex = Number(nextPriority) - 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length || currentIndex === targetIndex) return;
    const [moved] = ordered.splice(currentIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    reorder.mutate({ expectedPriorityVersion: Number(material.priorityVersion ?? 0), orderedBatchIds: ordered });
  };

  if (query.isLoading) return <div className="data-state">جاري التحميل...</div>;
  if (query.isError || !material) return <div className="data-state data-state--error">تعذر تحميل المادة.</div>;
  return <div className="material-details-page"><PageHeader title={`تفاصيل المادة: ${material.name}`} breadcrumbs={["المخزون", "تفاصيل المادة"]} icon={Boxes} /><div className="material-details-container">
    <button className="btn-back-header" onClick={() => navigate("/admin/inventory")}><ArrowRight size={16} />رجوع</button>
    <section className="mat-general-card"><div className="mat-card-header"><div className="mat-card-title"><Boxes size={18} /><span>البيانات العامة</span></div></div><GeneralEditor key={material.version ?? 0} material={material} supplierName={supplierNameOf(material.supplierId)} supplierOptions={screenQuery.data?.filters?.suppliers || []} unitOptions={unitsQuery.data || []} largeUnitName={unitNameOf(material.largeUnitId)} smallUnitName={unitNameOf(material.smallUnitId)} canUpdate={canManage} onSaved={refetch} onReload={refetch} /></section>
    <section className="mat-summary"><article><span>المخزون (كبيرة)</span><strong>{stockSummary?.stockLarge ?? "—"}</strong><small className="mat-summary__hint">{stockSummary?.stockSmall ? `${stockSummary.stockSmall} صغيرة` : null}</small></article><article><span>آخر سعر شراء</span><strong>{lastPurchasePrice == null ? "—" : <Money value={lastPurchasePrice} />}</strong>{lastPurchasePrice != null && <small className="mat-summary__hint">للوحدة الكبيرة</small>}</article><article><span>أقرب صلاحية</span><strong>{formatDate(material.nextExpiry)}</strong>{!material.nextExpiry && <small className="mat-summary__hint">سجّلها من الدفعات</small>}</article></section>
    <section className="mat-general-card batches-card"><div className="mat-card-header"><div className="mat-card-title"><Boxes size={18} /><span>الدفعات وأولوية السحب</span></div><small className="priority-help">الأولوية 1 تُخصم أولًا — الدفعات تُنشأ من المشتريات ويمكن تعديل الصلاحية يدويًا</small></div><div className="table-responsive batches-responsive"><table className="custom-materials-table batches-table"><thead><tr><th>الدفعة</th><th>الافتتاحية (كبيرة)</th><th>الكمية الكبيرة</th><th>القيمة المتبقية</th><th>الإضافة</th><th>الصلاحية</th><th>الأولوية</th><th>الحالة</th></tr></thead><tbody>{batches.length ? batches.map((item) => <tr key={item.id}><td data-label="الدفعة">#{item.batchNumber || item.id.slice(-6)}</td><td data-label="الافتتاحية">{convertForDisplay(item.initialQuantitySmall, material.conversionFactor, "small-to-large")}</td><td data-label="الكمية الكبيرة" className="quantity-large-cell">{convertForDisplay(item.remainingQuantitySmall, material.conversionFactor, "small-to-large")}</td><td data-label="القيمة المتبقية"><Money value={item.remainingInventoryValue} /></td><td data-label="الإضافة">{formatDate(item.receivedOn)}</td><td data-label="الصلاحية">{canManage ? <BatchExpiryEditor key={item.version} materialId={material.id} batch={item} onSaved={refetch} /> : formatDate(item.expiryOn)}</td><td data-label="أولوية السحب">{canPriorities ? <select aria-label={`أولوية سحب الدفعة ${item.batchNumber || item.id}`} className="priority-select" value={Number(item.salePriority)} disabled={reorder.isPending} onChange={(event) => changePriority(item.id, event.target.value)}>{batches.map((_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}</select> : item.salePriority}</td><td data-label="الحالة"><span className={`stock-status ${Number(item.remainingQuantitySmall) > 0 ? "available" : "empty"}`}>{Number(item.remainingQuantitySmall) > 0 ? "متاحة" : "فارغة"}</span></td></tr>) : <tr><td colSpan="8">لا توجد دفعات — تُنشأ من تسجيل المشتريات.</td></tr>}</tbody></table></div>{reorder.isPending && <p className="priority-saving">جاري حفظ ترتيب السحب...</p>}{reorder.isError && <p className="form-api-error" role="alert">{reorder.error?.message}</p>}</section>
    <WithdrawForm materialId={material.id} batches={batches} conversionFactor={material.conversionFactor} canWithdraw={canWithdraw} />
    <section className="mat-general-card"><div className="mat-card-header"><div className="mat-card-title"><Boxes size={18} /><span>سجل حركات المادة</span></div></div><WithdrawnMaterialsTable materialId={material.id} conversionFactor={material.conversionFactor} /></section>
  </div></div>;
}
