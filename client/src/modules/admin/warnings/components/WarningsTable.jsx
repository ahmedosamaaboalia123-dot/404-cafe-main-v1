import { useNavigate } from "react-router-dom";
import { AlertTriangle, Eye } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import "./WarningsTable.css";

const severityClass = (severity) => ({ CRITICAL: "high", WARNING: "medium" }[severity] || "medium");

// Expiry warnings are raised per batch, so the batch and its remaining amount
// are first-class cells instead of being folded into the details text.
function BatchCell({ item }) {
  if (item.batchLabel)
    return <div className="warning-batch-cell">
      <span className="warning-batch-chip">{item.batchLabel}</span>
      {item.remaining && <span className="warning-batch-remaining">المتبقي {item.remaining.value} {item.remaining.unit}</span>}
    </div>;
  return <div className="warning-batch-cell"><span className="warning-scope-muted">{item.scopeLabel === "—" ? "غير مرتبطة" : "المادة كاملة"}</span></div>;
}

function WarningsTable({ items }) {
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const canOpenMaterial = can(permissions, "inventory.read");
  if (!items?.length) return <div className="no-warnings-state"><AlertTriangle size={48} className="no-warnings-icon" /><p>لا توجد تحذيرات مطابقة — الوضع مطمئن.</p></div>;
  return <div className="warnings-table-card"><div className="table-card-header"><div className="table-card-title"><AlertTriangle size={20} /><span>التحذيرات النشطة</span></div></div>
    <div className="table-responsive"><table className="custom-warnings-table"><thead><tr><th>م</th><th>النوع</th><th>الخطورة</th><th>المادة</th><th>الدفعة</th><th>التفاصيل</th><th aria-label="الإجراءات" /></tr></thead><tbody>{items.map((item, index) => <tr key={item.id || index}><td>{index + 1}</td><td>{item.typeLabel}</td><td data-label="الخطورة"><span className={`severity-badge ${severityClass(item.severity)}`}>{item.severityLabel}</span></td><td data-label="المادة">{item.materialName || "—"}</td><td data-label="الدفعة"><BatchCell item={item} /></td><td data-label="التفاصيل" className="warning-details-cell">{item.detail}</td><td>{canOpenMaterial && item.material?.id ? <button type="button" className="action-view-btn" aria-label={`عرض دفعات ${item.materialName}`} title="عرض الدفعات" onClick={() => navigate(`/admin/inventory/${item.material.id}`)}><Eye size={16} /></button> : null}</td></tr>)}</tbody></table></div>
  </div>;
}
export default WarningsTable;
