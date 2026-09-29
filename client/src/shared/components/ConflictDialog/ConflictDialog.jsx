import "../ConfirmAction/ConfirmAction.css";

export default function ConflictDialog({ open, message = "تم تعديل هذا السجل من مستخدم آخر. حمّل أحدث نسخة قبل المتابعة.", onReload, onClose, pending = false }) {
  if (!open) return null;
  return <div className="confirm-backdrop" role="presentation">
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="conflict-dialog-title">
      <h2 id="conflict-dialog-title">البيانات تغيرت</h2><p>{message}</p>
      <div><button type="button" onClick={onClose} disabled={pending}>إغلاق</button><button type="button" className="is-primary" onClick={onReload} disabled={pending}>{pending ? "جاري التحميل..." : "تحميل أحدث نسخة"}</button></div>
    </section>
  </div>;
}
