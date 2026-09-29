import { io } from "socket.io-client";
import { appConfig } from "@/app/config";
import { useAuthStore } from "@/store/authStore";
import { acceptEvent } from "./sequenceStore";
import { syncRoom } from "./syncClient";

export function resolveSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL.replace(/\/+$/, "");
  const api = String(appConfig.apiBaseUrl || "/api").replace(/\/+$/, "").replace(/\/api(?:\/v1)?$/i, "");
  return api || globalThis.location?.origin || "http://localhost:5000";
}

export function createRoomConnection({ socket, rooms, onEvent, onSnapshot, onError, sync = syncRoom, syncHeaders = {} }) {
  const roomList = [...new Set((rooms || []).filter(Boolean))].slice(0, 20);
  let active = true;
  let syncing = null;
  let lastSequence = 0;
  const catchUp = async () => {
    if (!active || syncing || !roomList.length) return syncing;
    syncing = (async () => {
      let more = true; let rounds = 0;
      while (active && more && rounds < 10) {
        const result = await sync(roomList, lastSequence, syncHeaders);
        result.snapshots?.forEach((snapshot) => onSnapshot?.(snapshot));
        for (const event of result.events || []) {
          const decision = acceptEvent(roomList.join("|"), event);
          if (decision.accepted) { lastSequence = Math.max(lastSequence, Number(event.sequence) || 0); onEvent?.(event); }
        }
        more = Boolean(result.hasMore); rounds += 1;
      }
    })().finally(() => { syncing = null; });
    return syncing;
  };
  const recover = () => catchUp()?.catch((error) => onError?.(error));
  const handleConnect = () => { socket.emit("subscribe", roomList); void recover(); };
  const handleEvent = (event) => {
    const decision = acceptEvent(roomList.join("|"), event);
    if (!decision.accepted) return;
    lastSequence = Math.max(lastSequence, Number(event.sequence) || 0);
    onEvent?.(event);
    if (decision.gap) void recover();
  };
  socket.on("connect", handleConnect); socket.on("event", handleEvent);
  if (socket.connected) handleConnect();
  return { catchUp, dispose() { active = false; socket.off("connect", handleConnect); socket.off("event", handleEvent); } };
}

let adminSocket;
const scopes = new Map();
let storageListenerInstalled = false;
function installTokenListener() {
  if (storageListenerInstalled || typeof window === "undefined") return;
  storageListenerInstalled = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== appConfig.tokenKey) return;
    if (!event.newValue) disconnectAdminSocket();
    else updateAdminSocketToken(event.newValue);
  });
}
export function getAdminSocket() {
  installTokenListener();
  if (!adminSocket) adminSocket = io(resolveSocketUrl(), { auth: { token: useAuthStore.getState().token || localStorage.getItem(appConfig.tokenKey) }, transports: ["websocket", "polling"], autoConnect: true });
  return adminSocket;
}
export function updateAdminSocketToken(token) { if (adminSocket) { adminSocket.auth = { token }; adminSocket.disconnect().connect(); } }
export function disconnectAdminSocket() { adminSocket?.disconnect(); adminSocket = undefined; }

// The current backend Socket transport authenticates employee tokens. Public clients
// keep these factories for the planned transport and rely on REST sync as fallback.
export const createTrackingSocket = (token) => io(resolveSocketUrl(), { auth: { token, trackingReadToken: token }, transports: ["websocket", "polling"] });
export const createTableSocket = (tableToken) => io(resolveSocketUrl(), { auth: { token: tableToken, tableToken }, transports: ["websocket", "polling"] });

function replaceScope(scope, socket, options, disconnectSocket = false) {
  scopes.get(scope)?.dispose();
  const roomConnection = createRoomConnection({ socket, ...options });
  const connection = { socket, catchUp: roomConnection.catchUp, dispose() { roomConnection.dispose(); if (disconnectSocket) socket.disconnect(); scopes.delete(scope); } };
  scopes.set(scope, connection);
  return connection;
}

export function connectAdmin({ scope = "admin", rooms, onEvent, onSnapshot, sync } = {}) {
  return replaceScope(scope, getAdminSocket(), { rooms, onEvent, onSnapshot, sync });
}
export function connectTracking({ scope, token, rooms, onEvent, onSnapshot, sync } = {}) {
  return replaceScope(scope || `tracking:${rooms?.[0] || "order"}`, createTrackingSocket(token), { rooms, onEvent, onSnapshot, sync, syncHeaders: { "X-Tracking-Read-Token": token } }, true);
}
export function connectTable({ scope, tableToken, rooms, onEvent, onSnapshot, sync } = {}) {
  return replaceScope(scope || `table:${rooms?.[0] || "guest"}`, createTableSocket(tableToken), { rooms, onEvent, onSnapshot, sync, syncHeaders: { "X-Table-Token": tableToken } }, true);
}
export function disconnectScope(scope) { scopes.get(scope)?.dispose(); }
