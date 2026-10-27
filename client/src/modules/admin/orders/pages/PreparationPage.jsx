import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { usePreparation } from "../hooks/order.queries";
import { useReadyWholeOrder } from "../hooks/order.mutations";
import ServerPagination from "@/shared/components/ServerPagination/ServerPagination";
import "../styles/PreparationPage.css";

const STATUS_LABELS = {
  PENDING: "جاري التحضير",
  CONFIRMED: "جاري التحضير",
  PREPARING: "جاري التحضير",
  READY: "جاهز",
  COMPLETED: "مسلّم",
};

const TYPE_LABELS = {
  DELIVERY: "أونلاين",
  DINE_IN: "طاولة",
  TAKEAWAY: "تيك أواي",
};

const tabs = [
  { key: "current", label: "جاري التحضير", statuses: ["PREPARING"] },
  { key: "ready", label: "الطلبات الجاهزة", statuses: ["READY"] },
];

const tableLabel = (order) => {
  const number = Number(order.tableNumber);
  return Number.isInteger(number) && number > 0 ? `طاولة ${number}` : "طاولة";
};

const typeLabel = (order) => {
  if (order.fulfillmentType === "DINE_IN") return tableLabel(order);
  return TYPE_LABELS[order.fulfillmentType] || order.fulfillmentType || "—";
};

const errorText = (e) => e?.response?.data?.error?.messageAr || e?.response?.data?.message || e?.message || "تعذر تنفيذ العملية";

const MAX_NAMES = 4;

export default function PreparationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("current");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");
  const query = usePreparation({ group: "all", tab: activeTab, page, limit: 10 });
  const readyAll = useReadyWholeOrder();

  const rows = query.data?.items || [];
  const error = query.error;

  const openOrder = (order) => navigate(`/admin/orders/preparation/${order.id}`);

  const markWholeReady = async (order) => {
    if (busyId) return;
    setBusyId(order.id);
    setActionError("");
    try {
      await readyAll.mutateAsync({ orderId: order.id, body: { expectedVersion: order.version ?? 0 } });
      readyAll.resetAttempt();
    } catch (e) {
      setActionError(errorText(e));
    } finally {
      setBusyId(null);
    }
  };

  const renderCard = (order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const names = items.slice(0, MAX_NAMES);
    const extra = items.length - names.length;
    const busy = busyId === order.id;
    return (
      <article key={order.id} className={`prep-card prep-card--${String(order.fulfillmentType || "").toLowerCase()}`}>
        <div className="prep-card__type">{typeLabel(order)}</div>
        <div className="prep-card__num">{order.orderNumber}</div>
        <ul className="prep-card__items">
          {names.map((item) => (
            <li key={item.id}>
              {item.productName || "—"}
              {[item.typeName, item.sizeName].filter(Boolean).length > 0 && (
                <span className="prep-card__variant">
                  {" — "}{[item.typeName, item.sizeName].filter(Boolean).join(" / ")}
                </span>
              )}
              <span className="prep-card__qty"> × {item.quantity ?? 1}</span>
            </li>
          ))}
          {extra > 0 && <li className="prep-card__more">+{extra} المزيد</li>}
          {items.length === 0 && <li className="prep-card__more">لا توجد أصناف</li>}
        </ul>
        <div className="prep-card__actions">
          {activeTab === "current" ? (
            <button className="btn-ready" disabled={busy} onClick={() => markWholeReady(order)}>
              {busy ? "جاري التحضير..." : "تم التحضير"}
            </button>
          ) : (
            order.fulfillmentType === "DELIVERY" && (
              <button className="btn-deliver" disabled={busy} onClick={() => navigate(`/admin/orders/busy/online/${order.id}`)}>
                اختيار المندوب
              </button>
            )
          )}
          <button className="btn-open" disabled={busy} onClick={() => openOrder(order)}>
            فتح
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="prep-page">
      <PageHeader title="قسم التحضير" breadcrumbs={["الطلبات", "التحضير"]} />
      {(error || actionError) && (
        <p role="alert" className="prep-error">
          {errorText(error || actionError)}
        </p>
      )}

      <div className="prep-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`prep-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.key); setPage(1); setActionError(""); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <p className="prep-loading">جاري تحميل الطلبات...</p>
      ) : rows.length === 0 ? (
        <p className="prep-empty">لا توجد طلبات</p>
      ) : (
        <>
          <div className="prep-grid">{rows.map(renderCard)}</div>
          <ServerPagination meta={query.data?.meta} onPageChange={setPage} disabled={query.isLoading} label="طلب" />
        </>
      )}
    </div>
  );
}
