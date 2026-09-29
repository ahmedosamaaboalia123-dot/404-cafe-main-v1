import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { readPageMeta } from "@/api/pagination";
import { mediaApi } from "../api/media.api";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));

export const MEDIA_STATUSES = Object.freeze({ READY: "جاهزة", QUARANTINED: "قيد الفحص", DELETED: "محذوفة" });

export function toMediaAsset(asset = {}) {
  return {
    ...asset,
    id: str(asset.id),
    assetNo: asset.assetNo || "",
    purpose: asset.purpose || "",
    mimeType: asset.mimeType || "",
    sizeBytes: Number(asset.sizeBytes ?? 0),
    checksum: asset.checksum || "",
    status: asset.status || "",
    statusLabel: MEDIA_STATUSES[asset.status] || asset.status || "—",
    uploadedAt: asset.uploadedAt ?? null,
    version: Number(asset.version ?? 0),
  };
}

export function toMediaList(data = {}) {
  const items = (data.items || []).map(toMediaAsset);
  return { items, pageMeta: readPageMeta(data.pageMeta, items.length) };
}

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

export function useMediaList(params) {
  return useQuery({
    queryKey: [...queryKeys.products.all, "media", params ?? null],
    queryFn: async () => toMediaList(await mediaApi.list(params)),
    placeholderData: (previous) => previous,
  });
}

export function useMediaDetails(id) {
  return useQuery({
    queryKey: [...queryKeys.products.all, "media", String(id)],
    queryFn: async () => mediaApi.details(id),
    enabled: Boolean(id),
  });
}

export function useUploadMedia(options = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope("media:upload"));
  const result = useMutation({
    mutationFn: (file) => mediaApi.upload(file, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.products.all, "media"] });
      options.onSuccess?.(data, variables);
    },
    onError: (error) => { finishOperation(scope.current); options.onError?.(error); },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}

export function useDeleteMedia(options = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope("media:delete"));
  const result = useMutation({
    mutationFn: ({ mediaId, expectedVersion }) => mediaApi.remove(mediaId, { expectedVersion }, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.products.all, "media"] });
      options.onSuccess?.(data, variables);
    },
    onError: (error) => { finishOperation(scope.current); options.onError?.(error); },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}
