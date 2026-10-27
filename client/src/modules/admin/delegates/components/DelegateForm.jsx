import { useEffect, useState } from "react";
import { Save, UserPlus, XCircle } from "lucide-react";

export default function DelegateForm({ onSubmit, initial, submitLabel, onCancel, busy = false }) {
  const [form, setForm] = useState({ name: "", phone: "", maxActiveOrders: 5 });
  useEffect(
    () =>
      setForm({
        name: initial?.name || "",
        phone: initial?.phone || "",
        maxActiveOrders: initial?.maxActiveOrders ?? 5,
      }),
    [initial]
  );
  const change = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    await onSubmit({
      name: form.name.trim(),
      ...(initial ? {} : { phone: form.phone.trim() }),
      maxActiveOrders: Number(form.maxActiveOrders),
    });
    if (!initial) setForm({ name: "", phone: "", maxActiveOrders: 5 });
  };
  const ns = initial ? "delegate-edit" : "delegate-create";
  const label = submitLabel || (initial ? "حفظ التعديلات" : "إضافة المندوب");
  return (
    <form className="delegate-form" onSubmit={submit}>
      <h2>{initial ? "تعديل بيانات المندوب" : "إضافة مندوب"}</h2>
      <div className="form-group">
        <label htmlFor={`${ns}-name`}>اسم المندوب</label>
        <input
          id={`${ns}-name`}
          required
          minLength={2}
          value={form.name}
          onChange={change("name")}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${ns}-phone`}>رقم الهاتف وواتساب</label>
        <input
          id={`${ns}-phone`}
          required
          minLength={7}
          value={form.phone}
          onChange={change("phone")}
          disabled={Boolean(initial)}
          title={initial ? "رقم الهاتف لا يمكن تعديله" : undefined}
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${ns}-capacity`}>السعة القصوى للطلبات</label>
        <input
          id={`${ns}-capacity`}
          type="number"
          min="1"
          max="50"
          value={form.maxActiveOrders}
          onChange={change("maxActiveOrders")}
        />
      </div>
      <button disabled={busy}>
        {initial ? <Save size={16} /> : <UserPlus size={16} />} {busy ? "جاري الحفظ..." : label}
      </button>
      {onCancel && (
        <button type="button" className="btn-cancel" onClick={onCancel}>
          <XCircle size={16} /> إلغاء
        </button>
      )}
    </form>
  );
}
