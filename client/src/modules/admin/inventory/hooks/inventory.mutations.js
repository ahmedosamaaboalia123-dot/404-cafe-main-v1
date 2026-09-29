import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { inventoryApi } from "../api/inventory.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

function useInventoryMutation(name, mutation, { materialId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope(name));
  const result = useMutation({
    mutationFn: (variables) => mutation(variables, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.materials.all }),
        materialId ? queryClient.invalidateQueries({ queryKey: queryKeys.materials.detail(materialId) }) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ["withdrawals"] }),
        queryClient.invalidateQueries({ queryKey: ["units"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.warnings.screen({}) }),
      ]);
      onSuccess?.(data, variables);
    },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}

export const useCreateMaterial = (options) =>
  useInventoryMutation("material:create", (body, key) => inventoryApi.create(body, key), options);

export const useUpdateMaterial = (materialId, options) =>
  useInventoryMutation("material:update", (body, key) => inventoryApi.update(materialId, body, key), { materialId, ...options });

export const useDeleteMaterial = (materialId, options) =>
  useInventoryMutation("material:delete", (body, key) => inventoryApi.deleteMaterial(materialId, body, key), { materialId, ...options });

export const useWithdrawMaterial = (materialId, options) =>
  useInventoryMutation("material:withdraw", (body, key) => inventoryApi.withdraw(materialId, body, key), { materialId, ...options });

export const useReorderPriorities = (materialId, options) =>
  useInventoryMutation("material:priorities", (body, key) => inventoryApi.reorderPriorities(materialId, body, key), { materialId, ...options });

export const useUpdateBatchExpiry = (materialId, batchId, options) =>
  useInventoryMutation("material:batch-expiry", (body, key) => inventoryApi.updateBatch(materialId, batchId, body, key), { materialId, ...options });
