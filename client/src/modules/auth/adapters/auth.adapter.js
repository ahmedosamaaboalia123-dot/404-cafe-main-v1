export function normalizePermissions(permissions) {
  return (Array.isArray(permissions) ? permissions : []).map((entry) => ({
    pageKey: String(entry?.pageKey ?? entry?.page_key ?? ""), visible: entry?.visible !== false,
    actions: Array.isArray(entry?.actions) ? [...new Set(entry.actions.map(String))] : [],
  })).filter((entry) => entry.pageKey);
}
export function normalizeNotifications(value) {
  if (Array.isArray(value)) return { unreadCount: value.filter((item) => !item.isRead && !item.is_read).length, items: value };
  const items = Array.isArray(value?.items) ? value.items : [];
  return { unreadCount: Number(value?.unreadCount ?? items.filter((item) => !item.isRead && !item.is_read).length), items };
}
export function toAuthSession(data, token = null) {
  return { token, employee: data?.employee ?? null, role: data?.role ?? null,
    permissions: normalizePermissions(data?.permissions), notifications: normalizeNotifications(data?.notifications),
    currentAttendance: data?.currentAttendance ?? null, currentShift: data?.currentShift ?? data?.shift ?? null,
    featureFlags: data?.featureFlags ?? {}, realtime: data?.realtime ?? { token: null, lastSequence: 0 } };
}
export const isPendingDeviceResponse = (data) => data?.status === "DEVICE_APPROVAL_REQUIRED";
export const toPendingDevice = (data) => ({ requestId: data?.deviceRequestId ?? null, pollAfterSeconds: Number(data?.pollAfterSeconds ?? 5) });
