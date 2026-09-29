import { AlertTriangle, Ban, Clock, History } from "lucide-react";
import "./WarningsStatsCards.css";
function WarningsStatsCards({ summary, dataQuality }) {
  const stats = [
    { id: "low", title: "نقص المخزون", value: summary?.lowStock ?? 0, icon: AlertTriangle, color: "#e67e22" },
    { id: "minimum", title: "مواد قاربت على النفاد", value: summary?.nearMinimumStock ?? 0, icon: AlertTriangle, color: "#b45309", subtitle: "رصيد موجب عند الحد الأدنى أو أقل" },
    { id: "soon", title: "قرب انتهاء الصلاحية", value: summary?.expiring ?? 0, icon: Clock, color: "#d48806", subtitle: "عدد الدفعات المتأثرة" },
    { id: "expired", title: "منتهية الصلاحية", value: summary?.expired ?? 0, icon: Ban, color: "#7c3aed", subtitle: "عدد الدفعات المتأثرة" },
    { id: "shift", title: "وردية مفتوحة طويلًا", value: summary?.openShiftLong ?? "—", icon: History, color: "#d9383a" },
  ];
  return <div className="warnings-stats-grid">{stats.map((stat) => { const Icon = stat.icon; return <div className="warnings-stat-card" key={stat.id}><div className="stat-card-header"><span className="stat-card-title">{stat.title}</span><div className="stat-card-icon-wrapper"><Icon size={22} color={stat.color} /></div></div><div className="stat-card-value" style={{ color: stat.color }}>{dataQuality === "ERROR" ? "—" : stat.value}</div><div className="stat-card-subtitle">{dataQuality === "ERROR" ? "بيانات جزئية — تعذر حساب الكل" : stat.subtitle || "إجمالي التحذيرات النشطة"}</div></div>; })}</div>;
}
export default WarningsStatsCards;
