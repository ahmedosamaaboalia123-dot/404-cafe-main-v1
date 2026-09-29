import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { AsyncState } from "@/shared/components";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { useOrderDetails } from "../hooks/order.queries";
import "../styles/TableOrderTrack.css";

const statusText = { CONFIRMED: "جاري التحضير", PREPARING: "جاري التحضير", READY: "جاهز", OUT_FOR_DELIVERY: "خارج للتوصيل", COMPLETED: "مكتمل", CANCELLED: "ملغي" };

export default function TableOrderTrackPage() {
  const { tableNumber, orderId } = useParams();
  const navigate = useNavigate();
  const query = useOrderDetails(orderId);
  useRealtimeRoom({ scope: `order:${orderId}`, rooms: ["admin:orders"], enabled: Boolean(orderId), onEvent: () => query.refetch() });

  const order = query.data?.order || null;
  const items = query.data?.items || [];
  const readyCount = items.filter((i) => i.status === "READY").length;

  return (
    <div className="track-page">
      <PageHeader title={order ? `تتبع طلب ${order.orderNumber}` : "تتبع الطلب"} breadcrumbs={["الطلبات", "الطاولات", `طاولة ${tableNumber}`, "تتبع"]} />
      <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={!query.isLoading && !order} emptyText="الطلب غير موجود">
        {order && <>
          <div className="track-header">
            <button className="btn-back" onClick={() => navigate(`/admin/orders/tables/${tableNumber}`)}><ArrowRight size={14} /> رجوع</button>
            <div className="track-header__info">
              <span className="track-order-num">طلب {order.orderNumber}</span>
              <span className={`track-order-status track-order-status--${order.status}`}>{statusText[order.status] || order.status}</span>
            </div>
            <span className="track-progress">{readyCount}/{items.length} جاهز</span>
          </div>
          <div className="track-items">
            {items.map((item) => {
              const isReady = item.status === "READY";
              return <div className={`track-item ${isReady ? "track-item--ready" : ""}`} key={item.id}>
                <div className="track-item__info">
                  <strong className="track-item__name">{item.productName}</strong>
                  <span className="track-item__variant">{item.typeName} - {item.sizeName}</span>
                  <span className="track-item__qty">×{item.quantity}</span>
                </div>
                <span className={`track-item__badge ${isReady ? "track-item__badge--ready" : ""}`}>{isReady && <Check size={12} />}{isReady ? "جاهز" : "جاري التحضير"}</span>
              </div>;
            })}
          </div>
          <div className="track-total"><span>الإجمالي</span><strong>{order.totals?.total ?? order.balanceDue ?? "—"} ج.م</strong></div>
        </>}
      </AsyncState>
    </div>
  );
}
