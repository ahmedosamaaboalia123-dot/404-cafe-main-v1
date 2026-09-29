// Transitional facade. Module screens move to room subscriptions during their
// integration phase while existing imports continue sharing one Socket instance.
export {
  getAdminSocket,
  updateAdminSocketToken,
  disconnectAdminSocket,
  createTrackingSocket,
  createTableSocket,
  createRoomConnection,
  connectAdmin,
  connectTracking,
  connectTable,
  disconnectScope,
} from "@/realtime/socketManager";

export { syncRoom as syncAfterReconnect, publicSyncHeaders } from "@/realtime/syncClient";
