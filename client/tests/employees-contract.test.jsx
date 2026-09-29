import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ATTENDANCE_ENDPOINTS, EMPLOYEE_ENDPOINTS } from "@/modules/admin/employees/api/employees.api";
import {
  toAttendanceDetails,
  toAttendanceList,
  toDevicesList,
  toEmployeeDetails,
  toEmployeesScreen,
  toPermissionsCatalog,
  toRoleOptions,
  toRolesList,
} from "@/modules/admin/employees/adapters/employee.adapter";
import {
  adjustAttendanceSchema,
  checkOutSchema,
  createEmployeeSchema,
  createRoleSchema,
  deviceDecisionSchema,
  firstEmployeeFormError,
  forceCloseSchema,
  permissionMatrixSchema,
  rolePermissionsSchema,
  updateEmployeeSchema,
  updateRoleSchema,
} from "@/modules/admin/employees/schemas/employee.schema";
import { renderApp } from "@/test/renderApp";
import EmployeesPage from "@/modules/admin/employees/pages/EmployeesPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

vi.mock("@/modules/admin/employees/hooks/employee.queries", () => ({
  useEmployeesScreen: () => ({
    data: {
      employees: [
        { id: "e1", name: "أحمد", position: "كاشير", roleId: "r1", status: "ACTIVE", statusLabel: "نشط", schedule: null, permissionsVersion: 3, lastLoginAt: "2026-09-12", version: 1 },
        { id: "e2", name: "سارة", position: "باريستا", roleId: "r2", status: "INACTIVE", statusLabel: "موقوف", schedule: null, permissionsVersion: 1, lastLoginAt: null, version: 0 },
      ],
      summary: { total: 2, active: 1, pendingDevices: 1 },
      roles: [{ id: "r1", name: "كاشير", level: 10 }, { id: "r2", name: "باريستا", level: 20 }],
      pageMeta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useEmployeeDetails: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
  useEmployeeDevices: () => ({
    data: { items: [{ id: "d1", employeeId: "e1", name: "Chrome", browser: "Chrome", os: "Windows", status: "PENDING", statusLabel: "بانتظار الاعتماد", firstSeenAt: "2026-09-12", lastSeenAt: "2026-09-12", lastLoginAt: null, attemptCount: 1, version: 0 }], pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useRoles: () => ({
    data: { roles: [{ id: "r1", name: "كاشير", level: 10, description: "", isSystem: false, permissions: ["employees.read"], version: 1 }] },
    isLoading: false, isError: false, refetch: vi.fn(),
  }),
  usePermissionsCatalog: () => ({
    data: { permissions: [{ id: "p1", key: "employees.read", pageKey: "employees", action: "read" }], byPage: [{ pageKey: "employees", items: [{ id: "p1", key: "employees.read", pageKey: "employees", action: "read" }] }] },
    isLoading: false, isError: false, refetch: vi.fn(),
  }),
  useAttendanceList: () => ({
    data: {
      items: [{ id: "a1", employeeId: "e1", attendanceDate: "2026-09-12", checkInAt: "2026-09-12T08:00:00+02:00", checkInDeviceId: null, checkOutAt: null, checkedOutBy: null, checkOutMethod: null, lateMinutes: 0, workedMinutes: null, status: "OPEN", statusLabel: "مفتوح", notes: "", version: 0 }],
      summary: { total: 1, open: 1, closed: 0 },
      pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    },
    isLoading: false, isError: false, isFetching: false, refetch: vi.fn(),
  }),
  useAttendanceDetails: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
}));

const adminAuth = {
  permissions: [
    { pageKey: "employees", visible: true, actions: ["read", "create", "update", "devices.decide", "permissions.manage", "password.view"] },
    { pageKey: "attendance", visible: true, actions: ["read", "check-out", "adjust", "force-close"] },
  ],
};

const roleId = "507f1f77bcf86cd799439061";

describe("employees + attendance v1 contract", () => {
  it("targets the real backend routes, not legacy paths", () => {
    expect(EMPLOYEE_ENDPOINTS.screen).toBe("/employees-screen");
    expect(EMPLOYEE_ENDPOINTS.create).toBe("/employees");
    expect(EMPLOYEE_ENDPOINTS.details("abc")).toBe("/employees/abc");
    expect(EMPLOYEE_ENDPOINTS.devices).toBe("/employee-devices");
    expect(EMPLOYEE_ENDPOINTS.approveDevice("abc")).toBe("/employee-devices/abc/approve");
    expect(EMPLOYEE_ENDPOINTS.blockDevice("abc")).toBe("/employee-devices/abc/block");
    expect(EMPLOYEE_ENDPOINTS.permissionMatrix("abc")).toBe("/employees/abc/permission-matrix");
    expect(EMPLOYEE_ENDPOINTS.roles).toBe("/roles");
    expect(EMPLOYEE_ENDPOINTS.roleDetails("abc")).toBe("/roles/abc");
    expect(EMPLOYEE_ENDPOINTS.rolePermissions("abc")).toBe("/roles/abc/permissions");
    expect(EMPLOYEE_ENDPOINTS.permissions).toBe("/permissions");
    expect(ATTENDANCE_ENDPOINTS.checkIn).toBe("/attendance/check-in");
    expect(ATTENDANCE_ENDPOINTS.list).toBe("/attendance");
    expect(ATTENDANCE_ENDPOINTS.details("abc")).toBe("/attendance/abc");
    expect(ATTENDANCE_ENDPOINTS.checkOut("abc")).toBe("/attendance/abc/check-out");
    expect(ATTENDANCE_ENDPOINTS.adjustments("abc")).toBe("/attendance/abc/adjustments");
    expect(ATTENDANCE_ENDPOINTS.forceClose("abc")).toBe("/attendance/abc/force-close");
  });

  it("cleans employees, devices, roles, and permissions", () => {
    const screen = toEmployeesScreen({
      employees: [{ id: "e1", name: "أحمد", status: "ACTIVE", version: 1 }],
      summary: { total: 1, active: 1, pendingDevices: 2 },
      roles: [{ id: "r1", name: "كاشير", level: 10 }],
    });
    expect(screen.employees[0].statusLabel).toBe("نشط");
    expect(screen.employees[0].version).toBe(1);
    expect(screen.summary.pendingDevices).toBe(2);
    expect(toRoleOptions(screen.roles)).toEqual([]);
    expect(toRoleOptions([
      { id: "r1", name: "Admin", level: 100, isSystem: true },
      { id: "r2", name: "Employee", level: 10, isSystem: true },
      { id: "r3", name: "محاسب", level: 1, isSystem: false },
    ])).toEqual([
      { value: "r1", label: "ادمن" },
      { value: "r2", label: "موظف" },
    ]);
    expect(toRoleOptions([
      { id: "r1", name: "Admin", level: 100 },
      { id: "r2", name: "Employee", level: 10 },
    ])).toEqual([
      { value: "r1", label: "ادمن" },
      { value: "r2", label: "موظف" },
    ]);
    const details = toEmployeeDetails({ employee: { id: "e1", status: "INACTIVE" }, passwordPlainText: "secret" });
    expect(details.employee.statusLabel).toBe("موقوف");
    expect(details.passwordPlainText).toBe("secret");
    const devices = toDevicesList({ items: [{ id: "d1", status: "PENDING", attemptCount: 3 }] });
    expect(devices.items[0].statusLabel).toBe("بانتظار الاعتماد");
    expect(devices.items[0].attemptCount).toBe(3);
    const roles = toRolesList([{ id: "r1", name: "x", permissions: ["a", 1] }]);
    expect(roles.roles[0].permissions).toEqual(["a", "1"]);
    const rolesFromItems = toRolesList({ items: [{ id: "r1", name: "Admin", level: 100, isSystem: true, permissions: [] }] });
    expect(rolesFromItems.roles).toHaveLength(1);
    expect(rolesFromItems.roles[0].name).toBe("Admin");
    const catalog = toPermissionsCatalog([{ id: "p1", key: "k", pageKey: "pg", action: "read" }]);
    expect(catalog.byPage).toHaveLength(1);
    expect(catalog.byPage[0].pageKey).toBe("pg");
    const catalogFromItems = toPermissionsCatalog({ items: [{ _id: "p1", key: "employees.read", pageKey: "employees", action: "read" }] });
    expect(catalogFromItems.permissions).toHaveLength(1);
    expect(catalogFromItems.permissions[0].id).toBe("p1");
    expect(catalogFromItems.byPage[0].pageKey).toBe("employees");
  });

  it("cleans attendance lists and details", () => {
    const list = toAttendanceList({ items: [{ id: "a1", status: "OPEN", workedMinutes: null }], summary: { total: 1, open: 1, closed: 0 } });
    expect(list.items[0].statusLabel).toBe("مفتوح");
    expect(list.summary.open).toBe(1);
    const details = toAttendanceDetails({ attendance: { id: "a1", status: "CLOSED" }, adjustments: { items: [{ id: "j1" }] } });
    expect(details.attendance.statusLabel).toBe("مغلق");
    expect(details.adjustments.items).toHaveLength(1);
  });

  it("validates employee, device, role, and matrix bodies exactly like the backend", () => {
    expect(createEmployeeSchema.safeParse({ name: "أحمد", passwordPlainText: "pw", position: "كاشير", roleId, workStart: "08:00", workEnd: "16:00" }).success).toBe(true);
    expect(createEmployeeSchema.safeParse({ name: "x", passwordPlainText: "pw", position: "كاشير", roleId, workStart: "8:00", workEnd: "16:00" }).success).toBe(false);
    expect(updateEmployeeSchema.safeParse({ status: "INACTIVE", reason: "مخالفة جسيمة", expectedVersion: 1 }).success).toBe(true);
    expect(updateEmployeeSchema.safeParse({ status: "INACTIVE", expectedVersion: 1 }).success).toBe(false);
    expect(updateEmployeeSchema.safeParse({ status: "ACTIVE", expectedVersion: 1 }).success).toBe(true);
    expect(deviceDecisionSchema.safeParse({ reason: "جهاز موثوق", expectedVersion: 0 }).success).toBe(true);
    expect(permissionMatrixSchema.safeParse({ roleId, permissions: [{ permissionKey: "employees.read", effect: "ALLOW" }], pages: [{ pageKey: "employees", visible: true }], expectedPermissionsVersion: 3 }).success).toBe(true);
    expect(permissionMatrixSchema.safeParse({ roleId, permissions: [], pages: [], expectedPermissionsVersion: 0 }).success).toBe(false);
    expect(createRoleSchema.safeParse({ name: "مشرف", level: 50 }).success).toBe(true);
    expect(updateRoleSchema.safeParse({ level: 60, expectedVersion: 1 }).success).toBe(true);
    expect(rolePermissionsSchema.safeParse({ permissionKeys: ["employees.read"], expectedVersion: 1 }).success).toBe(true);
    expect(firstEmployeeFormError(createEmployeeSchema.safeParse({ name: "", passwordPlainText: "", position: "", roleId: "", workStart: "", workEnd: "" }))).toBeTruthy();
  });

  it("validates attendance bodies exactly like the backend", () => {
    expect(checkOutSchema.safeParse({ notes: "انصراف", expectedVersion: 0 }).success).toBe(true);
    expect(adjustAttendanceSchema.safeParse({ kind: "CHECK_IN", changes: { checkInAt: "2026-09-12T08:05:00+02:00" }, reason: "تأخير معتمد", expectedVersion: 0 }).success).toBe(true);
    expect(adjustAttendanceSchema.safeParse({ kind: "BOTH", changes: {}, reason: "تأخير معتمد", expectedVersion: 0 }).success).toBe(false);
    expect(forceCloseSchema.safeParse({ reason: "نسيان البصمة", expectedVersion: 0 }).success).toBe(true);
    expect(forceCloseSchema.safeParse({ expectedVersion: 0 }).success).toBe(false);
  });
});

describe("employees page on the v1 layer", () => {
  it("renders server employees with delete/edit actions and no tabs", () => {
    renderApp(<EmployeesPage />, { route: "/admin/employees", auth: adminAuth });
    expect(screen.getByText("أحمد")).toBeInTheDocument();
    expect(screen.getByText("سارة")).toBeInTheDocument();
    expect(screen.getAllByText("حذف نهائي").length).toBeGreaterThan(0);
    expect(screen.getAllByText("تعديل").length).toBeGreaterThan(0);
    expect(screen.queryByText("الأجهزة")).not.toBeInTheDocument();
    expect(screen.queryByText("الأدوار")).not.toBeInTheDocument();
  });
});
