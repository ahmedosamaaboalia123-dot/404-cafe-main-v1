import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { ServerPagination } from "@/shared/components";
import OrderQueue from "../components/OrderQueue";
import { useOnlineOrders } from "../hooks/order.queries";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { queryKeys } from "@/api/queryKeys";
import "../styles/Screen.css";
export default function TakeawayScreen() { const [page, setPage] = useState(1); const queryClient = useQueryClient(); const q = useOnlineOrders({ tab: "active", fulfillmentType: "TAKEAWAY", page, limit: 10 }); useRealtimeRoom({ scope: "orders:takeaway", rooms: ["admin:orders"], enabled: true, onEvent: () => { queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }); } }); return <div className="online-screen"><PageHeader title="طلبات التيك أواي" breadcrumbs={["الطلبات", "تيك أواي"]}/><div className="screen-content">{q.error && <p role="alert">{q.error?.response?.data?.error?.messageAr || q.error.message}</p>}<OrderQueue orders={q.data?.items || []} emptyText="لا توجد طلبات تيك أواي حاليًا"/><ServerPagination meta={q.data?.meta} onPageChange={setPage} disabled={q.isFetching} label="طلب"/></div></div>; }
