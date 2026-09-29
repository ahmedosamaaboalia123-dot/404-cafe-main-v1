import { formatDrawerDate, IN_TYPES, money } from "./drawerUtils";

export default function DrawerTransactionsTable({ transactions = [] }) {
  return <section className="drawer-card"><h3>حركات الدرج الحالية</h3><div className="drawer-table-scroll"><table><thead><tr><th>التاريخ</th><th>المصدر</th><th>البيان</th><th>الموظف</th><th>وارد</th><th>صادر</th></tr></thead><tbody>{[...transactions].reverse().map((item) => <tr key={item.id}><td>{formatDrawerDate(item.createdAt)}</td><td>{item.type === "SALES" ? "طلب تلقائي" : item.referenceType || "تسجيل يدوي"}</td><td>{item.description || "—"}</td><td>{item.recordedByUser?.name || item.recordedBy?.name || "—"}</td><td className="green">{IN_TYPES.has(item.type) ? money.format(Number(item.amount)) : "—"}</td><td className="red">{!IN_TYPES.has(item.type) ? money.format(Number(item.amount)) : "—"}</td></tr>)}</tbody></table></div>{!transactions.length && <p className="drawer-empty">لا توجد حركات حتى الآن</p>}</section>;
}
