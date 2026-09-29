import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";
export const TABLE_SERVICE_ENDPOINTS = Object.freeze({
  screen: "/table-services-screen",
  resolve: (requestId) => `/table-service-requests/${encodeURIComponent(requestId)}/resolve`,
});
export async function getTableServiceRequests(tab = "open", page = 1) { return unwrapData(await v1Client.get(TABLE_SERVICE_ENDPOINTS.screen, { params: normalizePageParams({ tab, page }) })); }
export async function updateTableServiceRequest(requestId, expectedVersion, resolutionNote, key) { return unwrapData(await v1Client.post(TABLE_SERVICE_ENDPOINTS.resolve(requestId), { resultCode: "HANDLED", expectedVersion, ...(resolutionNote ? { resolutionNote } : {}) }, { headers: operationHeaders({ idempotencyKey: key }) })); }
