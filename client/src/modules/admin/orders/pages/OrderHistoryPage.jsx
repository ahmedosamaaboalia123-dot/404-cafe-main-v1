import { useState } from "react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { DateTime, Money, PrintDocument, ServerPagination } from "@/shared/components";
import { ordersApi } from "../api/orders.api";
import { useOrderHistory } from "../hooks/order.queries";
import OrderInvoiceSheet from "../components/OrderInvoiceSheet";
import "../styles/OrderHistoryPage.css";
export default function OrderHistoryPage() {
  const [group, setGroup] = useState("online"); const [page, setPage] = useState(1); const [search, setSearch] = useState("");
  const query = useOrderHistory({ group, page, limit: 10, ...(search ? { search } : {}) });
  return <div className="history-page"><PageHeader title="سجل الطلبات" breadcrumbs={["الطلبات", "السجل"]}/><div className="prep-tabs"><button className={group === "online" ? "prep-tab active" : "prep-tab"} onClick={() => { setGroup("online"); setPage(1); }}>أونلاين وتيك أواي</button><button className={group === "tables" ? "prep-tab active" : "prep-tab"} onClick={() => { setGroup("tables"); setPage(1); }}>الطاولات</button><input aria-label="بحث" placeholder="رقم الطلب أو التتبع" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}/></div>{query.error && <p role="alert">{query.error?.response?.data?.error?.messageAr || query.error.message}</p>}<div className="history-table-wrapper"><table className="history-table"><thead><tr><th>رقم الطلب</th><th>النوع</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th><th>الفاتورة</th></tr></thead><tbody>{(query.data?.items || []).map((o) => <tr key={o.id}><td>{o.orderNumber}</td><td>{o.fulfillmentType}</td><td><Money value={o.total}/></td><td>{o.paymentStatus}</td><td>{o.status}</td><td><DateTime value={o.createdAt}/></td><td><PrintDocument title={`فاتورة ${o.orderNumber}`} loadPrintData={() => ordersApi.print(o.id)} render={(data) => <OrderInvoiceSheet payload={data} />}/></td></tr>)}</tbody></table></div>{!query.isLoading && !query.data?.items?.length && <p>لا توجد طلبات مطابقة.</p>}<ServerPagination meta={query.data?.meta} onPageChange={setPage} disabled={query.isFetching} label="طلب"/></div>;
}
