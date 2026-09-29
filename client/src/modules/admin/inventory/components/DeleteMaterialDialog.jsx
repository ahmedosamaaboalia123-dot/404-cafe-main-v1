import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useDeleteMaterial } from "../hooks/inventory.mutations";

const blockerLabels = { batches: "دفعات", movements: "حركات مخزون", allocations: "خصومات طلبات", purchaseItems: "فواتير مشتريات", returns: "مرتجعات", recipes: "وصفات منتجات", allowedTypes: "أنواع منتجات" };

export default function DeleteMaterialDialog({ material, onClose, onDeleted }) {
  const [reason, setReason] = useState("");
  const remove = useDeleteMaterial(material.id, { onSuccess: onDeleted });
  const blockers = remove.error?.details?.blockers || {};
  const submit = (event) => { event.preventDefault(); if (reason.trim().length >= 3) remove.mutate({ reason: reason.trim(), expectedVersion: Number(material.version ?? 0) }); };
  return <div className="mat-dialog-overlay" role="dialog" aria-modal="true" aria-label={`حذف ${material.name}`}>
    <form className="mat-dialog" onSubmit={submit}>
      <div className="mat-dialog-head"><h3>حذف المادة: {material.name}</h3><button type="button" className="mat-dialog-close" onClick={onClose} aria-label="إغلاق">×</button></div>
      <div className="mat-delete-warning"><AlertTriangle size={18}/><p>الحذف نهائي، ولن يسمح به الخادم إذا كانت المادة مرتبطة بدفعة أو حركة أو فاتورة أو مرتجع أو وصفة أو طلب.</p></div>
      <label className="mat-delete-reason">سبب الحذف<input value={reason} minLength={3} maxLength={500} required onChange={(event) => { remove.resetAttempt(); setReason(event.target.value); }} /></label>
      {remove.isError && <div className="form-api-error" role="alert"><p>{remove.error.message}</p>{Object.keys(blockers).length > 0 && <ul>{Object.entries(blockers).map(([key,value]) => <li key={key}>{blockerLabels[key] || key}: {value}</li>)}</ul>}</div>}
      <div className="mat-dialog-actions"><button type="button" onClick={onClose}>تراجع</button><button className="mat-delete-confirm" disabled={remove.isPending || reason.trim().length < 3}><Trash2 size={16}/>{remove.isPending ? "جاري الحذف..." : "حذف نهائي"}</button></div>
    </form>
  </div>;
}
