import { Fragment, useState } from "react";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { AsyncState, Money, PrintDocument, ServerPagination } from "@/shared/components";
import { can } from "@/modules/auth/permissions/permission";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeRoom } from "@/realtime/useRealtimeRoom";
import { returnsApi } from "../api/returns.api";
import { toReturnPrintData } from "../adapters/return.adapter";
import { useReturnDetails, useReturnsScreen } from "../hooks/return.queries";
import CreateReturnForm from "../components/CreateReturnForm";
import { useDebounce } from "@/shared/hooks/useDebounce";
import Input from "@/shared/components/Input/Input";
import "./ReturnsPage.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("ar-EG");
};

function renderReturnSheet(data = {}) {
  const items = data.items || [];
  const totals = data.totals || {};
  return (
    <div dir="rtl">
      <h2>مرتجع مشتريات{data.number ? ` — ${data.number}` : ""}</h2>
      <p>
        التاريخ: {formatDate(data.returnDate ?? data.date)} | عدد البنود: {totals.itemCount ?? items.length} | الإجمالي
        المخزني: {totals.totalInventoryValue ?? "0"} ج.م
      </p>
      <table>
        <thead>
          <tr>
            <th>المادة</th>
            <th>الدفعة</th>
            <th>الكمية (كبيرة)</th>
            <th>تكلفة الوحدة</th>
            <th>الإجمالي</th>
            <th>السبب</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.material?.name || "—"}</td>
              <td>{item.batch?.batchNumber || "—"}</td>
              <td>{item.quantityLarge}</td>
              <td>{item.unitCost}</td>
              <td>{item.totalValue}</td>
              <td>{item.reason || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.notes ? <p>ملاحظات: {data.notes}</p> : null}
    </div>
  );
}

function ReturnDetails({ id }) {
  const query = useReturnDetails(id);
  const items = query.data?.items || [];
  return (
    <AsyncState
      loading={query.isLoading}
      error={query.error}
      onRetry={query.refetch}
      empty={!query.isLoading && items.length === 0}
      emptyText="لا توجد بنود في هذا المرتجع"
    >
      <div className="returns-table-wrapper">
        <table className="returns-table">
          <thead>
            <tr>
              <th>المادة</th>
              <th>الدفعة</th>
              <th>الكمية (كبيرة)</th>
              <th>تكلفة الوحدة</th>
              <th>الإجمالي</th>
              <th>السبب</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.material?.name || "—"}</td>
                <td>{item.batch?.batchNumber || "—"}</td>
                <td>{item.quantityLarge}</td>
                <td><Money value={item.unitCost} /></td>
                <td><Money value={item.totalValue} /></td>
                <td>{item.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.data?.return?.notes ? <p className="returns-details-notes">ملاحظات: {query.data.return.notes}</p> : null}
    </AsyncState>
  );
}

export default function ReturnsPage() {
  const permissions = useAuthStore((state) => state.permissions);
  const canCreate = can(permissions, "purchase-returns.create");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const debouncedSupplier = useDebounce(supplierSearch, 350);
  const screen = useReturnsScreen({ page, limit: 10, supplierSearch: debouncedSupplier.trim() || undefined });
  const rows = screen.data?.returns || [];
  const summary = screen.data?.summary || { count: 0, totalInventoryValue: "0" };

  useRealtimeRoom({
    scope: "returns:list",
    rooms: ["admin:purchases"],
    enabled: true,
    onEvent: () => screen.refetch(),
  });

  return (
    <div className="returns-page">
      <PageHeader title="مرتجعات المشتريات" breadcrumbs={["الرئيسية", "مرتجعات المشتريات"]} icon={RotateCcw} />
      <div className="returns-page-container">
        {canCreate && (
          <section className="returns-card" aria-label="إنشاء مرتجع">
            <CreateReturnForm onCreated={() => screen.refetch()} />
          </section>
        )}
        <section className="returns-card" aria-label="سجل المرتجعات">
          <h2 className="returns-card__title">سجل مرتجعات المشتريات</h2>
          <Input label="بحث عن المورد" aria-label="بحث عن المورد" name="return-supplier-search" placeholder="اكتب اسم المورد" value={supplierSearch} onChange={(event) => { setSupplierSearch(event.target.value); setPage(1); setExpandedId(null); }} />
          <div className="returns-summary">
            <div className="returns-summary__item">
              <span>عدد المرتجعات</span>
              <strong>{summary.count ?? 0}</strong>
            </div>
            <div className="returns-summary__item">
              <span>إجمالي القيمة المخزنية</span>
              <strong><Money value={summary.totalInventoryValue ?? "0"} /></strong>
            </div>
          </div>
          <AsyncState
            loading={screen.isLoading}
            error={screen.error}
            onRetry={screen.refetch}
            empty={!screen.isLoading && rows.length === 0}
            emptyText="لا توجد مرتجعات"
          >
            <div className="returns-table-wrapper">
              <table className="returns-table">
                <thead>
                  <tr>
                    <th>رقم المرتجع</th>
                    <th>التاريخ</th>
                    <th>البنود</th>
                    <th>القيمة المخزنية</th>
                    <th>التفاصيل</th>
                    <th>طباعة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const expanded = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr>
                          <td>{row.returnNo || "—"}</td>
                          <td>{formatDate(row.returnDate)}</td>
                          <td>{row.itemCount}</td>
                          <td><Money value={row.totalInventoryValue} /></td>
                          <td>
                            <button
                              type="button"
                              className="returns-row-btn"
                              aria-expanded={expanded}
                              onClick={() => setExpandedId(expanded ? null : row.id)}
                            >
                              {expanded ? <EyeOff size={16} /> : <Eye size={16} />} {expanded ? "إخفاء" : "التفاصيل"}
                            </button>
                          </td>
                          <td>
                            <PrintDocument
                              title={`مرتجع مشتريات ${row.returnNo || row.id}`}
                              buttonLabel="طباعة"
                              loadPrintData={async () => toReturnPrintData(await returnsApi.printData(row.id))}
                              render={renderReturnSheet}
                            />
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="returns-details-row">
                            <td colSpan={6}><ReturnDetails id={row.id} /></td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AsyncState>
          <ServerPagination
            meta={screen.data?.pageMeta}
            onPageChange={(next) => { setExpandedId(null); setPage(next); }}
            disabled={screen.isFetching}
            label="مرتجع"
          />
        </section>
      </div>
    </div>
  );
}
