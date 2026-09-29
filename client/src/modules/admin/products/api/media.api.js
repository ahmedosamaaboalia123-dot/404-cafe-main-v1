import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { resolveV1BaseUrl, v1Client } from "@/api/v1Client";
import { appConfig } from "@/app/config";

export const MEDIA_ENDPOINTS = Object.freeze({
  uploads: "/media/uploads",
  list: "/media",
  details: (id) => `/media/${encodeURIComponent(id)}`,
  content: (id) => `/media/${encodeURIComponent(id)}/content`,
});

const apiBase = () => resolveV1BaseUrl(appConfig.apiBaseUrl);

export function toMediaContentSrc(signed) {
  if (!signed?.url) return null;
  if (/^https?:\/\//i.test(signed.url)) return signed.url;
  return `${apiBase()}${signed.url.startsWith("/") ? signed.url : `/${signed.url}`}`;
}

export const mediaApi = {
  async upload(file, idempotencyKey) {
    const form = new FormData();
    form.append("image", file);
    return unwrapData(await v1Client.post(MEDIA_ENDPOINTS.uploads, form, {
      headers: { ...operationHeaders({ idempotencyKey }), "Content-Type": "multipart/form-data" },
      timeout: 30_000,
    }));
  },
  async list(params = {}) { return unwrapData(await v1Client.get(MEDIA_ENDPOINTS.list, { params: normalizePageParams(params) })); },
  async details(id) { return unwrapData(await v1Client.get(MEDIA_ENDPOINTS.details(id))); },
  async remove(id, body, idempotencyKey) { return unwrapData(await v1Client.delete(MEDIA_ENDPOINTS.details(id), { data: body, headers: operationHeaders({ idempotencyKey }) })); },
};
