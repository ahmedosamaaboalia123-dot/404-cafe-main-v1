import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { purchasesApi } from "../api/purchases.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

function usePurchaseMutation(name, mutation, { groupId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope(name));
  const result = useMutation({
    mutationFn: (variables) => mutation(variables, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all }),
        groupId ? queryClient.invalidateQueries({ queryKey: queryKeys.purchases.detail(groupId) }) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: queryKeys.materials.all }),
        queryClient.invalidateQueries({ queryKey: ["withdrawals"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.warnings.screen({}) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all }),
      ]);
      onSuccess?.(data, variables);
    },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}

export const useCreatePurchaseGroup = (options) =>
  usePurchaseMutation("purchase:create", (body, key) => purchasesApi.create(body, key), options);

export const useUpdatePurchaseGroup = (groupId, options) =>
  usePurchaseMutation("purchase:update", (body, key) => purchasesApi.update(groupId, body, key), { groupId, ...options });

export const useDeletePurchaseGroup = (groupId, options) =>
  usePurchaseMutation("purchase:delete", (body, key) => purchasesApi.remove(groupId, body, key), { groupId, ...options });

export const useSplitPurchaseGroup = (groupId, options) =>
  usePurchaseMutation("purchase:split", (body, key) => purchasesApi.splitBySupplier(groupId, body, key), { groupId, ...options });

export const useRegisterPurchaseItem = (groupId, options) =>
  usePurchaseMutation("purchase:register-item", (body, key) => {
    const { purchaseItemId, ...payload } = body;
    return purchasesApi.registerItem(purchaseItemId, payload, key);
  }, { groupId, ...options });

export const useRegisterManyPurchaseItems = (groupId, options) =>
  usePurchaseMutation("purchase:register-many", (body, key) => purchasesApi.registerMany(groupId, body, key), { groupId, ...options });
