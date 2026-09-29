import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { productsApi } from "../api/products.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

function useProductMutation(name, mutation, { productId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope(name));
  const result = useMutation({
    mutationFn: (variables) => mutation(variables, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
        productId ? queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) }) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: queryKeys.catalog }),
      ]);
      onSuccess?.(data, variables);
    },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}

export const useCreateCategory = (options) =>
  useProductMutation("category:create", (body, key) => productsApi.createCategory(body, key), options);

export const useUpdateCategory = (categoryId, options) =>
  useProductMutation("category:update", (body, key) => productsApi.updateCategory(categoryId, body, key), options);

export const useCreateProduct = (options) =>
  useProductMutation("product:create", (body, key) => productsApi.create(body, key), options);

export const useUpdateProduct = (productId, options) =>
  useProductMutation("product:update", (body, key) => productsApi.update(productId, body, key), { productId, ...options });

export const useCreateProductType = (productId, options) =>
  useProductMutation("product:create-type", (body, key) => productsApi.createType(productId, body, key), { productId, ...options });

export const useUpdateProductType = (productId, options) =>
  useProductMutation("product:update-type", (body, key) => {
    const { typeId, ...payload } = body;
    return productsApi.updateType(productId, typeId, payload, key);
  }, { productId, ...options });

export const useDeleteProductType = (productId, options) =>
  useProductMutation("product:delete-type", (body, key) => {
    const { typeId } = body;
    return productsApi.deleteType(productId, typeId, key);
  }, { productId, ...options });

export const useCreateProductSize = (productId, options) =>
  useProductMutation("product:create-size", (body, key) => productsApi.createSize(productId, body, key), { productId, ...options });

export const useUpdateProductSize = (productId, options) =>
  useProductMutation("product:update-size", (body, key) => {
    const { sizeId, ...payload } = body;
    return productsApi.updateSize(sizeId, payload, key);
  }, { productId, ...options });

export const useDeleteProductSize = (productId, options) =>
  useProductMutation("product:delete-size", (body, key) => {
    const { sizeId } = body;
    return productsApi.deleteSize(sizeId, key);
  }, { productId, ...options });

export const useDeleteProduct = (productId, options) =>
  useProductMutation("product:delete", (body, key) => productsApi.deleteProduct(productId, key), { productId, ...options });

export const useCreateProductAddon = (productId, options) =>
  useProductMutation("product:create-addon", (body, key) => productsApi.createAddon(productId, body, key), { productId, ...options });

export const useUpdateProductAddon = (productId, options) =>
  useProductMutation("product:update-addon", (body, key) => {
    const { addonId, ...payload } = body;
    return productsApi.updateAddon(addonId, payload, key);
  }, { productId, ...options });

export const useReplaceRecipe = (productId, options) =>
  useProductMutation("product:replace-recipe", (body, key) => {
    const { productSizeId, ...payload } = body;
    return productsApi.replaceRecipe(productSizeId, payload, key);
  }, { productId, ...options });
