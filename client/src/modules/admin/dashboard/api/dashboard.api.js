import { unwrapData } from "@/api/envelope";
import { v1Client } from "@/api/v1Client";

export const DASHBOARD_ENDPOINTS = Object.freeze({ screen: "/dashboard-screen" });
export const dashboardApi = {
  async screen(params = {}) {
    return unwrapData(await v1Client.get(DASHBOARD_ENDPOINTS.screen, { params }));
  },
};
