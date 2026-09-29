import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { auditApi } from "../api/audit.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

export function useRequestAuditExport(options = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope("audit:export"));
  const result = useMutation({
    mutationFn: (body) => auditApi.requestExport(body, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
      options.onSuccess?.(data, variables);
    },
    onError: (error) => { finishOperation(scope.current); options.onError?.(error); },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}
