import { useState } from "react";
import { Boxes, RefreshCw } from "lucide-react";
import { AsyncState, Money, ServerPagination } from "@/shared/components";
import { convertForDisplay } from "../adapters/inventory.adapter";
import { useWithdrawalsQuery } from "../hooks/inventory.queries";
import "./MaterialsTable.css";
import "./WithdrawnMaterialsTable.css";

const kindLabel = (kind) => ({
  WITHDRAWAL: "سحب يدوي", PURCHASE_RECEIPT: "استلام مشتريات", SALE_CONSUMPTION: "صرف بيع",
  SALE_CANCELLATION_RESTORE: "استعادة إلغاء", PURCHASE_RETURN: "مرتجع مشتريات",
}[kind] || kind || "—");

// Display-only: converts to the large unit using the material conversionFactor
// (passed by the details page) or the server-provided amount, and falls back to
// the small-unit string when neither is available.
function qtyCell({ large, small, conversionFactor }) {
  if (conversionFactor) return convertForDisplay(small, conversionFactor, "small-to-large");
  if (large != null) return large;
  return `${small} (صغيرة)`;
}

function WithdrawnMaterialsTable({ materialId, conversionFactor }) {
  const [page, setPage] = useState(1);
  const query = useWithdrawalsQuery({ page, limit: 10, materialId });
  const rows = query.data?.items || [];
  return <div className="materials-table-card"><div className="table-card-header"><div className="table-card-title"><Boxes size={20} /><span>سجل حركات المخزون</span></div><button className="refresh-icon-btn" aria-label="تحديث" onClick={() => query.refetch()}><RefreshCw size={15} className={query.isFetching ? "is-spinning" : ""} /></button></div>
    <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={!query.isLoading && rows.length === 0} emptyText="لا توجد حركات مسجلة.">
      <div className="table-responsive"><table className="custom-materials-table"><thead><tr><th>م</th><th>النوع</th><th>الكمية المسحوبة (كبيرة)</th><th>القيمة</th><th>الكمية بعده (كبيرة)</th><th>السبب</th><th>التاريخ</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td>{(page - 1) * 10 + index + 1}</td><td>{kindLabel(row.kind)}</td><td className="movement-qty-cell">{qtyCell({ large: row.quantityLarge, small: row.quantitySmall, conversionFactor })}</td><td><Money value={row.inventoryValue} /></td><td className="movement-qty-cell">{qtyCell({ large: row.quantityAfterLarge, small: row.quantityAfterSmall, conversionFactor })}</td><td>{row.reason || "—"}</td><td>{row.occurredOn || "—"}</td></tr>)}</tbody></table></div>
    </AsyncState>
    <ServerPagination meta={query.data?.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="حركة" />
  </div>;
}
export default WithdrawnMaterialsTable;
