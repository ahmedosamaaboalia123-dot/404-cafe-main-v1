import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { AsyncState, ServerPagination } from "@/shared/components";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { useWarningsScreen } from "../hooks/warning.queries";
import { normalizeWarningType } from "../adapters/warning.adapter";
import WarningsStatsCards from "../components/WarningsStatsCards";
import WarningsFilterBar from "../components/WarningsFilterBar";
import WarningsTable from "../components/WarningsTable";
import "./WarningsPage.css";

const resolvedEventType = (event) => event?.type ?? event?.event ?? null;
const matchesWarningEvent = (event) => {
  const type = resolvedEventType(event);
  return type === "order.created" || type === "order.cancelled" || type === "order.completed";
};

export default function WarningsPage() {
  const [warningType, setWarningType] = useState("all");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const query = useWarningsScreen({ type: normalizeWarningType(warningType), page, limit: 10 });
  useRealtimeRoom({
    scope: "warnings:list", rooms: ["admin:orders"], enabled: true,
    onEvent: (event) => { if (matchesWarningEvent(event)) queryClient.invalidateQueries({ queryKey: ["warnings"] }); },
  });
  const screen = query.data;
  const changeType = (value) => { setWarningType(value); setPage(1); };
  const reset = () => { setWarningType("all"); setPage(1); };
  return <div className="warnings-page"><PageHeader title="إدارة التحذيرات" breadcrumbs={["الرئيسية", "إدارة التحذيرات"]} icon={ShieldAlert} /><div className="warnings-container">
    <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={!query.isLoading && !screen}>
      {screen && <>
        <WarningsStatsCards summary={screen.summary} dataQuality={screen.dataQuality} />
        <WarningsFilterBar warningType={warningType} setWarningType={changeType} onReset={reset} />
        <WarningsTable items={screen.items} />
        <ServerPagination meta={screen.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="تحذير" />
      </>}
    </AsyncState>
  </div></div>;
}
