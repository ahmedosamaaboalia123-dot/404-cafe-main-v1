import { readPageMeta } from "@/api/pagination";

const str = (value, fallback = "") => (value === undefined || value === null ? fallback : String(value));

export const EMPLOYEE_STATUSES = Object.freeze({ ACTIVE: "نشط", INACTIVE: "موقوف" });
export const DEVICE_STATUSES = Object.freeze({ PENDING: "بانتظار الاعتماد", APPROVED: "معتمد", BLOCKED: "محظور" });
export const ATTENDANCE_STATUSES = Object.freeze({ OPEN: "مفتوح", CLOSED: "مغلق" });

const cleanEmployee = (employee = {}) => ({
  ...employee,
  id: str(employee.id),
  name: employee.name || "",
  position: employee.position || "",
  roleId: str(employee.roleId),
  status: employee.status || "ACTIVE",
  statusLabel: EMPLOYEE_STATUSES[employee.status] || employee.status || "—",
  schedule: employee.schedule ? { ...employee.schedule } : null,
  permissionsVersion: Number(employee.permissionsVersion ?? 0),
  lastLoginAt: employee.lastLoginAt ?? null,
  version: Number(employee.version ?? 0),
});

const cleanDevice = (device = {}) => ({
  ...device,
  id: str(device.id),
  employeeId: str(device.employeeId),
  name: device.name ?? null,
  browser: device.browser ?? null,
  os: device.os ?? null,
  status: device.status || "PENDING",
  statusLabel: DEVICE_STATUSES[device.status] || device.status || "—",
  firstSeenAt: device.firstSeenAt ?? null,
  lastSeenAt: device.lastSeenAt ?? null,
  lastLoginAt: device.lastLoginAt ?? null,
  attemptCount: Number(device.attemptCount ?? 0),
  version: Number(device.version ?? 0),
});

const cleanRole = (role = {}) => ({
  ...role,
  id: str(role.id),
  name: role.name || "",
  level: Number(role.level ?? 0),
  description: role.description ?? "",
  isSystem: Boolean(role.isSystem),
  permissions: (role.permissions || []).map(String),
  version: Number(role.version ?? 0),
});

const cleanPermission = (permission = {}) => ({
  ...permission,
  id: str(permission.id ?? permission._id),
  key: str(permission.key),
  pageKey: str(permission.pageKey),
  action: str(permission.action),
});

const cleanAttendance = (record = {}) => ({
  ...record,
  id: str(record.id),
  employeeId: str(record.employeeId),
  attendanceDate: record.attendanceDate ?? null,
  checkInAt: record.checkInAt ?? null,
  checkInDeviceId: record.checkInDeviceId ? str(record.checkInDeviceId) : null,
  checkOutAt: record.checkOutAt ?? null,
  checkedOutBy: record.checkedOutBy ? str(record.checkedOutBy) : null,
  checkOutMethod: record.checkOutMethod ?? null,
  lateMinutes: record.lateMinutes ?? null,
  workedMinutes: record.workedMinutes ?? null,
  status: record.status || "OPEN",
  statusLabel: ATTENDANCE_STATUSES[record.status] || record.status || "—",
  notes: record.notes ?? "",
  version: Number(record.version ?? 0),
});

export function toEmployeesScreen(data = {}) {
  const employees = (data.employees || []).map(cleanEmployee);
  return {
    employees,
    summary: {
      total: Number(data.summary?.total ?? 0),
      active: Number(data.summary?.active ?? 0),
      pendingDevices: Number(data.summary?.pendingDevices ?? 0),
    },
    roles: (data.roles || []).map((role) => ({ ...role, id: str(role.id), name: role.name || "", level: Number(role.level ?? 0) })),
    pageMeta: readPageMeta(data.pageMeta, employees.length),
  };
}

export function toEmployeeDetails(data = {}) {
  return {
    employee: data.employee ? cleanEmployee(data.employee) : null,
    passwordPlainText: data.passwordPlainText ?? null,
    devices: data.devices ? { items: (data.devices.items || []).map(cleanDevice), pageMeta: readPageMeta(data.devices.pageMeta, data.devices.items?.length || 0) } : null,
    permissions: data.permissions ?? null,
    attendance: data.attendance ?? null,
    activity: data.activity ?? null,
  };
}

export function toDevicesList(data = {}) {
  const items = (data.items || []).map(cleanDevice);
  return { items, pageMeta: readPageMeta(data.pageMeta, items.length) };
}

export function toRolesList(data = {}) {
  const raw = Array.isArray(data) ? data : data.roles || data.items || [];
  const roles = raw.map(cleanRole);
  return { roles };
}

export function toPermissionsCatalog(data = {}) {
  const raw = Array.isArray(data) ? data : data.permissions || data.items || [];
  const permissions = raw.map(cleanPermission);
  const byPage = new Map();
  for (const permission of permissions) {
    if (!byPage.has(permission.pageKey)) byPage.set(permission.pageKey, []);
    byPage.get(permission.pageKey).push(permission);
  }
  return { permissions, byPage: [...byPage.entries()].map(([pageKey, items]) => ({ pageKey, items })) };
}

export function toAttendanceList(data = {}) {
  const items = (data.items || []).map(cleanAttendance);
  return {
    items,
    summary: {
      total: Number(data.summary?.total ?? 0),
      open: Number(data.summary?.open ?? 0),
      closed: Number(data.summary?.closed ?? 0),
    },
    pageMeta: readPageMeta(data.pageMeta, items.length),
  };
}

export function toAttendanceDetails(data = {}) {
  return {
    attendance: data.attendance ? cleanAttendance(data.attendance) : null,
    adjustments: data.adjustments ? { items: data.adjustments.items || [], pageMeta: readPageMeta(data.adjustments.pageMeta, data.adjustments.items?.length || 0) } : null,
  };
}

const SYSTEM_ROLE_LABELS = Object.freeze({ Admin: "ادمن", Employee: "موظف" });

export function toRoleOptions(roles = []) {
  return (Array.isArray(roles) ? roles : [])
    .filter((role) => {
      if (!Object.prototype.hasOwnProperty.call(SYSTEM_ROLE_LABELS, role?.name)) return false;
      if (role?.isSystem === undefined) return true;
      return role.isSystem === true;
    })
    .map((role) => ({ value: str(role.id || role._id), label: SYSTEM_ROLE_LABELS[role.name] }))
    .filter((role) => role.value);
}
