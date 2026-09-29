import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { REPORT_ENDPOINTS } from "@/modules/admin/financial-reports/api/reports.api";
import { AUDIT_ENDPOINTS } from "@/modules/admin/audit/api/audit.api";
import { REVIEW_ENDPOINTS } from "@/modules/admin/reviews/api/reviews.api";
import { NOTIFICATION_ENDPOINTS } from "@/modules/admin/notifications/api/notifications.api";
import {
  REPORT_TYPES,
  toDelegateReport,
  toDrawerReport,
  toExportJob,
  toInventoryReport,
  toReportScreen,
  toSalesReport,
  toSupplierReport,
} from "@/modules/admin/financial-reports/adapters/report.adapter";
import {
  exportRequestSchema,
  firstReportFormError,
  reportRangeSchema,
} from "@/modules/admin/financial-reports/schemas/report.schema";
import {
  toAuditEvent,
  toAuditScreen,
  toEntityTimeline,
} from "@/modules/admin/audit/adapters/audit.adapter";
import { auditFilterSchema } from "@/modules/admin/audit/schemas/audit.schema";
import {
  toOrderReview,
  toReviewsList,
} from "@/modules/admin/reviews/adapters/review.adapter";
import { reviewModerationSchema } from "@/modules/admin/reviews/schemas/review.schema";
import { toNotificationsList } from "@/modules/admin/notifications/adapters/notification.adapter";
import { renderApp } from "@/test/renderApp";
import FinancialReportsPage from "@/modules/admin/financial-reports/pages/FinancialReportsPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

vi.mock("@/modules/admin/financial-reports/hooks/report.queries", () => ({
  useReportScreen: () => ({
    data: {
      period: { from: "2026-08-14", to: "2026-09-12" },
      comparisonPeriod: null,
      dataQuality: "COMPLETE",
      failedSources: [],
      cards: { netSales: "15000.00", cogs: "6000.00", grossProfit: "9000.00", cashIn: "14000.00", cashOut: "2000.00", inventoryValue: "25000.00", supplierDebt: "3000.00", supplierReceivable: "500.00", delegateOutstanding: "1200.00" },
      charts: { salesTrend: [{ date: "2026-09-12", orders: 5, total: "1200.00" }], channelMix: [{ channel: "ADMIN", orders: 5, total: "1200.00" }] },
      // The exact shape `reports.service.js` builds: grouped by product AND size,
      // keyed `product`/`size`. A fixture using `productName` would let the page
      // render an empty cell for every row and still pass.
      topProducts: [
        { product: "إسبريسو", size: "دبل", quantity: 10, total: "600.00" },
        { product: "كابتشينو", size: "", quantity: 4, total: "220.00" },
      ],
      alerts: [{ type: "FAILED_DELIVERIES", message: "توصيلات متعثرة", count: 2 }],
      generatedAt: "2026-09-12",
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useSalesReport: () => ({ data: { summary: null, items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 }, breakdowns: { channelMix: [], topProducts: [] }, dataQuality: "COMPLETE" }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }),
  useInventoryReport: () => ({ data: { summary: null, items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 }, breakdowns: { valueByMaterial: [], expiring: [] }, dataQuality: "COMPLETE" }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }),
  useDrawerReport: () => ({ data: { summary: null, items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 }, breakdowns: { byAccountingClass: [] }, dataQuality: "COMPLETE" }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }),
  useSupplierReport: () => ({ data: { summary: null, items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 }, breakdowns: { topDebtors: [], recentEntries: [] }, dataQuality: "COMPLETE" }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }),
  useDelegateReport: () => ({ data: { summary: null, items: [], pageMeta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 }, breakdowns: { perDelegate: [] }, dataQuality: "COMPLETE" }, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() }),
  useExportStatus: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
}));

const adminAuth = {
  permissions: [
    { pageKey: "reports", visible: true, actions: ["read", "export"] },
    { pageKey: "payments", visible: true, actions: ["refund"] },
    { pageKey: "audit", visible: true, actions: ["read", "export"] },
    { pageKey: "reviews", visible: true, actions: ["read", "moderate"] },
    { pageKey: "notifications", visible: true, actions: ["read"] },
  ],
};

