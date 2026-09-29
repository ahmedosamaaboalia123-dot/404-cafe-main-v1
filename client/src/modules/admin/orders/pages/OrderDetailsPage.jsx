import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, Trash2 } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { ConfirmAction } from "@/shared/components";
import { usePreparationDetails } from "../hooks/order.queries";
import { useCancelOrder, useCancelOrderItem, useReadyOrderItem } from "../hooks/order.mutations";
import "../styles/OrderDetailsPage.css";

const errorText = (e) => e?.response?.data?.error?.messageAr || e?.response?.data?.message || e?.message || "تعذر تنفيذ العملية";
export default function OrderDetailsPage() {
  const { orderId } = useParams(); const navigate = useNavigate(); const [error, setError] = useState("");
  const query = usePreparationDetails(orderId); const ready = useReadyOrderItem(); const cancelItem = useCancelOrderItem(); const cancelOrder = useCancelOrder();
  if (query.isLoading) return <div className="od-page"><PageHeader title="تفاصيل الطلب" breadcrumbs={["التحضير"]}/><p>جاري التحميل...</p></div>;
  if (query.error || !query.data) return <div className="od-page"><PageHeader title="تفاصيل الطلب" breadcrumbs={["التحضير"]}/><p role="alert" className="od-error">{errorText(query.error)}</p></div>;
  const { order, items, progress } = query.data;
  const markReady = async (item) => { setError(""); try { await ready.mutateAsync({ itemId: item.id, body: { expectedItemVersion: item.version, expectedOrderVersion: order.version } }); } catch (e) { setError(errorText(e)); } };
  const remove = async (item, reason) => { setError(""); try { await cancelItem.mutateAsync({ orderId, itemId: item.id, body: { reason, expectedItemVersion: item.version, expectedOrderVersion: order.version } }); } catch (e) { setError(errorText(e)); } };
  const removeOrder = async (reason) => { setError(""); try { await cancelOrder.mutateAsync({ orderId, body: { reason, expectedVersion: order.version } }); navigate("/admin/orders/preparation"); } catch (e) { setError(errorText(e)); } };
  return <div className="od-page"><PageHeader title={`الطلب ${order.orderNumber}`} breadcrumbs={["التحضير", order.orderNumber]}/>{error && <p role="alert" className="od-error">{error}</p>}
    <div className="od-toolbar"><button className="btn-back" onClick={() => navigate(-1)}><ArrowRight size={16}/>رجوع</button><span className="od-progress">{progress.ready}/{progress.total} جاهز</span>{!items.some((item) => item.status === "READY") && <ConfirmAction title="إلغاء الطلب" message="سيُلغى الطلب وتعود الخامات للمخزون، بدون أي حركة نقدية." confirmLabel="إلغاء الطلب" requireReason pending={cancelOrder.isPending} danger onConfirm={removeOrder}><span>إلغاء الطلب</span></ConfirmAction>}</div>
    <div className="od-items">{items.map((item) => <article className={`od-card ${item.status === "READY" ? "od-card--done" : ""}`} key={item.id}><div className="od-card__top"><div><strong>{item.productName}</strong><span>{item.typeName} - {item.sizeName} × {item.quantity}</span></div><span>{item.status === "READY" ? "جاهز" : "جاري التحضير"}</span></div>
      <div className="od-card__actions"><button className="od-ready" disabled={item.status === "READY" || ready.isPending} onClick={() => markReady(item)}><Check size={16}/>تم التحضير</button>{item.status === "PREPARING" && <ConfirmAction title="إلغاء المنتج" message="سيعاد مخزون هذا المنتج وتحدث الإجماليات." confirmLabel="إلغاء المنتج" requireReason pending={cancelItem.isPending} danger onConfirm={(reason) => remove(item, reason)}><span><Trash2 size={16}/>إلغاء</span></ConfirmAction>}</div>
      <div className="od-materials"><span className="od-materials__label">المكونات</span>{item.recipeSnapshot?.length ? item.recipeSnapshot.map((m) => <div className="od-material" key={m.materialId}><span>{m.materialName}</span><span>{m.quantitySmall} {m.unitName}</span></div>) : <span>لا توجد مكونات مسجلة</span>}</div></article>)}</div>
    <div className="od-total"><span>حالة الطلب</span><strong>{order.status}</strong></div></div>;
}
