import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const ORDER_ENDPOINTS = Object.freeze({
  onlineScreen: "/orders-online-screen", history: "/order-history-screen",
  orders: "/orders", order: (id) => `/orders/${encodeURIComponent(id)}`,
  print: (id) => `/orders/${encodeURIComponent(id)}/print-data`,
  items: (id) => `/orders/${encodeURIComponent(id)}/items`,
  cancelItem: (id, itemId) => `/orders/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}/cancel`,
  cancel: (id) => `/orders/${encodeURIComponent(id)}/cancel`,
  completeTakeaway: (id) => `/orders/${encodeURIComponent(id)}/complete-takeaway`,
  preparationDashboard: "/preparation-screen", preparation: "/preparation/orders",
  preparationOrder: (id) => `/preparation/orders/${encodeURIComponent(id)}`,
  readyItem: (id) => `/preparation/order-items/${encodeURIComponent(id)}/ready`,
  tablesBoard: "/tables-board", table: (id) => `/tables/${encodeURIComponent(id)}`,
  tableOrder: (id) => `/tables/${encodeURIComponent(id)}/admin-orders`,
  session: (id) => `/table-sessions/${encodeURIComponent(id)}`,
  sessionItems: (id) => `/table-sessions/${encodeURIComponent(id)}/items`,
  sessionCancel: (id) => `/table-sessions/${encodeURIComponent(id)}/cancel`,
  sessionClose: (id) => `/table-sessions/${encodeURIComponent(id)}/close`,
  sessionPrint: (id) => `/table-sessions/${encodeURIComponent(id)}/print-data`,
  payments: (id) => `/orders/${encodeURIComponent(id)}/payments`, paymentSettle: (id) => `/order-payments/${encodeURIComponent(id)}/settle`,
  invoices: "/invoices", invoice: (id) => `/invoices/${encodeURIComponent(id)}`,
  invoicePrint: (id) => `/invoices/${encodeURIComponent(id)}/print-data`, invoicePrintEvent: (id) => `/invoices/${encodeURIComponent(id)}/print-events`,
  invoicePreview: (id) => `/orders/${encodeURIComponent(id)}/invoice-preview`, invoiceFinalize: (id) => `/orders/${encodeURIComponent(id)}/invoice-finalize`,
  cancellations: "/order-cancellation-requests", cancellation: (id) => `/order-cancellation-requests/${encodeURIComponent(id)}`,
  approveCancellation: (id) => `/order-cancellation-requests/${encodeURIComponent(id)}/approve`, rejectCancellation: (id) => `/order-cancellation-requests/${encodeURIComponent(id)}/reject`,
});

const get = async (url, params) => unwrapData(await v1Client.get(url, params ? { params } : undefined));
const post = async (url, body, key) => unwrapData(await v1Client.post(url, body, { headers: operationHeaders({ idempotencyKey: key }) }));
export const ordersApi = {
  onlineScreen: (p) => get(ORDER_ENDPOINTS.onlineScreen, normalizePageParams(p)), history: (p) => get(ORDER_ENDPOINTS.history, normalizePageParams(p)),
  details: (id, include = "items,timeline,payment,delivery,invoice") => get(ORDER_ENDPOINTS.order(id), { include }), print: (id) => get(ORDER_ENDPOINTS.print(id)),
  create: (b, k) => post(ORDER_ENDPOINTS.orders, b, k), addItems: (id, b, k) => post(ORDER_ENDPOINTS.items(id), b, k), cancelItem: (id, itemId, b, k) => post(ORDER_ENDPOINTS.cancelItem(id, itemId), b, k), cancel: (id, b, k) => post(ORDER_ENDPOINTS.cancel(id), b, k), completeTakeaway: (id, b, k) => post(ORDER_ENDPOINTS.completeTakeaway(id), b, k),
  preparationDashboard: () => get(ORDER_ENDPOINTS.preparationDashboard), preparation: (p) => get(ORDER_ENDPOINTS.preparation, normalizePageParams(p)), preparationOrder: (id) => get(ORDER_ENDPOINTS.preparationOrder(id)), readyItem: (id, b, k) => post(ORDER_ENDPOINTS.readyItem(id), b, k),
  tablesBoard: () => get(ORDER_ENDPOINTS.tablesBoard), table: (id) => get(ORDER_ENDPOINTS.table(id)), updateTable: async (id, b, k) => unwrapData(await v1Client.patch(ORDER_ENDPOINTS.table(id), b, { headers: operationHeaders({ idempotencyKey: k }) })), tableOrder: (id, b, k) => post(ORDER_ENDPOINTS.tableOrder(id), b, k), session: (id) => get(ORDER_ENDPOINTS.session(id)), sessionItems: (id, b, k) => post(ORDER_ENDPOINTS.sessionItems(id), b, k), sessionCancel: (id, b, k) => post(ORDER_ENDPOINTS.sessionCancel(id), b, k), sessionClose: (id, b, k) => post(ORDER_ENDPOINTS.sessionClose(id), b, k), sessionPrint: (id) => get(ORDER_ENDPOINTS.sessionPrint(id)),
  payments: (id, p) => get(ORDER_ENDPOINTS.payments(id), normalizePageParams(p)), collectPayment: (id, b, k) => post(ORDER_ENDPOINTS.payments(id), b, k), settlePayment: (id, b, k) => post(ORDER_ENDPOINTS.paymentSettle(id), b, k),
  invoices: (p) => get(ORDER_ENDPOINTS.invoices, normalizePageParams(p)), invoice: (id) => get(ORDER_ENDPOINTS.invoice(id)), invoicePrint: (id) => get(ORDER_ENDPOINTS.invoicePrint(id)), recordInvoicePrint: (id, k) => post(ORDER_ENDPOINTS.invoicePrintEvent(id), {}, k), invoicePreview: (id) => get(ORDER_ENDPOINTS.invoicePreview(id)), finalizeInvoice: (id, k) => post(ORDER_ENDPOINTS.invoiceFinalize(id), {}, k),
  cancellations: (p) => get(ORDER_ENDPOINTS.cancellations, normalizePageParams(p)), cancellation: (id) => get(ORDER_ENDPOINTS.cancellation(id)), approveCancellation: (id, b, k) => post(ORDER_ENDPOINTS.approveCancellation(id), b, k), rejectCancellation: (id, b, k) => post(ORDER_ENDPOINTS.rejectCancellation(id), b, k),
};