describe("phase-14 v1 contract", () => {
  it("targets the real backend routes, not legacy paths", () => {
    expect(REPORT_ENDPOINTS.screen).toBe("/financial-reports-screen");
    expect(REPORT_ENDPOINTS.sales).toBe("/financial-reports/sales");
    expect(REPORT_ENDPOINTS.inventory).toBe("/financial-reports/inventory");
    expect(REPORT_ENDPOINTS.drawer).toBe("/financial-reports/drawer");
    expect(REPORT_ENDPOINTS.suppliers).toBe("/financial-reports/suppliers");
    expect(REPORT_ENDPOINTS.delegates).toBe("/financial-reports/delegates");
    expect(REPORT_ENDPOINTS.requestExport).toBe("/financial-reports/exports");
    expect(REPORT_ENDPOINTS.exportStatus("abc")).toBe("/financial-reports/exports/abc");
    expect(AUDIT_ENDPOINTS.screen).toBe("/audit-events-screen");
    expect(AUDIT_ENDPOINTS.details("abc")).toBe("/audit-events/abc");
    expect(AUDIT_ENDPOINTS.timeline("Order", "abc")).toBe("/entities/Order/abc/timeline");
    expect(AUDIT_ENDPOINTS.requestExport).toBe("/audit-events/exports");
    expect(AUDIT_ENDPOINTS.exportStatus("abc")).toBe("/audit-events/exports/abc");
    expect(REVIEW_ENDPOINTS.list).toBe("/reviews");
    expect(REVIEW_ENDPOINTS.orderReviews("abc")).toBe("/orders/abc/reviews");
    expect(REVIEW_ENDPOINTS.moderation("abc")).toBe("/reviews/abc/moderation");
    expect(NOTIFICATION_ENDPOINTS.list).toBe("/notifications");
    expect(NOTIFICATION_ENDPOINTS.read("abc")).toBe("/notifications/abc/read");
    expect(NOTIFICATION_ENDPOINTS.readAll).toBe("/notifications/read-all");
  });

  it("cleans report screens with null-safe server summaries", () => {
    expect(REPORT_TYPES.map((type) => type.value)).toContain("audit:events");
    const screen = toReportScreen({
      period: { from: "2026-08-14", to: "2026-09-12" },
      dataQuality: "ERROR",
      failedSources: ["Drawer"],
      cards: { netSales: "15000.00", cashIn: null },
      charts: { salesTrend: [{ date: "2026-09-12", total: "100.00" }], channelMix: [] },
      topProducts: [],
      alerts: [{ type: "FAILED_DELIVERIES", count: 1 }],
    });
    expect(screen.dataQuality).toBe("ERROR");
    expect(screen.failedSources).toEqual(["Drawer"]);
    expect(screen.cards.cashIn).toBeNull();
    expect(screen.charts.salesTrend).toHaveLength(1);
    const sales = toSalesReport({ summary: { netSales: "100.00", orders: 2 }, trend: [{ date: "x" }], breakdowns: null });
    expect(sales.summary.orders).toBe(2);
    expect(sales.breakdowns.topProducts).toEqual([]);
    expect(toInventoryReport({}).items).toEqual([]);
    expect(toDrawerReport({}).breakdowns.byAccountingClass).toEqual([]);
    expect(toSupplierReport({}).breakdowns.topDebtors).toEqual([]);
    expect(toDelegateReport({}).breakdowns.perDelegate).toEqual([]);
    const job = toExportJob({ export: { id: "e1", exportNo: "EXP-1", status: "READY", statusUrl: "/financial-reports/exports/e1", rowCount: 120, checksum: "abc" } });
    expect(job.statusLabel).toBe("جاهز");
    expect(job.progress).toBe(100);
    expect(job.rowCount).toBe(120);
  });

  it("validates report ranges and export requests exactly like the backend", () => {
    expect(reportRangeSchema.safeParse({ from: "2026-09-01", to: "2026-09-12" }).success).toBe(true);
    expect(reportRangeSchema.safeParse({ from: "2026-09-12", to: "2026-09-01" }).success).toBe(false);
    expect(reportRangeSchema.safeParse({ from: "2026-13-01" }).success).toBe(false);
    expect(exportRequestSchema.safeParse({ reportType: "sales", format: "CSV" }).success).toBe(true);
    expect(exportRequestSchema.safeParse({ reportType: "orders", format: "CSV" }).success).toBe(false);
    expect(exportRequestSchema.safeParse({ reportType: "sales", format: "XLS" }).success).toBe(false);
    expect(firstReportFormError(exportRequestSchema.safeParse({ reportType: "sales" }))).toBeTruthy();
  });

  it("cleans audit, reviews, and notifications", () => {
    const audit = toAuditScreen({
      items: [{ id: "a1", eventType: "LOGIN", result: "SUCCESS", severity: "INFO" }],
      summary: { total: 1, success: 1, failed: 0, denied: 0, warning: 0, critical: 0 },
    });
    expect(audit.items[0].resultLabel).toBe("ناجح");
    expect(audit.summary.total).toBe(1);
    expect(toAuditEvent({ event: { id: "a1", result: "DENIED" } }).event.resultLabel).toBe("مرفوض");
    expect(toEntityTimeline({ items: [{ id: "a1" }] }).items).toHaveLength(1);
    expect(auditFilterSchema.safeParse({ from: "2026-09-12T00:00:00+02:00", to: "2026-09-11T00:00:00+02:00" }).success).toBe(false);
    expect(auditFilterSchema.safeParse({ result: "SUCCESS" }).success).toBe(true);
    const reviews = toReviewsList({ items: [{ id: "r1", rating: 5, status: "VISIBLE" }], summary: { total: 1, visible: 1, hidden: 0 } });
    expect(reviews.items[0].statusLabel).toBe("ظاهر");
    expect(reviews.summary.visible).toBe(1);
    expect(toOrderReview({ review: null }).review).toBeNull();
    expect(reviewModerationSchema.safeParse({ status: "HIDDEN", reason: "مسيء", expectedVersion: 0 }).success).toBe(true);
    expect(reviewModerationSchema.safeParse({ status: "HIDDEN", reason: "ab", expectedVersion: 0 }).success).toBe(false);
    const notifs = toNotificationsList({ items: [{ id: "n1", title: "تنبيه", readAt: null }], unreadCount: 1 });
    expect(notifs.items[0].unread).toBe(true);
    expect(notifs.unreadCount).toBe(1);
  });
});

