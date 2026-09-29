import { create } from "zustand";

const hasStoredToken = () => typeof localStorage !== "undefined" && Boolean(localStorage.getItem("access_token"));
const emptySession = {
  token: null, employee: null, role: null, permissions: [],
  notifications: { unreadCount: 0, items: [] }, currentAttendance: null,
  shift: null, featureFlags: {}, realtime: { token: null, lastSequence: 0 }, pendingDevice: null,
};

export const useAuthStore = create((set) => ({
  ...emptySession,
  isAuthChecking: hasStoredToken(),
  setAuth: (data) => set({
    token: data.token ?? null, employee: data.employee ?? null, role: data.role ?? null,
    permissions: data.permissions ?? [], notifications: data.notifications ?? emptySession.notifications,
    currentAttendance: data.currentAttendance ?? null,
    shift: data.currentShift ?? data.shift ?? null, featureFlags: data.featureFlags ?? {},
    realtime: data.realtime ?? emptySession.realtime, pendingDevice: null,
  }),
  setAccessToken: (token) => set({ token }),
  setPendingDevice: (pendingDevice) => set({ pendingDevice }),
  setAuthChecking: (isAuthChecking) => set({ isAuthChecking }),
  clearAuth: () => set({ ...emptySession, isAuthChecking: false }),
}));
