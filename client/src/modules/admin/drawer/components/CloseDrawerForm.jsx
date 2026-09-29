import { useState } from "react";
import { Lock } from "lucide-react";
import { money } from "./drawerUtils";

export default function CloseDrawerForm({ shiftId, expectedBalance, mutation, onCancel, onMessage }) {
  const [actualBalance, setActualBalance] = useState("");
  const difference = actualBalance === "" ? null : Number(actualBalance) - expectedBalance;
  return <section className="drawer-open-card"><Lock size={30}/><h2>إغلاق الدرج</h2><p>عدّ النقد الموجود فعليًا، ثم أدخل المبلغ. الرصيد المتوقع: <strong>{money.format(expectedBalance)}</strong></p><form onSubmit={(event) => {
    event.preventDefault();
    mutation.mutate({ shiftId, data: { actualBalance: Number(actualBalance) } }, { onSuccess: () => onMessage("تم إغلاق الدرج وحفظ فرق التسوية") });
  }}><label><span>الرصيد الفعلي بعد العد</span><input required min="0" step="0.01" type="number" value={actualBalance} onChange={(event) => setActualBalance(event.target.value)}/></label>{difference !== null && <p className={difference < 0 ? "red" : difference > 0 ? "green" : ""}>الفرق الاسترشادي: {money.format(difference)}</p>}<button disabled={mutation.isPending}><Lock size={16}/>{mutation.isPending ? "جاري الإغلاق..." : "تأكيد الإغلاق"}</button><button type="button" onClick={onCancel} disabled={mutation.isPending}>تراجع</button></form></section>;
}
