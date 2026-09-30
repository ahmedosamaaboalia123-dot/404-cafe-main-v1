import { useMemo, useState } from "react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { AsyncState, Money, ServerPagination } from "@/shared/components";
import Button from "@/shared/components/Button/Button";
import Input from "@/shared/components/Input/Input";
import Select from "@/shared/components/Select/Select";
import { can } from "@/modules/auth/permissions/permission";
import { useAuthStore } from "@/store/authStore";
import {
  useDrawerReport,
  useInventoryReport,
  useReportScreen,
  useSalesReport,
  useSupplierReport,
} from "../hooks/report.queries";
import {
  firstReportFormError,
  reportRangeSchema,
  salesFilterSchema,
  supplierReportFilterSchema,
} from "../schemas/report.schema";
import "../styles/FinancialReportsPage.css";

const TABS = [
  { id: "overview", label: "نظرة عامة" },
  { id: "sales", label: "المبيعات" },
  { id: "inventory", label: "المخزون" },
  { id: "drawer", label: "الدرج" },
  { id: "suppliers", label: "الموردين" },
];

const COMPARE_OPTIONS = [
  { value: "previous_period", label: "مقارنة بالفترة السابقة" },
  { value: "none", label: "بدون مقارنة" },
];

const CHANNEL_OPTIONS = [
  { value: "ADMIN", label: "الإدارة" },
  { value: "CUSTOMER_WEB", label: "موقع العملاء" },
  { value: "TABLE", label: "الطاولات" },
];

const SUMMARY_LABELS = {
  totalSales: "إجمالي المبيعات",
  netSales: "صافي المبيعات",
  grossSales: "إجمالي المبيعات",
  sales: "المبيعات",
  total: "الإجمالي",
  totalAmount: "إجمالي المبلغ",
  revenue: "الإيراد",
  totalRevenue: "إجمالي الإيراد",
  cost: "التكلفة",
  costTotal: "إجمالي التكلفة",
  totalCost: "إجمالي التكلفة",
  cogs: "تكلفة البضاعة المباعة",
  grossProfit: "إجمالي الربح",
  refunded: "المسترد",
  profit: "الربح",
  profitTotal: "إجمالي الربح",
  totalProfit: "إجمالي الربح",
  net: "الصافي",
  netShift: "صافي الوردية",
  netTotal: "الصافي الإجمالي",
  discount: "الخصم",
  tax: "الضريبة",
  invoices: "عدد الفواتير",
  invoiceCount: "عدد الفواتير",
  orders: "عدد الطلبات",
  orderCount: "عدد الطلبات",
  transactions: "عدد الحركات",
  transactionCount: "عدد الحركات",
  movements: "عدد الحركات",
  stockValue: "قيمة المخزون",
  totalValue: "إجمالي القيمة",
  inventoryValue: "قيمة المخزون",
  batchCount: "عدد الدفعات",
  expiringBatches: "دفعات قريبة الانتهاء",
  quantity: "الكمية",
  totalQuantity: "إجمالي الكمية",
  debtBalance: "الدين الحالي",
  receivableBalance: "المستحق الحالي",
  totalDebt: "إجمالي الديون",
  totalReceivable: "إجمالي المستحقات",
  supplierDebt: "ديون الموردين",
  supplierReceivable: "مستحقات الموردين",
  delegateOutstanding: "مستحقات المناديب",
  paid: "المدفوع",
  totalPaid: "إجمالي المدفوع",
  due: "المستحق",
  balance: "الرصيد",
  closingBalance: "رصيد الإغلاق",
  openingBalance: "رصيد الافتتاح",
  cashIn: "الوارد النقدي",
  totalCashIn: "إجمالي الوارد",
  totalShifts: "إجمالي الورديات",
  cashOut: "الصادر النقدي",
  delegates: "عدد المناديب",
  suppliers: "عدد الموردين",
  settled: "المسوّاة",
  activeDelegates: "مناديب نشطون",
  assignments: "عدد المهام",
  count: "العدد", expiredBatches: "دفعات منتهية الصلاحية", withdrawalValue: "قيمة المسحوبات", openShifts: "ورديات مفتوحة", debt: "الديون", receivable: "المستحقات", outstanding: "المبالغ غير المسواة", failedDeliveries: "توصيلات متعثرة", netProfit: "صافي الربح",
};

