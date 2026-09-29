import { Lock, RefreshCw } from "lucide-react";
import { drawerTotals, formatDrawerDate, money } from "./drawerUtils";

export default function DrawerOverview({ shift, refreshing, onRefresh, onClose }) {
  const summary = drawerTotals(shift);
  return <><section className="drawer-head"><div><span className="drawer-live">درج مفتوح</span><h2>وردية #{shift.id}</h2><p>الموظف المسؤول: <strong>{shift.openedByUser?.name || shift.openedBy?.name || "—"}</strong> — {formatDrawerDate(shift.openedAt)}</p></div><div className="drawer-head-actions"><button onClick={onRefresh} disabled={refreshing}><RefreshCw size={15}/>تحديث</button><button className="close" onClick={onClose}><Lock size={15}/>إغلاق الدرج</button></div></section>
  <section className="drawer-metrics"><article><span>الرصيد الافتتاحي</span><strong>{money.format(Number(shift.openingBalance || 0))}</strong></article><article className="in"><span>إجمالي الوارد</span><strong>{money.format(summary.incoming)}</strong></article><article className="out"><span>إجمالي المصروفات</span><strong>{money.format(summary.outgoing)}</strong></article><article className="balance"><span>الرصيد المتوقع</span><strong>{money.format(summary.balance)}</strong></article></section></>;
}
