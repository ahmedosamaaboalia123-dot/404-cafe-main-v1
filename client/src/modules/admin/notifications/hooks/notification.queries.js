import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { notificationsApi } from "../api/notifications.api";
import { toNotificationsList } from "../adapters/notification.adapter";

export function useNotifications(params) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: async () => toNotificationsList(await notificationsApi.list(params)),
    placeholderData: (previous) => previous,
    refetchInterval: 60 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [...queryKeys.notifications.all, "unread-count"],
    queryFn: async () => toNotificationsList(await notificationsApi.list({ page: 1, limit: 1, unread: true })),
    refetchInterval: 60 * 1000,
  });
}
