import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { usePreparation } from "../hooks/order.queries";
import ServerPagination from "@/shared/components/ServerPagination/ServerPagination";
import "../styles/PreparationPage.css";

const STATUS_LABELS = {
  PENDING: "جاري التحضير",
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  READY: "جاهز",
  COMPLETED: "مسلّم",
};

const tabs = [
  { key: "current", label: "جاري التحضير", statuses: ["PREPARING"] },
  { key: "ready", label: "الطلبات الجاهزة", statuses: ["READY"] },
];

/** A DINE_IN order without a resolved table must read as "—", never "undefined". */
const tableLabel = (order) => {
  const number = Number(order.tableNumber);
  return Number.isInteger(number) && number > 0 ? `طاولة ${number}` : "—";
};
const itemCountLabel = (order) => `${order.itemCount ?? order.items?.length ?? 0} منتج`;

export default function PreparationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("current");
  const [onlinePage, setOnlinePage] = useState(1);
  const [tablesPage, setTablesPage] = useState(1);
  const online = usePreparation({ group: "online", tab: activeTab, page: onlinePage, limit: 10 });
  const tables = usePreparation({ group: "tables", tab: activeTab, page: tablesPage, limit: 10 });
  const onlineRows = online.data?.items || [];
  const tablesRows = tables.data?.items || [];
  const error = online.error || tables.error;
  const isLoading = online.isLoading || tables.isLoading;

  const openOrder = (order) => navigate(`/admin/orders/preparation/${order.id}`);

  const renderTable = (rows, emptyText) => (
    <div className="prep-table-wrapper">
      <table className="prep-table">
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>المنتجات</th>
            <th>الطاولة</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan="5" className="prep-empty">{emptyText}</td></tr>
          ) : (
            rows.map((order) => (
              <tr key={order.id}>
                <td className="prep-order-num">{order.orderNumber}</td>
                <td className="prep-order-source">{itemCountLabel(order)}</td>
                <td className="prep-order-source">
                  {order.fulfillmentType === "DINE_IN" ? tableLabel(order) : "—"}
                </td>
                <td>
                  <span className={`prep-status prep-status--${order.status}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </td>
                <td className="prep-actions">
                  <button className="btn-open" onClick={() => openOrder(order)}>
                    فتح
                  </button>
                  {activeTab === "ready" && (
                    <button className="btn-deliver" onClick={() => navigate(`/admin/orders/busy/online/${order.id}`)}>
                      {order.fulfillmentType === "DELIVERY" ? "اختيار المندوب" : order.fulfillmentType === "TAKEAWAY" ? "تسليم للعميل" : "فتح"}
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="prep-page">
      <PageHeader title="قسم التحضير" breadcrumbs={["الطلبات", "التحضير"]} />
      {error && <p role="alert" className="prep-error">{error?.response?.data?.message || error?.message}</p>}

      <div className="prep-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`prep-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.key); setOnlinePage(1); setTablesPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="prep-loading">جاري تحميل الطلبات...</p>
      ) : (
        <div className="prep-cols">
          <div className="prep-col">
            <h4 className="prep-col-title">الأونلاين والتيك أواي</h4>
            {renderTable(onlineRows, "لا توجد طلبات أونلاين")}
            <ServerPagination meta={online.data?.meta} onPageChange={setOnlinePage} disabled={online.isLoading} label="طلب" />
          </div>
          <div className="prep-col">
            <h4 className="prep-col-title">طلبات الطاولات</h4>
            {renderTable(tablesRows, "لا توجد طلبات طاولات")}
            <ServerPagination meta={tables.data?.meta} onPageChange={setTablesPage} disabled={tables.isLoading} label="طلب" />
          </div>
        </div>
      )}
    </div>
  );
}
