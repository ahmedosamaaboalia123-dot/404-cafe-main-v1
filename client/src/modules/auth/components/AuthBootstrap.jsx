import { useEffect } from "react";
import { appConfig } from "@/app/config";
import { useAuthStore } from "@/store/authStore";
import { isSessionExpired } from "@/api/apiError";
import { refreshV1AccessTokenOnce } from "@/api/v1Client";
import { authService } from "../services/authService";
import { toAuthSession } from "../adapters/auth.adapter";

const wipeStoredSession = () => {
  localStorage.removeItem(appConfig.tokenKey);
  localStorage.removeItem(appConfig.refreshTokenKey);
};

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function bootstrapWithRetry(attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await authService.bootstrap();
    } catch (error) {
      lastError = error;
      if (isSessionExpired(error)) throw error;
      if (attempt < attempts - 1) await sleep(800);
    }
  }
  throw lastError;
}

export default function AuthBootstrap({ children }) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setAuthChecking = useAuthStore((state) => state.setAuthChecking);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem(appConfig.tokenKey);
    if (!token) {
      setAuthChecking(false);
      return undefined;
    }
    bootstrapWithRetry()
      .then((data) => {
        if (!cancelled) setAuth(toAuthSession(data, token));
      })
      .catch(async (error) => {
        // Transient failures (network/5xx/timeout) keep stored tokens for the next attempt.
        if (!isSessionExpired(error)) return;
        // Definitive 401: one explicit refresh + retry before giving up on the session.
        try {
          const fresh = await refreshV1AccessTokenOnce();
          const data = await authService.bootstrap();
          if (!cancelled) setAuth(toAuthSession(data, fresh));
          return;
        } catch {
          if (cancelled) return;
          wipeStoredSession();
          clearAuth();
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clearAuth, setAuth, setAuthChecking]);

  return children;
}
