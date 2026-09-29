import { useState } from "react";
import { Briefcase, PlusCircle, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { useCreateSupplier } from "../hooks/supplier.mutations";
import { supplierFormSchema } from "../schemas/supplier.schema";
import "./AddSupplierForm.css";

const emptyForm = { name: "", contactPerson: "", phone: "", city: "" };
export default function AddSupplierForm() {
  const permissions = useAuthStore((state) => state.permissions);
  const [form, setForm] = useState(emptyForm); const [validationError, setValidationError] = useState("");
  const mutation = useCreateSupplier({ onSuccess: () => { setForm(emptyForm); setValidationError(""); } });
  if (!can(permissions, "suppliers.create")) return null;
  const change = (event) => { mutation.resetAttempt(); setValidationError(""); setForm((current) => ({ ...current, [event.target.name]: event.target.value })); };
  const submit = (event) => {
    event.preventDefault(); const result = supplierFormSchema.safeParse(form);
    if (!result.success) { setValidationError(result.error.issues[0]?.message || "راجع البيانات"); return; }
    mutation.mutate(result.data);
  };
  return <div className="add-supplier-card"><div className="form-card-header"><div className="form-header-title"><div className="header-plus-icon"><PlusCircle size={18}/></div><span>إضافة مورد جديد</span></div></div>
    <form onSubmit={submit} className="supplier-form"><div className="form-grid">
      {[["name","اسم المورد","text"],["contactPerson","اسم المسؤول","text"],["phone","رقم الهاتف","tel"],["city","المدينة","text"]].map(([name,label,type]) => <div className="form-group" key={name}><label className="form-label" htmlFor={`supplier-${name}`}>{label}<span className="required-star"> *</span></label><input id={`supplier-${name}`} className="form-input" name={name} type={type} value={form[name]} onChange={change} required/></div>)}
    </div>
    {(validationError || mutation.isError) && <p className="form-api-error" role="alert">{validationError || mutation.error?.message || "تعذر حفظ المورد"}</p>}
    <div className="form-actions-bar"><button type="submit" className="save-supplier-btn" disabled={mutation.isPending}><Briefcase size={18}/><span>{mutation.isPending ? "جاري الحفظ..." : "حفظ المورد"}</span></button><button type="button" className="cancel-supplier-btn" disabled={mutation.isPending} onClick={() => { mutation.resetAttempt(); setForm(emptyForm); setValidationError(""); }}><XCircle size={18}/><span>إلغاء</span></button></div></form>
  </div>;
}
