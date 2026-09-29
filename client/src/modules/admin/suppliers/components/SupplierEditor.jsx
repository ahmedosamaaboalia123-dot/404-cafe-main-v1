import { useEffect, useState } from "react";
import { isConflict } from "@/api/apiError";
import { ConflictDialog } from "@/shared/components";
import { supplierFormSchema } from "../schemas/supplier.schema";
import { useUpdateSupplier } from "../hooks/supplier.mutations";

const fieldLabels = { name: "اسم المورد", contactPerson: "اسم المسؤول", phone: "رقم الهاتف", city: "المدينة" };
const formFrom = (supplier) => Object.fromEntries(Object.keys(fieldLabels).map((key) => [key, supplier?.[key] ?? ""]));
export default function SupplierEditor({ supplier, onSaved, onReload, canUpdate = false }) {
  const [form, setForm] = useState(() => formFrom(supplier)); const [validationError, setValidationError] = useState("");
  useEffect(() => setForm(formFrom(supplier)), [supplier]);
  const mutation = useUpdateSupplier(supplier.id, { onSuccess: onSaved });
  if (!canUpdate) return <dl className="supplier-readonly">{Object.entries(fieldLabels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{supplier[key] || "—"}</dd></div>)}</dl>;
  const submit = (event) => { event.preventDefault(); const parsed = supplierFormSchema.safeParse(form); if (!parsed.success) { setValidationError(parsed.error.issues[0]?.message); return; } mutation.mutate({ ...parsed.data, expectedVersion: supplier.version }); };
  return <><form className="supplier-compact-form" onSubmit={submit}>
    {Object.keys(fieldLabels).map((name) => <label className="compact-field" key={name}><span>{fieldLabels[name]} *</span><input type={name === "phone" ? "tel" : "text"} value={form[name]} onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, [name]: event.target.value })); }} required/></label>)}
    <div className="compact-form-actions"><button disabled={mutation.isPending}>{mutation.isPending ? "جاري الحفظ..." : "حفظ تعديلات المورد"}</button>{(validationError || mutation.isError) && !isConflict(mutation.error) && <span role="alert">{validationError || mutation.error?.message}</span>}{mutation.isSuccess && <span className="success-text">تم حفظ التعديلات</span>}</div>
  </form><ConflictDialog open={mutation.isError && isConflict(mutation.error)} onClose={mutation.resetAttempt} onReload={async () => { mutation.resetAttempt(); await onReload?.(); }} pending={false}/></>;
}
