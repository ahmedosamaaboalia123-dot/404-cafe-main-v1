import { unwrapData } from "@/api/envelope";
import { v1Client } from "@/api/v1Client";

export const REALTIME_SYNC_ENDPOINT = "/realtime/sync";

export async function syncRoom(rooms, afterSequence = 0, headers = {}) {
  const roomList = [...new Set((Array.isArray(rooms) ? rooms : [rooms]).filter(Boolean))].slice(0, 20);
  if (!roomList.length) return { snapshots: [], events: [], hasMore: false };
  return unwrapData(await v1Client.get(REALTIME_SYNC_ENDPOINT, {
    params: { rooms: roomList.join(","), afterSequence: Math.max(0, Number(afterSequence) || 0) }, headers,
    skipAdminAuth: Boolean(headers["X-Tracking-Read-Token"] || headers["X-Order-Action-Token"] || headers["X-Table-Token"] || headers["X-Customer-Session"]),
  }));
}

export function publicSyncHeaders({ trackingReadToken, orderActionToken, tableToken, customerSession } = {}) {
  return {
    ...(trackingReadToken ? { "X-Tracking-Read-Token": trackingReadToken } : {}),
    ...(orderActionToken ? { "X-Order-Action-Token": orderActionToken } : {}),
    ...(tableToken ? { "X-Table-Token": tableToken } : {}),
    ...(customerSession ? { "X-Customer-Session": customerSession } : {}),
  };
}