describe("financial reports page on the v1 layer", () => {
  it("renders server cards, alerts, and charts without local math", () => {
    renderApp(<FinancialReportsPage />, { route: "/admin/financial-reports", auth: adminAuth });
    expect(screen.getByText("توصيلات متعثرة")).toBeInTheDocument();
    expect(screen.queryByText("تنزيل الملف")).not.toBeInTheDocument();
  });

  /**
   * The top-products table used to read `productName`/`name` while the report
   * returns `product`, so every row rendered "—". The size is part of the grouping
   * key, so it has to travel with the name.
   */
  it("shows the item name from the server payload, with its size", () => {
    renderApp(<FinancialReportsPage />, { route: "/admin/financial-reports", auth: adminAuth });
    expect(screen.getByText("إسبريسو — دبل")).toBeInTheDocument();

    // Scoped to the top-products table: other columns legitimately render "—".
    const table = screen
      .getAllByRole("table")
      .find((candidate) => within(candidate).queryByText("الصنف") !== null);
    expect(table).toBeDefined();
    const names = [...table.querySelectorAll("tbody tr td:first-child")].map((td) => td.textContent);
    expect(names).toEqual(["إسبريسو — دبل", "كابتشينو"]);
  });

  it("no longer renders the channel mix block", () => {
    renderApp(<FinancialReportsPage />, { route: "/admin/financial-reports", auth: adminAuth });
    expect(screen.queryByText("مزيج القنوات")).not.toBeInTheDocument();
    expect(screen.queryByText("لا توجد بيانات قنوات.")).not.toBeInTheDocument();
    // The sales tab still filters by channel, so the column stays there.
    expect(screen.getByText("اتجاه المبيعات")).toBeInTheDocument();
  });
});
