import { useState } from "react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { ServerPagination } from "@/shared/components";
import TableServiceRequestsList from "../components/TableServiceRequestsList";
import { useTableServiceRequests } from "../hooks/useTableServiceRequests";
import "../styles/TableServices.css";

export default function TableServicesPage() {
  const [tab, setTab] = useState("open"); const [page, setPage] = useState(1);
  const { services, loading, error, pendingId, changeStatus, meta } = useTableServiceRequests(tab, page);
  const active = tab === "open" ? services : [];
  const done = tab === "completed" ? services : [];
  return <div className="table-services-page">
    <PageHeader title="خدمات الطاولات" breadcrumbs={["الطلبات", "خدمات الطاولات"]}/>
    {error && <p role="alert">{error}</p>}
    {loading && <p>جاري تحميل طلبات الخدمات...</p>}
    <div className="prep-tabs"><button className={tab === "open" ? "prep-tab active" : "prep-tab"} onClick={() => { setTab("open"); setPage(1); }}>الطلبات الحالية</button><button className={tab === "completed" ? "prep-tab active" : "prep-tab"} onClick={() => { setTab("completed"); setPage(1); }}>الطلبات المنتهية</button></div>
    <div className="table-services-content">
      {tab === "open" ? (
        <TableServiceRequestsList title="الطلبات النشطة" services={active} pendingId={pendingId} onStatusChange={changeStatus} />
      ) : (
        <TableServiceRequestsList title="الطلبات المنتهية" services={done} finished pendingId={pendingId} onStatusChange={changeStatus} />
      )}
    </div>
    <ServerPagination meta={meta} onPageChange={setPage} disabled={loading} label="خدمة"/>
  </div>;
}
