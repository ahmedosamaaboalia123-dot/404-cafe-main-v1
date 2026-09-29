import { useEffect, useState } from "react";
import { Save, UserPlus, XCircle } from "lucide-react";
import "../styles/CustomerForm.css";
export default function CustomerForm({ onSubmit, initial, submitLabel="إنشاء عميل", onCancel, busy=false }) {
  const [form,setForm]=useState({name:"",phone:"",address:""});
  useEffect(()=>setForm({name:initial?.name||"",phone:initial?.phone||"",address:initial?.address||""}),[initial]);
  const change=k=>e=>setForm(v=>({...v,[k]:e.target.value}));
  const submit=async e=>{e.preventDefault();await onSubmit({name:form.name.trim(),phone:form.phone.trim(),address:form.address.trim()||undefined});if(!initial)setForm({name:"",phone:"",address:""});};
  // Explicit label/input pairing: the labels used to be unassociated siblings, so
  // screen readers and label clicks had no target.
  const ns=initial?"customer-edit":"customer-create";
  return <form className="customer-form" onSubmit={submit}><div className="form-group"><label htmlFor={`${ns}-name`}>الاسم</label><input id={`${ns}-name`} required minLength={2} value={form.name} onChange={change("name")}/></div><div className="form-group"><label htmlFor={`${ns}-phone`}>رقم الهاتف</label><input id={`${ns}-phone`} required minLength={7} value={form.phone} onChange={change("phone")} disabled={Boolean(initial)}/></div><div className="form-group"><label htmlFor={`${ns}-address`}>العنوان</label><input id={`${ns}-address`} value={form.address} onChange={change("address")}/></div><div className="form-actions-row"><button className="btn-submit" disabled={busy}>{initial?<Save size={18}/>:<UserPlus size={18}/>} {busy?"جاري الحفظ...":submitLabel}</button>{onCancel&&<button type="button" className="btn-cancel" onClick={onCancel}><XCircle size={18}/> إلغاء</button>}</div></form>;
}
