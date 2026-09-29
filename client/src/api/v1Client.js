import axios from "axios";
import { appConfig } from "@/app/config";
import { useAuthStore } from "@/store/authStore";
import { normalizeApiError } from "./apiError";
import { assertEnvelope } from "./envelope";
import { cancelAllPendingRequests } from "./requestCancellation";
import { releaseFailedOperationKey } from "./idempotency";

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export function resolveV1BaseUrl(rawUrl = "/api") {
  const base = stripTrailingSlash(rawUrl) || "/api";
  if (/\/api\/v1$/i.test(base) || /\/v1$/i.test(base)) return base;
  if (/\/api$/i.test(base)) return `${base}/v1`;
  return `${base}/api/v1`;
}

export function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createV1Client({
  baseURL = resolveV1BaseUrl(appConfig.apiBaseUrl),
  timeout = 10_000,
  storage = globalThis.localStorage,
  authStore = useAuthStore,
  onAccessToken,
  onSessionCleared,
  axiosModule = axios,
} = {}) {
  const client = axiosModule.create({ baseURL, timeout, headers: { "Content-Type": "application/json" } });
  let refreshPromise = null;

  const clearSession = () => {
    storage?.removeItem(appConfig.tokenKey);
    storage?.removeItem(appConfig.refreshTokenKey);
    storage?.removeItem("auth_session");
    authStore?.getState?.().clearAuth?.();
    cancelAllPendingRequests();
    onSessionCleared?.();
  };

  const refreshAccessTokenOnce = () => {
    if (refreshPromise) return refreshPromise;
    const refreshToken = storage?.getItem(appConfig.refreshTokenKey);
    if (!refreshToken) return Promise.reject(normalizeApiError({ message: "Refresh token is missing" }));
    refreshPromise = axiosModule
      .post(`${baseURL}/auth/refresh`, { refreshToken }, { timeout })
      .then((response) => {
        const data = assertEnvelope(response.data).data;
        if (!data?.accessToken || !data?.refreshToken) throw new Error("Refresh response is incomplete");
        storage?.setItem(appConfig.tokenKey, data.accessToken);
        storage?.setItem(appConfig.refreshTokenKey, data.refreshToken);
        onAccessToken?.(data.accessToken);
        return data.accessToken;
      })
      .finally(() => { refreshPromise = null; });
    return refreshPromise;
  };

  client.interceptors.request.use((config) => {
    const token = storage?.getItem(appConfig.tokenKey);
    config.headers = config.headers || {};
    if (token && !config.skipAdminAuth) config.headers.Authorization = `Bearer ${token}`;
    if (!config.headers["X-Request-Id"]) config.headers["X-Request-Id"] = createRequestId();
    delete config.skipAdminAuth;
    return config;
  });

  client.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const request = error?.config;
      const url = String(request?.url || "");
      const authRequest = /\/auth\/(?:login|refresh)$/.test(url);
      const canRefresh = error?.response?.status === 401 && !authRequest && !request?._v1Retried && storage?.getItem(appConfig.refreshTokenKey);
      if (canRefresh) {
        request._v1Retried = true;
        try {
          const token = await refreshAccessTokenOnce();
          request.headers = { ...request.headers, Authorization: `Bearer ${token}` };
          return client(request);
        } catch (refreshError) {
          clearSession();
          return Promise.reject(normalizeApiError(refreshError));
        }
      }
      if (error?.response?.status === 401 && !authRequest) clearSession();
      const normalized = normalizeApiError(error);
      // Preserve keys for ambiguous network failures; only rotate a rejected attempt.
      if (error?.response?.status === 409 &&
          ["OPERATION_PREVIOUSLY_FAILED", "DUPLICATE_VALUE"].includes(normalized.code)) {
        const headers = request?.headers;
        const key = headers?.get?.("Idempotency-Key") ?? headers?.["Idempotency-Key"] ?? headers?.["idempotency-key"];
        releaseFailedOperationKey(key);
      }
      return Promise.reject(normalized);
    },
  );

  return { client, clearSession, refreshAccessTokenOnce };
}

const defaultV1 = createV1Client({
  onAccessToken: (token) => useAuthStore.getState().setAccessToken?.(token),
});
export const v1Client = defaultV1.client;
export const clearV1Session = defaultV1.clearSession;
export const refreshV1AccessTokenOnce = defaultV1.refreshAccessTokenOnce;
export default v1Client;
