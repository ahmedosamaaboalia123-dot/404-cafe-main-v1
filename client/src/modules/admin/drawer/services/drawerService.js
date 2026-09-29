import apiClient from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
const unwrap = (response) => Object.prototype.hasOwnProperty.call(response || {}, "data") ? response.data : response;
const makeKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const mutationConfig = () => ({ headers: { "Idempotency-Key": makeKey() } });
export const drawerService = {
  current: async () => unwrap(await apiClient.get(endpoints.cashDrawer.current)),
  history: async (params = { page: 1, pageSize: 50 }) => unwrap(await apiClient.get(endpoints.cashDrawer.list, { params })),
  details: async (id) => unwrap(await apiClient.get(endpoints.cashDrawer.byId(id))),
  open: async (openingBalance) => unwrap(await apiClient.post(endpoints.cashDrawer.open, { openingBalance }, mutationConfig())),
  cashIn: async (id, data) => unwrap(await apiClient.post(endpoints.cashDrawer.cashIn(id), { type: "COLLECTION", ...data }, mutationConfig())),
  cashOut: async (id, data) => unwrap(await apiClient.post(endpoints.cashDrawer.cashOut(id), { type: "EXPENSE", ...data }, mutationConfig())),
  close: async (id, data) => unwrap(await apiClient.post(endpoints.cashDrawer.close(id), data, mutationConfig())),
};