// Raw server values (movement kinds, directions, classes, modules) shown in Arabic.
const TERM_LABELS = Object.freeze({
  ADMIN: "الإدارة", CUSTOMER_WEB: "موقع العملاء", TABLE: "الطاولات", DINE_IN: "داخل الكافيه", TAKEAWAY: "سفري", DELIVERY: "توصيل", MANUAL: "يدوي", EXPENSE: "مصروف", OTHER_INCOME: "إيراد آخر", SUPPLIER_DEBT_PAYMENT: "سداد دين مورد", SUPPLIER_RECEIVABLE_COLLECTION: "تحصيل مستحق من مورد", DEBT: "دين", RECEIVABLE: "مستحق", DEBT_PAYMENT: "سداد دين", RECEIVABLE_COLLECTION: "تحصيل مستحق", Order: "الطلبات", Inventory: "المخزون", Drawer: "الدرج", Supplier: "الموردون", Delegate: "المناديب", COMPLETED: "مكتمل", PENDING: "قيد الانتظار", CANCELLED: "ملغي",
  PURCHASE_RECEIPT: "استلام شراء",
  PURCHASE_RETURN: "مرتجع شراء",
  SALE_CONSUMPTION: "استهلاك مبيعات",
  SALE_CANCELLATION_RESTORE: "استرجاع إلغاء بيع",
  WITHDRAWAL: "سحب",
  IN: "وارد",
  OUT: "صادر",
  ORDER_CASH_SALE: "بيع نقدي",
  COD_SETTLEMENT: "تسوية تحصيل عند الاستلام",
  attendance: "الحضور",
  "customer-experience": "تجربة العميل",
  customers: "العملاء",
  delivery: "التوصيل",
  employees: "الموظفون",
  inventory: "المخزون",
  invoices: "الفواتير",
  "order-cases": "حالات الطلبات",
  orders: "الطلبات",
  payments: "المدفوعات",
  "purchase-returns": "مرتجعات المشتريات",
  reviews: "التقييمات",
  suppliers: "الموردون",
  "table-experience": "تجربة الطاولات",
  "table-services": "خدمات الطاولات",
  tables: "الطاولات",
  rawMaterials: "المواد الخام",
  rawMaterialBatches: "دفعات المواد",
  drawerShifts: "ورديات الدرج",
});

function translateTerm(value) {
  if (value == null || value === "") return "—";
  return TERM_LABELS[value] || (/^[\u0600-\u06ff\s\d،.%-]+$/.test(String(value)) ? value : "تصنيف غير معروف");
}

const COUNT_KEYS = new Set([
  "invoices",
  "invoiceCount",
  "orders",
  "orderCount",
  "transactions",
  "transactionCount",
  "movements",
  "count",
  "totalCount", "batchCount", "expiringBatches", "expiredBatches", "openShifts", "totalShifts", "activeDelegates", "failedDeliveries", "assignments",
  "quantity",
  "totalQuantity",
  "delegates",
  "suppliers",
]);

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
}

function labelFor(key) {
  return SUMMARY_LABELS[key] || "بيان إضافي";
}

function isCountKey(key) {
  return COUNT_KEYS.has(key);
}

function MoneyCell({ value }) {
  if (value === null || value === undefined || value === "") return <span>—</span>;
  return <Money value={value} />;
}

function summaryEntries(summary) {
  if (!summary || typeof summary !== "object") return [];
  return Object.entries(summary);
}

function SummaryGrid({ summary, excludeKeys = [] }) {
  const entries = summaryEntries(summary).filter(([key]) => !excludeKeys.includes(key));
  if (entries.length === 0) return <p className="fr-empty">لا يوجد ملخص لهذه الفترة.</p>;
  return (
    <div className="fr-summary-grid">
      {entries.map(([key, value]) => (
        <article key={key} className="fr-summary-card">
          <span>{labelFor(key)}</span>
          <strong>
            {value === null || value === undefined || value === "" ? (
              "—"
            ) : isCountKey(key) || typeof value === "boolean" ? (
              typeof value === "boolean" ? (value ? "نعم" : "لا") : String(value)
            ) : typeof value === "number" || !Number.isNaN(Number(value)) ? (
              <Money value={value} />
            ) : (
              translateTerm(value)
            )}
          </strong>
        </article>
      ))}
    </div>
  );
}

