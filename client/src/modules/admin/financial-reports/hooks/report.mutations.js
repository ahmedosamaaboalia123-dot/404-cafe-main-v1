import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { reportsApi } from "../api/reports.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

export function useRequestExport(options = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope("reports:export"));
  const result = useMutation({
    mutationFn: (body) => reportsApi.requestExport(body, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await queryClient.invalidateQueries({ queryKey: queryKeys.reports.exports.all });
      options.onSuccess?.(data, variables);
    },
    onError: (error) => { finishOperation(scope.current); options.onError?.(error); },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}
