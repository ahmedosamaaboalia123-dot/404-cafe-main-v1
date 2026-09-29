import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { AsyncState, ConfirmAction, Money, ServerPagination } from "@/shared/components";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { useSuppliersScreen } from "../hooks/supplier.queries";
import { useDeleteSupplier } from "../hooks/supplier.mutations";
import "./SuppliersTable.css";

function SupplierRow({ row, index, canUpdate, canDelete, onOpen, onDeleted }) {
  const remove = useDeleteSupplier(row.id, { onSuccess: onDeleted });
  return <tr><td>{index}</td><td className="supplier-name-cell">{row.name}</td><td>{row.contactPerson}</td><td dir="ltr">{row.phone}</td><td>{row.city}</td><td><Money value={row.debtBalance}/></td><td><Money value={row.receivableBalance}/></td><td className="actions-cell"><div className="row-actions-group">
    <button type="button" className="action-icon-btn btn-view" aria-label={`عرض تفاصيل ${row.name}`} onClick={onOpen}><Eye size={17}/></button>
    {canUpdate && <button type="button" className="action-icon-btn btn-edit" aria-label={`تعديل ${row.name}`} onClick={onOpen}><Pencil size={17}/></button>}
    {canDelete && <ConfirmAction danger requireReason pending={remove.isPending} title="حذف المورد" message={`لن يُحذف «${row.name}» إذا كان مرتبطًا بمواد أو فواتير أو قيود مالية.`} confirmLabel="حذف" onConfirm={(reason) => remove.mutateAsync({ reason, expectedVersion: row.version })}><Trash2 size={17}/></ConfirmAction>}
  </div>{remove.isError && <small className="row-error" role="alert">{remove.error.message}</small>}</td></tr>;
}

export default function SuppliersTable() {
  const navigate = useNavigate(); const permissions = useAuthStore((state) => state.permissions);
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 500);
  const query = useSuppliersScreen({ page, limit: 10, search: debouncedSearch || undefined });
  const data = query.data; const rows = data?.suppliers || [];
  useRealtimeRoom({ scope: "suppliers:list", rooms: rows.map((row) => `aggregate:Supplier:${row.id}`), enabled: rows.length > 0 });
  const deleted = async () => { if (rows.length === 1 && page > 1) setPage((value) => value - 1); else await query.refetch(); };
  return <div className="suppliers-table-card">
    <div className="supplier-screen-summary"><article><span>إجمالي الموردين</span><strong>{data?.summary.totalSuppliers ?? 0}</strong></article><article><span>إجمالي الديون</span><Money value={data?.summary.totalDebt}/></article><article><span>إجمالي المستحقات</span><Money value={data?.summary.totalReceivable}/></article></div>
    <div className="table-card-header"><div className="table-card-title"><div className="title-users-badge"><Users size={18}/></div><span>قائمة الموردين</span></div><div className="table-header-actions"><div className="search-input-wrapper"><input className="table-search-input" placeholder="ابحث بالاسم أو المسؤول أو الهاتف" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/><Search size={17} className="table-search-icon"/></div><button className="refresh-btn" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={16}/>تحديث</button></div></div>
    <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={!query.isLoading && rows.length === 0} emptyText="لا يوجد موردون يطابقون البحث">
      <div className="table-responsive-container"><table className="custom-suppliers-table"><thead><tr><th>م</th><th>اسم المورد</th><th>المسؤول</th><th>الهاتف</th><th>المدينة</th><th>الديون</th><th>المستحقات</th><th>الإجراءات</th></tr></thead><tbody>{rows.map((row, index) => <SupplierRow key={row.id} row={row} index={(page - 1) * 10 + index + 1} canUpdate={can(permissions, "suppliers.update")} canDelete={can(permissions, "suppliers.update")} onOpen={() => navigate(`/admin/suppliers/${row.id}`)} onDeleted={deleted}/>)}</tbody></table></div>
    </AsyncState>
    <ServerPagination meta={data?.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="مورد"/>
  </div>;
}
