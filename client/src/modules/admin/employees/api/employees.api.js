import { unwrapData } from "@/api/envelope";
import { operationHeaders } from "@/api/idempotency";
import { normalizePageParams } from "@/api/pagination";
import { v1Client } from "@/api/v1Client";

export const EMPLOYEE_ENDPOINTS = Object.freeze({
  screen: "/employees-screen",
  create: "/employees",
  details: (id) => `/employees/${encodeURIComponent(id)}`,
  devices: "/employee-devices",
  approveDevice: (id) => `/employee-devices/${encodeURIComponent(id)}/approve`,
  blockDevice: (id) => `/employee-devices/${encodeURIComponent(id)}/block`,
  revokeDevice: (id) => `/employee-devices/${encodeURIComponent(id)}/revoke`,
  permissionMatrix: (id) => `/employees/${encodeURIComponent(id)}/permission-matrix`,
  roles: "/roles",
  roleDetails: (id) => `/roles/${encodeURIComponent(id)}`,
  rolePermissions: (id) => `/roles/${encodeURIComponent(id)}/permissions`,
  permissions: "/permissions",
});

export const ATTENDANCE_ENDPOINTS = Object.freeze({
  checkIn: "/attendance/check-in",
  list: "/attendance",
  details: (id) => `/attendance/${encodeURIComponent(id)}`,
  checkOut: (id) => `/attendance/${encodeURIComponent(id)}/check-out`,
  adjustments: (id) => `/attendance/${encodeURIComponent(id)}/adjustments`,
  forceClose: (id) => `/attendance/${encodeURIComponent(id)}/force-close`,
});

export const employeesApi = {
  async screen(params = {}) { return unwrapData(await v1Client.get(EMPLOYEE_ENDPOINTS.screen, { params: normalizePageParams(params) })); },
  async create(body, idempotencyKey) { return unwrapData(await v1Client.post(EMPLOYEE_ENDPOINTS.create, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async details(id, include = [], query = {}) {
    const params = {};
    if (include.length) params.include = include.join(",");
    if (query.activityPage) params.activityPage = query.activityPage;
    if (query.activityLimit) params.activityLimit = query.activityLimit;
    if (query.attendancePage) params.attendancePage = query.attendancePage;
    if (query.attendanceLimit) params.attendanceLimit = query.attendanceLimit;
    return unwrapData(await v1Client.get(EMPLOYEE_ENDPOINTS.details(id), { params }));
  },
  async update(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(EMPLOYEE_ENDPOINTS.details(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async remove(id, body, idempotencyKey) { return unwrapData(await v1Client.delete(EMPLOYEE_ENDPOINTS.details(id), { data: body, headers: operationHeaders({ idempotencyKey }) })); },
  async devices(params = {}) { return unwrapData(await v1Client.get(EMPLOYEE_ENDPOINTS.devices, { params: normalizePageParams(params) })); },
  async approveDevice(id, body, idempotencyKey) { return unwrapData(await v1Client.post(EMPLOYEE_ENDPOINTS.approveDevice(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async blockDevice(id, body, idempotencyKey) { return unwrapData(await v1Client.post(EMPLOYEE_ENDPOINTS.blockDevice(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async revokeDevice(id, body, idempotencyKey) { return unwrapData(await v1Client.post(EMPLOYEE_ENDPOINTS.revokeDevice(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async replacePermissionMatrix(id, body, idempotencyKey) { return unwrapData(await v1Client.put(EMPLOYEE_ENDPOINTS.permissionMatrix(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async roles() { return unwrapData(await v1Client.get(EMPLOYEE_ENDPOINTS.roles)); },
  async createRole(body, idempotencyKey) { return unwrapData(await v1Client.post(EMPLOYEE_ENDPOINTS.roles, body, { headers: operationHeaders({ idempotencyKey }) })); },
  async updateRole(id, body, idempotencyKey) { return unwrapData(await v1Client.patch(EMPLOYEE_ENDPOINTS.roleDetails(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async replaceRolePermissions(id, body, idempotencyKey) { return unwrapData(await v1Client.put(EMPLOYEE_ENDPOINTS.rolePermissions(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async permissions() { return unwrapData(await v1Client.get(EMPLOYEE_ENDPOINTS.permissions)); },
};

export const attendanceApi = {
  async checkIn(idempotencyKey) { return unwrapData(await v1Client.post(ATTENDANCE_ENDPOINTS.checkIn, {}, { headers: operationHeaders({ idempotencyKey }) })); },
  async list(params = {}) { return unwrapData(await v1Client.get(ATTENDANCE_ENDPOINTS.list, { params: normalizePageParams(params) })); },
  async details(id) { return unwrapData(await v1Client.get(ATTENDANCE_ENDPOINTS.details(id))); },
  async checkOut(id, body, idempotencyKey) { return unwrapData(await v1Client.post(ATTENDANCE_ENDPOINTS.checkOut(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async adjust(id, body, idempotencyKey) { return unwrapData(await v1Client.post(ATTENDANCE_ENDPOINTS.adjustments(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
  async forceClose(id, body, idempotencyKey) { return unwrapData(await v1Client.post(ATTENDANCE_ENDPOINTS.forceClose(id), body, { headers: operationHeaders({ idempotencyKey }) })); },
};
