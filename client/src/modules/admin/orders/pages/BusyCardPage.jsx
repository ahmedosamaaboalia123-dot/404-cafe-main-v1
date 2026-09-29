import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { AsyncState, ConfirmAction, ConflictDialog, Money } from "@/shared/components";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { isConflict } from "@/api/apiError";
import { useCancelOrder, useCompleteTakeaway, useReadyOrderItem } from "../hooks/order.mutations";
import { useOrderDetails } from "../hooks/order.queries";
import { deliveryApi } from "../../delegates/api/delivery.api";
import "../styles/BusyCardPage.css";

const useOrderDetailsQuery = (id) => {
  const details = useOrderDetails(id);
  return { ...details, data: details.data ? { order: details.data.order, items: details.data.items || [], timeline: details.data.timeline || [], payment: details.data.payment ?? null, delivery: details.data.delivery ?? null } : details.data };
};

const statusText = { CONFIRMED: "جاري التحضير", PREPARING: "جاري التحضير", READY: "جاهز", OUT_FOR_DELIVERY: "خارج للتوصيل", COMPLETED: "مكتمل", CANCELLED: "ملغي" };

function AssignDelegate({ orderId, orderVersion, disabled }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const delegatesQuery = useQuery({ queryKey: ["delegates", "available"], queryFn: () => deliveryApi.screen({ status: "ACTIVE", page: 1, limit: 10 }), enabled: open, staleTime: 15 * 1000 });
  const assign = useMutation({
    mutationFn: ({ delegateId, expectedOrderVersion }) => deliveryApi.assign(orderId, { delegateId, expectedOrderVersion }, beginOperation(`delivery:assign:${orderId}`)),
    onSuccess: async () => { finishOperation(`delivery:assign:${orderId}`); setOpen(false); await queryClient.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (e) => { finishOperation(`delivery:assign:${orderId}`); setError(e?.response?.data?.error?.messageAr || e.message); },
  });
  const options = (delegatesQuery.data?.delegates || []).filter((d) => (d.activeOrderCount ?? 0) < (d.maxActiveOrders ?? 0));
  if (!open) return <button className="btn-finish" disabled={disabled} onClick={() => { setError(""); setOpen(true); }}>تسليم للمندوب</button>;
  return <div className="delegate-dialog" role="dialog" aria-modal="true"><div className="delegate-dialog__content">
    <h3>تسليم الطلب للمندوب</h3>
    {error && <p role="alert">{error}</p>}
    {delegatesQuery.isLoading ? <p>جاري التحميل...</p> : options.length ? options.map((delegate) => (
      <button key={delegate.id} disabled={assign.isPending} onClick={() => assign.mutate({ delegateId: delegate.id, expectedOrderVersion: orderVersion })}>{delegate.name} — {delegate.phone}</button>
    )) : <p>لا يوجد مندوب متاح للتسليم حاليًا</p>}
    <button onClick={() => { setOpen(false); assign.reset(); }}>إلغاء</button>
  </div></div>;
}

export default function BusyCardPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const [activeTab, setActiveTab] = useState("orders");
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [actionError, setActionError] = useState("");

  const query = useOrderDetailsQuery(id);
  const cancelOrder = useCancelOrder();
  const completeTakeaway = useCompleteTakeaway();
  const readyItem = useReadyOrderItem();
  useRealtimeRoom({ scope: `order:${id}`, rooms: ["admin:orders"], enabled: Boolean(id), onEvent: () => query.refetch() });

  const order = query.data?.order || null;
  const items = query.data?.items || [];
  const timeline = query.data?.timeline || [];

  const sectionPath = order?.fulfillmentType === "DINE_IN" ? "/admin/orders/tables" : type === "takeaway" ? "/admin/orders/takeaway" : "/admin/orders/online";
  const pending = cancelOrder.isPending || completeTakeaway.isPending || readyItem.isPending;
  const conflict = [cancelOrder, completeTakeaway, readyItem].find((m) => m.isError && isConflict(m.error));
  const resetConflicts = () => { cancelOrder.resetAttempt(); completeTakeaway.resetAttempt(); readyItem.resetAttempt(); };

  const cancel = async (reason) => {
    if (cancelling) return;
    setCancelling(true); setActionError("");
    try { await cancelOrder.mutateAsync({ orderId: id, body: { reason, expectedVersion: order.version } }); navigate(-1); }
    catch (e) { setActionError(e?.response?.data?.error?.messageAr || e.message); }
    finally { setCancelling(false); setConfirmingCancel(false); }
  };
  const complete = async () => {
    setActionError("");
    try { await completeTakeaway.mutateAsync({ orderId: id, body: { expectedVersion: order.version, payment: { method: "CASH", amount: order.balanceDue } } }); query.refetch(); }
    catch (e) { setActionError(e?.response?.data?.error?.messageAr || e.message); }
  };
  const markItemReady = async (item) => {
    setActionError("");
    try { await readyItem.mutateAsync({ itemId: item.id, body: { expectedItemVersion: item.version, expectedOrderVersion: order.version } }); }
    catch (e) { setActionError(e?.response?.data?.error?.messageAr || e.message); }
  };

  return (
    <div className="busy-card-page">
      <PageHeader title={order ? `تفاصيل طلب ${order.orderNumber}` : "تفاصيل الطلب"} breadcrumbs={["الطلبات", order?.orderNumber || ""]} />
      <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={!query.isLoading && !order} emptyText="الطلب غير موجود">
        {order && <>
          <div className="busy-card-header">
            <button className="btn-back" onClick={() => navigate(-1)}><ArrowRight />رجوع</button>
            <div className="card-title-box">
              <span className="card-title">طلب {order.orderNumber}</span>
              {order.channel === "CUSTOMER_WEB" && <span className="card-badge-outside">من الخارج</span>}
              <span className="card-status">{statusText[order.status] || order.status}</span>
              {order.assignedDelegate && <span className="card-delegate">تم التسليم للمندوب{order.assignedDelegate.name ? ` — ${order.assignedDelegate.name}` : ""}</span>}
            </div>
          </div>
          {(actionError || cancelOrder.isError || completeTakeaway.isError || readyItem.isError) && !conflict && <p role="alert">{actionError || cancelOrder.error?.message || completeTakeaway.error?.message || readyItem.error?.message}</p>}

          <div className="busy-card-tabs">
            <button className={`tab-btn ${activeTab === "orders" ? "active" : ""}`} onClick={() => setActiveTab("orders")}>الطلبات ({items.length})</button>
            <button className={`tab-btn ${activeTab === "tracking" ? "active" : ""}`} onClick={() => setActiveTab("tracking")}>تتبع الطلب</button>
          </div>

          <div className="busy-card-content">
            {activeTab === "orders" ? (
              <div className="orders-list"><div className="order-card">
                <div className="order-card-header">
                  <span className="order-number">طلب {order.orderNumber}</span>
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString("ar-EG") : "—"}</span>
                </div>
                <div className="order-customer">{order.customer?.name || order.customer?.phone || "—"}</div>
                <div className="order-items">
                  {items.map((item) => (
                    <div className="order-item" key={item.id}>
                      <div className="order-item-top">
                        <span className="item-qty">×{item.quantity}</span>
                        {item.status === "PREPARING" && can(permissions, "preparation.update") && <button className="btn-toggle-status" disabled={pending} onClick={() => markItemReady(item)} aria-label={`تعليم ${item.productName} جاهز`} title="تعليم جاهز"><Check /></button>}
                      </div>
                      <div className="order-item-info">
                        <span className="item-name">{item.productName}</span>
                        <span className="item-variant">{item.typeName} - {item.sizeName}</span>
                      </div>
                      <div className="order-item-bottom">
                        <span className="item-price"><Money value={item.lineSubtotal} /> ج.م</span>
                        <span className={`item-status ${item.status === "READY" ? "ready" : ""}`}>{statusText[item.status] || item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div></div>
            ) : (
              <div className="tracking-card"><div className="tracking-grid">
                <div className="tracking-mini-card"><span>رقم الطلب</span><strong>{order.orderNumber}</strong></div>
                <div className="tracking-mini-card"><span>نوع الطلب</span><strong>{order.fulfillmentType === "DELIVERY" ? "توصيل" : order.fulfillmentType === "TAKEAWAY" ? "تيك أواي" : "طاولة"}</strong></div>
                <div className="tracking-mini-card"><span>الحالة</span><strong>{statusText[order.status] || order.status}</strong></div>
                {query.data?.delivery && <div className="tracking-mini-card"><span>المندوب</span><strong>{query.data.delivery.delegateName || "—"}</strong></div>}
              </div>
                {timeline.length > 0 && <div className="tracking-steps">{timeline.map((step, index) => (
                  <div className="tracking-step-card" key={step.sequence ?? index}><strong>{statusText[step.toStatus] || step.toStatus}</strong><span>{step.occurredAt ? new Date(step.occurredAt).toLocaleString("ar-EG") : "—"}</span></div>
                ))}</div>}
              </div>
            )}
          </div>

          <div className="busy-card-footer">
            <div className="total-amount"><span>الإجمالي المستحق:</span><strong><Money value={order.balanceDue} /> ج.م</strong></div>
            {order.status === "READY" && order.fulfillmentType === "DELIVERY" && can(permissions, "delivery.manage") && <AssignDelegate orderId={id} orderVersion={order.version} disabled={pending} />}
            {order.status === "READY" && order.fulfillmentType === "TAKEAWAY" && can(permissions, "orders.complete") && <button className="btn-finish" disabled={pending} onClick={complete}>{completeTakeaway.isPending ? "جاري..." : "تسليم للعميل"}</button>}
            {["CONFIRMED", "PREPARING", "READY"].includes(order.status) && !items.some((item) => item.status === "READY") && can(permissions, "orders.cancel") && <>
              <button className="btn-cancel-order" disabled={pending || cancelling} onClick={() => setConfirmingCancel(true)}>{cancelling ? "جاري الإلغاء..." : "إلغاء الطلب"}</button>
            </>}
          </div>

          {confirmingCancel && (
            <div className="delegate-dialog" role="dialog" aria-modal="true"><div className="delegate-dialog__content">
              <h3>تأكيد إلغاء الطلب</h3>
              <ConfirmAction title="إلغاء الطلب" message="سيتم إرجاع المخزون المحجوز حسب قواعد الباك." confirmLabel="نعم، إلغاء الطلب" danger pending={cancelling} requireReason onConfirm={cancel}>
                <span>تأكيد</span>
              </ConfirmAction>
              <button onClick={() => setConfirmingCancel(false)} disabled={cancelling}>تراجع</button>
            </div></div>
          )}
          <ConflictDialog open={Boolean(conflict)} onClose={() => { resetConflicts(); }} onReload={async () => { resetConflicts(); await query.refetch(); }} pending={false} />
        </>}
      </AsyncState>
    </div>
  );
}
