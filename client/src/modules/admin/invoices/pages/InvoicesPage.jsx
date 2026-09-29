import { useState } from "react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { DateTime, Money, PrintDocument, ServerPagination } from "@/shared/components";
import { ordersApi } from "@/modules/admin/orders/api/orders.api";
import { useInvoices } from "@/modules/admin/orders/hooks/order.queries";
import OrderInvoiceSheet from "@/modules/admin/orders/components/OrderInvoiceSheet";
import "@/modules/admin/orders/styles/OrderHistoryPage.css";
export default function InvoicesPage() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(""); const q = useInvoices({ page, limit: 10, ...(search ? { search } : {}) });
  return <div className="history-page"><PageHeader title="فواتير الطلبات" breadcrumbs={["الطلبات", "الفواتير"]}/><input aria-label="بحث في الفواتير" placeholder="رقم الفاتورة" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}/>{q.error && <p role="alert">{q.error?.response?.data?.error?.messageAr || q.error.message}</p>}<div className="history-table-wrapper"><table className="history-table"><thead><tr><th>رقم الفاتورة</th><th>نوع الطلب</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th>مرات الطباعة</th><th>طباعة</th></tr></thead><tbody>{(q.data?.items || []).map((i) => <tr key={i.id}><td>{i.invoiceNumber}</td><td>{i.fulfillmentType}</td><td><Money value={i.totals?.total}/></td><td>{i.status}</td><td><DateTime value={i.finalizedAt}/></td><td>{i.printCount}</td><td><PrintDocument title={i.invoiceNumber} loadPrintData={() => ordersApi.invoicePrint(i.id)} recordPrintEvent={() => ordersApi.recordInvoicePrint(i.id)} render={(data) => <OrderInvoiceSheet payload={data?.invoice?.payload} invoice={data?.invoice} />}/></td></tr>)}</tbody></table></div><ServerPagination meta={q.data?.meta} onPageChange={setPage} disabled={q.isFetching} label="فاتورة"/></div>;
}
