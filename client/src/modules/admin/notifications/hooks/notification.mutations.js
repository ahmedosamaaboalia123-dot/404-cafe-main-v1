import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { notificationsApi } from "../api/notifications.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

function useNotificationMutation(name, mutation, { onSuccess } = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope(name));
  const result = useMutation({
    mutationFn: (variables) => mutation(variables, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      onSuccess?.(data, variables);
    },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}

export const useMarkNotificationRead = (options) =>
  useNotificationMutation("notification:read", (id, key) => notificationsApi.markRead(id, key), options);

export const useMarkAllNotificationsRead = (options) =>
  useNotificationMutation("notification:read-all", (body, key) => notificationsApi.markAllRead(body ?? {}, key), options);
