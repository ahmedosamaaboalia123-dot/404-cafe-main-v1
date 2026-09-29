import { useState } from "react";
import "./ConfirmAction.css";

export default function ConfirmAction({ children, title = "تأكيد الإجراء", message = "هل تريد المتابعة؟", confirmLabel = "تأكيد", cancelLabel = "إلغاء", requireReason = false, reasonLabel = "السبب", minReasonLength = 3, pending = false, disabled = false, danger = false, triggerClassName = "", onConfirm }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const reasonValid = !requireReason || reason.trim().length >= minReasonLength;
  const close = () => { if (!pending) { setOpen(false); setReason(""); } };
  const confirm = async () => {
    if (pending || !reasonValid) return;
    try {
      await onConfirm?.(requireReason ? reason.trim() : undefined);
      setOpen(false); setReason("");
    } catch {
      // The parent mutation renders its normalized error; keep the dialog open for retry.
    }
  };
  return <>
    <button type="button" className={`${danger ? "confirm-trigger confirm-trigger--danger" : "confirm-trigger"}${triggerClassName ? ` ${triggerClassName}` : ""}`} disabled={disabled || pending} onClick={() => setOpen(true)}>{children}</button>
    {open && <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title">
        <h2 id="confirm-action-title">{title}</h2><p>{message}</p>
        {requireReason && <label>{reasonLabel}<textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending}/><small>{reason.trim().length}/{minReasonLength} على الأقل</small></label>}
        <div><button type="button" onClick={close} disabled={pending}>{cancelLabel}</button><button type="button" className={danger ? "is-danger" : "is-primary"} onClick={confirm} disabled={pending || !reasonValid}>{pending ? "جاري التنفيذ..." : confirmLabel}</button></div>
      </section>
    </div>}
  </>;
}
