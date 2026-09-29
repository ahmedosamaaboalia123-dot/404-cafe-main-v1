import { unwrapData } from "@/api/envelope";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const WARNING_ENDPOINTS = Object.freeze({
  screen: "/warnings-screen",
  summary: "/warnings/summary",
});

export const warningsApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(WARNING_ENDPOINTS.screen, { params: normalizePageParams(params) })); },
  async summary() { return unwrapData(await v1Client.get(WARNING_ENDPOINTS.summary)); },
};
