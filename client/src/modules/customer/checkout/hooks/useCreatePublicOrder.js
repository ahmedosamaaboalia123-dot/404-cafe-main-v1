import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { customerOrdersApi } from "@/modules/customer/api/customerOrders.api";
import { customerStorage } from "@/modules/customer/services/customerStorage";
import { saveBackendOrder } from "@/modules/customer/orders/services/customerOrdersService";
import { setLastOrder } from "../services/checkoutCustomerService";
import { normalizeCustomerAddress, resolveOrderItems } from "../services/orderGateway";

export function useCreatePublicOrder(options = {}) {
  const scope = useRef(`customer:checkout:${globalThis.crypto?.randomUUID?.() || Date.now()}`);
  return useMutation({
    mutationFn: async ({ fulfillmentType, customer, items }) => { const address = fulfillmentType === "DELIVERY" ? normalizeCustomerAddress(customer) : ""; const resolvedItems = await resolveOrderItems(items); const body = { fulfillmentType, customer: { name: customer.name.trim(), phone: customer.phone.trim(), ...(address ? { address } : {}) }, items: resolvedItems }; const result = await customerOrdersApi.checkout(body, beginOperation(scope.current)); finishOperation(scope.current); customerStorage.saveProfile({ ...customer, address }); customerStorage.saveOrderAccess(result.order.publicOrderNumber, { ...result.tracking, barcodeValue: result.tracking.barcodeValue }); const confirmed = { ...result.order, orderNumber: result.order.publicOrderNumber, barcodeValue: result.tracking.barcodeValue, trackingToken: result.tracking.trackingReadToken, actionToken: result.tracking.orderActionToken, customer: result.customer }; try { saveBackendOrder({ orderNumber: confirmed.orderNumber, trackingToken: confirmed.trackingToken, phone: customer.phone.trim(), name: customer.name.trim(), fulfillmentType, total: Number(result.order?.totals?.total ?? 0) || 0, status: result.order?.status || "CONFIRMED", statusText: "جاري التحضير", items }); } catch {} try { setLastOrder({ orderNumber: confirmed.orderNumber, trackingToken: confirmed.trackingToken, phone: customer.phone.trim(), fulfillmentType, total: Number(result.order?.totals?.total ?? 0) || 0, createdAt: new Date().toISOString(), status: result.order?.status || "CONFIRMED", version: Number(result.order?.version ?? 0) || 0, id: String(result.order?.id || "") }); } catch {} return confirmed; },
    ...options,
  });
}
