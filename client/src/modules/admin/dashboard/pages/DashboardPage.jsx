import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, Banknote, Bell, CheckCircle2, Clock3, ConciergeBell, RefreshCw, ShoppingBag, Table2, Wallet } from "lucide-react";
import { queryKeys } from "@/api/queryKeys";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { dashboardApi } from "../api/dashboard.api";
import "./DashboardPage.css";

const money = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("ar-EG");
const value = (input) => input == null ? "—" : number.format(input);
const stamp = (input) => input ? new Date(input).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : null;

function MetricCard({ title, value: metric, note, icon: Icon, tone }) {
  return <article className={`dashboard-metric dashboard-metric--${tone}`}><span className="dashboard-metric__icon"><Icon size={22}/></span><div><p>{title}</p><strong>{metric}</strong><span>{note}</span></div></article>;
}

export default function DashboardPage() {
  const period = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
  const query = useQuery({ queryKey: queryKeys.dashboard.screen({ period }), queryFn: () => dashboardApi.screen({ period }), staleTime: 60_000 });
  const data = query.data;
  const summary = data?.summary;
  const orders = summary?.orders;
  const tables = summary?.tables;
  return <div className="dashboard-page" dir="rtl"><PageHeader title="لوحة التحكم" breadcrumbs={["الإدارة","لوحة التحكم"]}/><div className="dashboard-content">
    {query.isLoading&&<div className="dashboard-loading"><RefreshCw className="is-spinning"/><p>جاري تحميل لوحة التحكم...</p></div>}
    {query.isError&&<div className="dashboard-error" role="alert"><AlertTriangle/><span>{query.error?.message||"تعذر تحميل لوحة التحكم"}</span><button onClick={()=>query.refetch()}>إعادة المحاولة</button></div>}
    {data&&<><div className="dashboard-toolbar">{stamp(data.generatedAt)&&<span>آخر تحديث {stamp(data.generatedAt)}</span>}<button type="button" className="dashboard-refresh" onClick={()=>query.refetch()} disabled={query.isFetching}><RefreshCw size={16} className={query.isFetching?"is-spinning":""}/> تحديث</button></div>
    <section className="dashboard-metrics" aria-label="ملخص اليوم">
      <MetricCard title="صافي المبيعات" value={orders?.netSales==null?"—":money.format(orders.netSales)} note={`${value(orders?.completedToday)} طلب مكتمل`} icon={Banknote} tone="brown"/>
      <MetricCard title="قيد التشغيل" value={value((orders?.confirmed||0)+(orders?.preparing||0))} note={`${value(orders?.preparing)} جاري التحضير`} icon={ShoppingBag} tone="blue"/>
      <MetricCard title="جاهز" value={value(orders?.ready)} note={`${value(orders?.outForDelivery)} خرج للتوصيل`} icon={Clock3} tone="orange"/>
      <MetricCard title="الطاولات المشغولة" value={value(tables?.occupied)} note={`${value(tables?.empty)} فارغة من ${value(tables?.total)}`} icon={Table2} tone="red"/>
    </section><section className="dashboard-main-grid"><article className="dashboard-card"><div className="dashboard-card__heading"><h3>حالة التشغيل</h3></div><div className="dashboard-counts"><div><span><ConciergeBell/></span><strong>{value(summary?.services?.open)}</strong><small>خدمات مفتوحة</small></div><div><span><Wallet/></span><strong>{value(summary?.drawer?.openShifts)}</strong><small>وردية خزنة مفتوحة</small></div></div></article><article className="dashboard-card"><div className="dashboard-card__heading"><h3>تنبيهات تحتاج متابعة</h3><Link to="/admin/warnings">كل التحذيرات</Link></div>{(data.alerts||[]).length?(data.alerts||[]).map((alert)=><div className="dashboard-alert-item" key={alert.type}><AlertTriangle/><strong>{alert.message}</strong><b>{value(alert.count)}</b></div>):<div className="dashboard-empty"><CheckCircle2/><p>لا توجد تنبيهات تشغيلية حاليًا.</p></div>}</article></section>
    {data.dataQuality!=="COMPLETE"&&<div className="dashboard-error"><AlertTriangle/><span>بعض مصادر البيانات لم تستجب: {(data.failedSources||[]).join("، ")}</span></div>}</>}
  </div></div>;
}