function QualityBanner({ dataQuality, failedSources }) {
  const failed = Array.isArray(failedSources) ? failedSources : [];
  if (dataQuality !== "ERROR" && failed.length === 0) return null;
  return (
    <p className="fr-quality-banner" role="alert">
      جودة البيانات: غير مكتملة{failed.length > 0 ? ` — مصادر متعثرة: ${failed.map(translateTerm).join("، ")}` : ""}.
      القيم المتأثرة تظهر بعلامة (—).
    </p>
  );
}

function DataTable({ columns, rows, emptyText = "لا توجد بيانات في الفترة المحددة" }) {
  return (
    <div className="fr-table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="fr-empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.key || index}>
                {row.cells.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const rowDate = (row) => row.date || row.day || row.period || row.occurredOn || row.createdAt || "—";
const rowInvoices = (row) => row.invoices ?? row.invoiceCount ?? row.count ?? "—";
const rowChannel = (row) => translateTerm(row.channel);
/**
 * The report groups the ledger by product *and* size and returns them as `product`
 * and `size`. Reading `productName`/`name` here rendered an empty cell for every
 * row, because neither field exists in the response.
 */
const rowProduct = (row) => {
  const name = row.product || row.productName || row.name;
  if (!name) return "—";
  return row.size ? `${name} — ${row.size}` : name;
};

function OverviewTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [compare, setCompare] = useState("previous_period");
  const [formError, setFormError] = useState("");

  const [applied, setApplied] = useState({ compare: "previous_period" });
  const query = useReportScreen(applied);

  const apply = (event) => {
    event.preventDefault();
    const result = reportRangeSchema.safeParse(cleanParams({ from, to, compare }));
    if (!result.success) {
      setFormError(firstReportFormError(result));
      return;
    }
    setFormError("");
    if (JSON.stringify(applied) === JSON.stringify(result.data)) query.refetch();
    else setApplied(result.data);
  };

  const screen = query.data;
  const cards = screen?.cards ? summaryEntries(screen.cards).filter(([key]) => key !== "delegateOutstanding") : [];
  const trend = screen?.charts?.salesTrend || [];
  const topProducts = screen?.topProducts || [];
  const alerts = screen?.alerts || [];

  return (
    <section className="fr-section" aria-label="نظرة عامة">
      <form className="fr-toolbar" onSubmit={apply}>
        <Input label="من" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input label="إلى" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <Select label="المقارنة" value={compare} onChange={(event) => setCompare(event.target.value)} options={COMPARE_OPTIONS} />
        <Button type="submit" loading={query.isFetching}>
          تحديث
        </Button>
      </form>
      {formError && (
        <p className="fr-error" role="alert">
          {formError}
        </p>
      )}
      <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={false}>
        <QualityBanner dataQuality={screen?.dataQuality} failedSources={screen?.failedSources} />
        {screen?.period && (
          <p className="fr-period">
            الفترة: {screen.period.from || "—"} إلى {screen.period.to || "—"}
            {screen.comparisonPeriod ? ` — مقارنة: ${screen.comparisonPeriod.from || "—"} إلى ${screen.comparisonPeriod.to || "—"}` : " — بدون مقارنة"}
          </p>
        )}
        <div className="fr-cards">
          {cards.length === 0 ? (
            <p className="fr-empty">لا توجد بطاقات لهذه الفترة.</p>
          ) : (
            cards.map(([key, value]) => (
              <article key={key}>
                <span>{labelFor(key)}</span>
                <strong>
                  {value === null || value === undefined || value === "" ? (
                    "—"
                  ) : isCountKey(key) ? (
                    String(value)
                  ) : (
                    <Money value={value} />
                  )}
                </strong>
              </article>
            ))
          )}
        </div>

        <h3>التنبيهات</h3>
        {alerts.length === 0 ? (
          <p className="fr-empty">لا توجد تنبيهات.</p>
        ) : (
          <ul className="fr-alerts">
            {alerts.map((alert, index) => (
              <li key={alert.id || index}>{typeof alert === "string" ? alert : alert.message || alert.title || JSON.stringify(alert)}</li>
            ))}
          </ul>
        )}

        <h3>اتجاه المبيعات</h3>
        <DataTable
          columns={["الفترة", "المبيعات", "الطلبات", "الفواتير"]}
          rows={trend.map((row, index) => ({
            key: row.id || index,
            cells: [
              rowDate(row),
              <MoneyCell key="s" value={row.sales ?? row.total ?? row.netSales} />,
              row.orders ?? row.orderCount ?? "—",
              rowInvoices(row),
            ],
          }))}
        />

        <h3>الأصناف الأعلى مبيعًا</h3>
        <DataTable
          columns={["الصنف", "الكمية", "الإيراد"]}
          rows={topProducts.map((row, index) => ({
            key: row.productId || row.id || `${rowProduct(row)}-${index}`,
            cells: [
              rowProduct(row),
              row.quantity ?? row.qty ?? "—",
              <MoneyCell key="r" value={row.revenue ?? row.total ?? row.netSales} />,
            ],
          }))}
        />
      </AsyncState>
    </section>
  );
}

function RangeFilters({ from, to, onFrom, onTo, extra, onApply, loading }) {
  return (
    <form className="fr-toolbar" onSubmit={onApply}>
      <Input label="من" type="date" value={from} onChange={(event) => onFrom(event.target.value)} />
      <Input label="إلى" type="date" value={to} onChange={(event) => onTo(event.target.value)} />
      {extra}
      <Button type="submit" loading={loading}>
        تحديث
      </Button>
    </form>
  );
}

function SalesTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState("");

  const params = useMemo(
    () => cleanParams({ from, to, channel: channel || undefined, page, limit: 10 }),
    [from, to, channel, page],
  );
  const query = useSalesReport(params);

  const apply = (event) => {
    event.preventDefault();
    if (from && to && from > to) {
      setFormError("تاريخ البداية يجب أن يسبق تاريخ النهاية");
      return;
    }
    const result = salesFilterSchema.safeParse(cleanParams({ from, to, channel: channel || undefined }));
    if (!result.success) {
      setFormError(firstReportFormError(result));
      return;
    }
    setFormError("");
    setPage(1);
    query.refetch();
  };

  const report = query.data;

  return (
    <section className="fr-section" aria-label="تقرير المبيعات">
      <RangeFilters
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        loading={query.isFetching}
        onApply={apply}
        extra={
          <Select
            label="القناة"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            options={CHANNEL_OPTIONS}
            placeholder="كل القنوات"
          />
        }
      />
      {formError && (
        <p className="fr-error" role="alert">
          {formError}
        </p>
      )}
      <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={false}>
        <QualityBanner dataQuality={report?.dataQuality} failedSources={report?.failedSources} />
        <SummaryGrid summary={report?.summary} excludeKeys={["refunded"]} />
        <h3>اتجاه المبيعات</h3>
        <DataTable
          columns={["الفترة", "القناة", "الفواتير", "المبيعات", "التكلفة", "الربح"]}
          rows={(report?.items || []).map((row, index) => ({
            key: row.id || index,
            cells: [
              rowDate(row),
              rowChannel(row),
              rowInvoices(row),
              <MoneyCell key="s" value={row.sales ?? row.total ?? row.netSales} />,
              <MoneyCell key="c" value={row.cost ?? row.costTotal} />,
              <MoneyCell key="p" value={row.profit ?? row.profitTotal} />,
            ],
          }))}
        />
        <ServerPagination meta={report?.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="صف" />
      </AsyncState>
    </section>
  );
}

function InventoryTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState("");

  const params = useMemo(() => cleanParams({ from, to, page, limit: 10 }), [from, to, page]);
  const query = useInventoryReport(params);

  const apply = (event) => {
    event.preventDefault();
    if (from && to && from > to) {
      setFormError("تاريخ البداية يجب أن يسبق تاريخ النهاية");
      return;
    }
    setFormError("");
    setPage(1);
    query.refetch();
  };

  const report = query.data;
  const valueByMaterial = report?.breakdowns?.valueByMaterial || [];
  const expiring = report?.breakdowns?.expiring || [];

  return (
    <section className="fr-section" aria-label="تقرير المخزون">
      <RangeFilters from={from} to={to} onFrom={setFrom} onTo={setTo} onApply={apply} loading={query.isFetching} />
      {formError && (
        <p className="fr-error" role="alert">
          {formError}
        </p>
      )}
      <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={false}>
        <QualityBanner dataQuality={report?.dataQuality} failedSources={report?.failedSources} />
        <SummaryGrid summary={report?.summary} />
        <h3>حركات المخزون</h3>
        <DataTable
          columns={["المادة", "نوع الحركة", "الكمية", "القيمة", "التاريخ"]}
          rows={(report?.items || []).map((row, index) => ({
            key: row.id || row.materialId || index,
            cells: [
              row.materialName || row.name || "—",
              translateTerm(row.movementType || row.type || row.kind),
              row.quantity ?? row.qty ?? "—",
              <MoneyCell key="v" value={row.value ?? row.totalValue ?? row.amount} />,
              rowDate(row),
            ],
          }))}
        />
        <ServerPagination meta={report?.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="حركة" />
        <h3>القيمة حسب المادة</h3>
        <DataTable
          columns={["المادة", "الكمية", "القيمة"]}
          rows={valueByMaterial.map((row, index) => ({
            key: row.materialId || index,
            cells: [
              row.materialName || row.name || "—",
              row.quantity ?? row.qty ?? "—",
              <MoneyCell key="v" value={row.value ?? row.totalValue ?? row.amount} />,
            ],
          }))}
        />
        <h3>مواد قريبة الانتهاء</h3>
        <DataTable
          columns={["المادة", "الكمية", "تاريخ الانتهاء"]}
          rows={expiring.map((row, index) => ({
            key: row.materialId || row.batchId || index,
            cells: [row.materialName || row.name || "—", row.quantity ?? row.qty ?? "—", row.expiryDate || row.expiresAt || "—"],
          }))}
        />
      </AsyncState>
    </section>
  );
}

function DrawerTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState("");

  const params = useMemo(() => cleanParams({ from, to, page, limit: 10 }), [from, to, page]);
  const query = useDrawerReport(params);

  const apply = (event) => {
    event.preventDefault();
    if (from && to && from > to) {
      setFormError("تاريخ البداية يجب أن يسبق تاريخ النهاية");
      return;
    }
    setFormError("");
    setPage(1);
    query.refetch();
  };

  const report = query.data;
  const byClass = report?.breakdowns?.byAccountingClass || [];

  return (
    <section className="fr-section" aria-label="تقرير الدرج">
      <RangeFilters from={from} to={to} onFrom={setFrom} onTo={setTo} onApply={apply} loading={query.isFetching} />
      {formError && (
        <p className="fr-error" role="alert">
          {formError}
        </p>
      )}
      <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={false}>
        <QualityBanner dataQuality={report?.dataQuality} failedSources={report?.failedSources} />
        <SummaryGrid
          summary={{
            totalShifts: report?.summary?.totalShifts,
            totalCashIn: report?.summary?.cashIn,
          }}
        />
        <h3>حركات الدرج</h3>
        <DataTable
          columns={["التسلسل", "الاتجاه", "المبلغ", "البيان", "التاريخ"]}
          rows={(report?.items || []).map((row, index) => ({
            key: row.id || index,
            cells: [
              row.sequenceNo ?? row.shiftId ?? "—",
              translateTerm(row.direction),
              <MoneyCell key="a" value={row.amount ?? row.total} />,
              row.description || row.notes || row.sourceType || "—",
              row.recordedAt ? new Date(row.recordedAt).toLocaleString("ar-EG") : rowDate(row),
            ],
          }))}
        />
        <ServerPagination meta={report?.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="حركة" />
        <h3>حسب الفئة المحاسبية</h3>
        <DataTable
          columns={["الفئة", "العدد", "الإجمالي"]}
          rows={byClass.map((row, index) => ({
            key: row.accountingClass || index,
            cells: [
              translateTerm(row.accountingClass || row.class),
              row.count ?? row.transactions ?? "—",
              <MoneyCell key="t" value={row.total ?? row.amount} />,
            ],
          }))}
        />
      </AsyncState>
    </section>
  );
}

function SuppliersTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState("");

  const params = useMemo(
    () => cleanParams({ from, to, supplierId: supplierId.trim() || undefined, page, limit: 10 }),
    [from, to, supplierId, page],
  );
  const query = useSupplierReport(params);

  const apply = (event) => {
    event.preventDefault();
    if (from && to && from > to) {
      setFormError("تاريخ البداية يجب أن يسبق تاريخ النهاية");
      return;
    }
    const trimmed = supplierId.trim();
    const result = supplierReportFilterSchema.safeParse(
      cleanParams({ from, to, supplierId: trimmed || undefined }),
    );
    if (!result.success) {
      setFormError(firstReportFormError(result));
      return;
    }
    setFormError("");
    setPage(1);
    query.refetch();
  };

  const report = query.data;
  const topDebtors = report?.breakdowns?.topDebtors || [];
  const recentEntries = report?.breakdowns?.recentEntries || [];

  return (
    <section className="fr-section" aria-label="تقرير الموردين">
      <RangeFilters
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        onApply={apply}
        loading={query.isFetching}
        extra={
          <Input
            label="معرف المورد (اختياري)"
            placeholder="ObjectId للمورد"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
          />
        }
      />
      {formError && (
        <p className="fr-error" role="alert">
          {formError}
        </p>
      )}
      <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={false}>
        <QualityBanner dataQuality={report?.dataQuality} failedSources={report?.failedSources} />
        <SummaryGrid summary={report?.summary} />
        <h3>حسابات الموردين</h3>
        <DataTable
          columns={["المورد", "الدين", "المستحق", "الإجمالي"]}
          rows={(report?.items || []).map((row, index) => ({
            key: row.supplierId || row.id || index,
            cells: [
              row.supplierName || row.name || "—",
              <MoneyCell key="d" value={row.debtBalance ?? row.totalDebt} />,
              <MoneyCell key="r" value={row.receivableBalance ?? row.totalReceivable} />,
              <MoneyCell key="t" value={row.total ?? row.balance} />,
            ],
          }))}
        />
        <ServerPagination meta={report?.pageMeta} onPageChange={setPage} disabled={query.isFetching} label="حساب" />
        <h3>أعلى المدينين</h3>
        <DataTable
          columns={["المورد", "الدين"]}
          rows={topDebtors.map((row, index) => ({
            key: row.supplierId || index,
            cells: [row.supplierName || row.name || "—", <MoneyCell key="d" value={row.debtBalance ?? row.totalDebt ?? row.total} />],
          }))}
        />
        <h3>أحدث القيود</h3>
        <DataTable
          columns={["المورد", "النوع", "المبلغ", "التاريخ"]}
          rows={recentEntries.map((row, index) => ({
            key: row.id || index,
            cells: [
              row.supplierName || row.name || "—",
              translateTerm(row.kind || row.type),
              <MoneyCell key="a" value={row.amount ?? row.total} />,
              row.occurredOn || rowDate(row),
            ],
          }))}
        />
      </AsyncState>
    </section>
  );
}

export default function FinancialReportsPage() {
  const [tab, setTab] = useState("overview");
  const permissions = useAuthStore((state) => state.permissions);
  const canRead = can(permissions, "reports.read");

  return (
    <div className="fr-page" dir="rtl">
      <PageHeader title="التقارير المالية" breadcrumbs={["الإدارة", "التقارير المالية"]} />
      {!canRead ? (
        <p className="fr-error" role="alert">
          عرض التقارير يتطلب صلاحية reports.read.
        </p>
      ) : (
        <>
          <div className="fr-tabs" role="tablist" aria-label="أقسام التقارير">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={tab === entry.id}
                className={tab === entry.id ? "active" : ""}
                onClick={() => setTab(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {tab === "overview" && <OverviewTab />}
          {tab === "sales" && <SalesTab />}
          {tab === "inventory" && <InventoryTab />}
          {tab === "drawer" && <DrawerTab />}
          {tab === "suppliers" && <SuppliersTab />}
        </>
      )}
    </div>
  );
}
