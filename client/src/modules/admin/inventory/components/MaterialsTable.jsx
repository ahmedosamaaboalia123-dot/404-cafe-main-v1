import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Eye, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { AsyncState, Money, ServerPagination } from "@/shared/components";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { useMaterialsScreen } from "../hooks/inventory.queries";
import DeleteMaterialDialog from "./DeleteMaterialDialog";
import "./MaterialsTable.css";

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("ar-EG");
};

const daysUntil = (value) => {
  if (!value) return null;
  const date = new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date.getTime() - today.getTime()) / 86400000);
};

function ExpiryCell({ value, expiryAlertDays }) {
  if (!value) return <span className="expiry-badge expiry-badge--none">بدون صلاحية</span>;
  const label = formatDate(value);
  const diff = daysUntil(value);
  const alertDays = Number(expiryAlertDays) > 0 ? Number(expiryAlertDays) : 30;
  if (diff !== null && diff < 0)
    return <span className="expiry-badge expiry-badge--expired">{label} (منتهية)</span>;
  if (diff !== null && diff <= alertDays)
    return <span className="expiry-badge expiry-badge--soon">{label} ({diff === 0 ? "تنتهي اليوم" : `خلال ${diff} يوم`})</span>;
  return label;
}

function MaterialRow({ row, index, canUpdate, canDelete, supplierName, unitName, onOpen, onDelete }) {
  return <tr><td>{index}</td><td className="material-name-cell">{row.name}</td><td>{unitName}</td><td className="stock-qty-cell">{row.stockSmall ?? "—"}</td><td>{row.lastPurchasePrice == null ? "—" : <Money value={row.lastPurchasePrice} />}</td><td>{supplierName}</td><td><ExpiryCell value={row.nextExpiry} expiryAlertDays={row.expiryAlertDays} /></td><td className="actions-cell"><div className="row-actions-group">
    <button type="button" className="action-btn action-btn--gray" aria-label={`عرض تفاصيل ${row.name}`} title="عرض" onClick={onOpen}><Eye size={16} /></button>
    {canUpdate && <button type="button" className="action-btn action-btn--blue" aria-label={`تعديل ${row.name}`} title="تعديل" onClick={onOpen}><Pencil size={16} /></button>}
    {canDelete && <button type="button" className="action-btn action-btn--red" aria-label={`حذف ${row.name}`} title="حذف" onClick={onDelete}><Trash2 size={16} /></button>}
  </div></td></tr>;
}

export default function MaterialsTable() {
  const navigate = useNavigate(); const permissions = useAuthStore((state) => state.permissions);
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const debouncedSearch = useDebounce(search, 500);
  const query = useMaterialsScreen({ page, limit: 10, search: debouncedSearch || undefined });
  const data = query.data; const rows = data?.materials || [];
  const refreshOnStockEvent = (event) => {
    if (["order.created", "order.cancelled", "order.completed"].includes(event?.type)) query.refetch();
  };
  useRealtimeRoom({ scope: "materials:list", rooms: ["admin:orders"], enabled: rows.length > 0, onEvent: refreshOnStockEvent });
  const supplierNameOf = (row) => data?.filters?.suppliers?.find((item) => String(item.id) === String(row.supplierId))?.name || "—";
  const unitNameOf = (row) => data?.filters?.units?.find((item) => String(item.id) === String(row.largeUnitId))?.nameAr || "—";
  return <div className="materials-table-card">
    <div className="table-card-header"><div className="table-card-title"><div className="title-users-badge"><Boxes size={20} /></div><span>قائمة المواد الخام</span></div><div className="table-header-actions"><div className="search-input-wrapper"><input className="table-search-input" placeholder="ابحث باسم المادة" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><Search size={17} className="table-search-icon" /></div><button className="refresh-icon-btn" aria-label="تحديث" onClick={() => query.refetch()}><RefreshCw size={17} className={query.isFetching ? "is-spinning" : ""} /></button></div></div>
    <div className="table-card-summary"><span>المواد: <strong>{data?.summary?.materials ?? 0}</strong></span><span>نقص المخزون: <strong>{data?.summary?.lowStock ?? "—"}</strong></span><span>قرب انتهاء: <strong>{data?.summary?.expiring ?? "—"}</strong></span><span>منتهية: <strong>{data?.summary?.expired ?? "—"}</strong></span></div>
    <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={!query.isLoading && rows.length === 0} emptyText="لا توجد مواد خام مطابقة للبحث">
      <div className="table-responsive"><table className="custom-materials-table"><thead><tr><th>م</th><th>المادة</th><th>الوحدة الكبيرة</th><th>المخزون (صغيرة)</th><th>آخر سعر شراء</th><th>المورد</th><th>أقرب صلاحية</th><th>الإجراءات</th></tr></thead><tbody>{rows.map((row, index) => <MaterialRow key={row.id} row={row} index={(page - 1) * 10 + index + 1} canUpdate={can(permissions, "inventory.manage")} canDelete={can(permissions, "inventory.manage")} supplierName={supplierNameOf(row)} unitName={unitNameOf(row)} onOpen={() => navigate(`/admin/inventory/${row.id}`)} onDelete={() => setDeleteTarget(row)} />)}</tbody></table></div>
    </AsyncState>
    <ServerPagination meta={data?.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="مادة" />
    {deleteTarget && <DeleteMaterialDialog material={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); query.refetch(); }} />}
  </div>;
}
