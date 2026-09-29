import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { AsyncState, Money, ServerPagination } from "@/shared/components";
import { PURCHASE_TABS } from "../adapters/purchase.adapter";
import { usePurchasesScreen } from "../hooks/purchase.queries";
import "./GroupsTable.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("ar-EG");
};

export default function GroupsTable({ onOpen }) {
  const [tab, setTab] = useState("unregistered");
  const [page, setPage] = useState(1);
  const query = usePurchasesScreen({ tab, page, limit: 10 });
  const groups = query.data?.groups || [];
  const summary = query.data?.summary;

  const changeTab = (value) => {
    setTab(value);
    setPage(1);
  };

  return (
    <section className="purchase-groups-card" aria-label="مجموعات الشراء">
      {(summary || query.isLoading) && (
        <div className="purchase-groups-summary">
          <article>
            <span>مسودة</span>
            <strong>{summary?.draft ?? 0}</strong>
          </article>
          <article>
            <span>مقسمة</span>
            <strong>{summary?.split ?? 0}</strong>
          </article>
          <article>
            <span>مسجلة جزئيًا</span>
            <strong>{summary?.partiallyRegistered ?? 0}</strong>
          </article>
          <article>
            <span>مسجلة</span>
            <strong>{summary?.registered ?? 0}</strong>
          </article>
        </div>
      )}
      <div className="purchase-groups-toolbar">
        <div className="purchase-groups-title">
          <span className="purchase-groups-title__badge">
            <ClipboardList size={18} />
          </span>
          <span>مجموعات الشراء</span>
        </div>
        <div className="purchase-groups-tabs" role="tablist" aria-label="تصفية المجموعات">
          {PURCHASE_TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              className={`purchase-groups-tab ${tab === item.value ? "active" : ""}`}
              onClick={() => changeTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <AsyncState
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        empty={!query.isLoading && groups.length === 0}
        emptyText="لا توجد مجموعات شراء مطابقة"
      >
        <div className="table-responsive">
          <table className="purchase-groups-table">
            <thead>
              <tr>
                <th>رقم المجموعة</th>
                <th>تاريخ الفاتورة</th>
                <th>الحالة</th>
                <th>البنود (مسجل / كلي)</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="purchase-groups-row" onClick={() => onOpen?.(group.id)}>
                  <td>
                    <button
                      type="button"
                      className="purchase-groups-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen?.(group.id);
                      }}
                    >
                      {group.groupNo || "—"}
                    </button>
                  </td>
                  <td>{formatDate(group.invoiceDate)}</td>
                  <td>
                    <span className={`purchase-status purchase-status--${group.status}`}>
                      {group.statusLabel}
                    </span>
                  </td>
                  <td>
                    {group.registeredCount} / {group.itemCount}
                  </td>
                  <td>
                    <Money value={group.subtotal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
      <ServerPagination
        meta={query.data?.pageMeta}
        onPageChange={setPage}
        disabled={query.isFetching}
        label="مجموعة"
      />
    </section>
  );
}
