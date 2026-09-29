import { readPageMeta } from "@/api/pagination";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));

const cleanNotification = (item = {}) => ({
  ...item,
  id: str(item.id),
  type: item.type || "",
  severity: item.severity || "",
  title: item.title || "",
  message: item.message ?? null,
  entityType: item.entityType ?? null,
  entityId: item.entityId ?? null,
  link: item.link ?? null,
  createdAt: item.createdAt ?? null,
  readAt: item.readAt ?? null,
  unread: item.readAt === null || item.readAt === undefined,
});

export function toNotificationsList(data = {}) {
  const items = (data.items || []).map(cleanNotification);
  return {
    items,
    unreadCount: Number(data.unreadCount ?? items.filter((item) => item.unread).length),
    pageMeta: readPageMeta(data.pageMeta, items.length),
  };
}
