import { unwrapData } from "@/api/envelope";
import { v1Client } from "@/api/v1Client";

export const AUTH_ENDPOINTS = Object.freeze({ login: "/auth/login", logout: "/auth/logout", bootstrap: "/admin/bootstrap" });
export const authApi = {
  async login(payload) { return unwrapData(await v1Client.post(AUTH_ENDPOINTS.login, payload, { skipAdminAuth: true })); },
  async bootstrap() { return unwrapData(await v1Client.get(AUTH_ENDPOINTS.bootstrap)); },
  async logout(refreshToken, allSessions = false) {
    return unwrapData(await v1Client.post(AUTH_ENDPOINTS.logout, { refreshToken, allSessions }));
  },
};
