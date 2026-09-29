import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { suppliersApi } from "../api/suppliers.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;
function useSupplierMutation(name, mutation, { supplierId, onSuccess } = {}) {
  const queryClient = useQueryClient(); const scope = useRef(uniqueScope(name));
  const result = useMutation({
    mutationFn: (variables) => mutation(variables, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
        supplierId ? queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.details() }) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: queryKeys.drawer.screen }),
      ]);
      onSuccess?.(data, variables);
    },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}

export const useCreateSupplier = (options) => useSupplierMutation("supplier:create", (body, key) => suppliersApi.create(body, key), options);
export const useUpdateSupplier = (supplierId, options) => useSupplierMutation("supplier:update", (body, key) => suppliersApi.update(supplierId, body, key), { supplierId, ...options });
export const useDeleteSupplier = (supplierId, options) => useSupplierMutation("supplier:delete", (body, key) => suppliersApi.deleteSupplier(supplierId, body, key), { supplierId, ...options });
export const useCreateSupplierEntry = (supplierId, options) => useSupplierMutation("supplier:entry", (body, key) => suppliersApi.createEntry(supplierId, body, key), { supplierId, ...options });
export const useUpdateSupplierEntry = (supplierId, options) => useSupplierMutation("supplier:update-entry", ({ entryId, ...body }, key) => suppliersApi.updateEntry(entryId, body, key), { supplierId, ...options });
export const useDeleteSupplierEntry = (supplierId, options) => useSupplierMutation("supplier:delete-entry", ({ entryId, ...body }, key) => suppliersApi.deleteEntry(entryId, body, key), { supplierId, ...options });
