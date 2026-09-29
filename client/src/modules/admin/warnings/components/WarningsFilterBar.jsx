import { RotateCw } from "lucide-react";
import "./WarningsFilterBar.css";

const TYPE_OPTIONS = [
  { value: "all", label: "كل الأنواع" },
  { value: "LOW_STOCK", label: "نقص المخزون" },
  { value: "EXPIRING", label: "قرب انتهاء الصلاحية" },
  { value: "EXPIRED", label: "منتهية الصلاحية" },
  { value: "OPEN_SHIFT_LONG", label: "وردية مفتوحة طويلًا" },
];

function WarningsFilterBar({ warningType, setWarningType, onReset }) {
  return <div className="warnings-filter-card"><div className="filter-card-content">
    <div className="filter-select-group"><label className="filter-label">نوع التحذير (من الخادم)</label><select className="filter-select" value={warningType} onChange={(e) => setWarningType(e.target.value)}>{TYPE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
    <div className="filter-buttons-group"><button type="button" className="filter-reset-btn" onClick={onReset}><RotateCw size={16} /><span>إعادة التعيين</span></button></div>
  </div></div>;
}
export default WarningsFilterBar;
