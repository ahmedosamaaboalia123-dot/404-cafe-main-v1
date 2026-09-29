import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { attendanceApi, employeesApi } from "../api/employees.api";
import {
  toAttendanceDetails,
  toAttendanceList,
  toDevicesList,
  toEmployeeDetails,
  toEmployeesScreen,
  toPermissionsCatalog,
  toRolesList,
} from "../adapters/employee.adapter";

export function useEmployeesScreen(params) {
  return useQuery({
    queryKey: queryKeys.employees.list(params),
    queryFn: async () => toEmployeesScreen(await employeesApi.screen(params)),
    placeholderData: (previous) => previous,
  });
}

export function useEmployeeDetails(id, include = [], query = {}) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id, `${include.join(",")}:${query.activityPage ?? 1}:${query.activityLimit ?? 10}:${query.attendancePage ?? 1}:${query.attendanceLimit ?? 10}`),
    queryFn: async () => toEmployeeDetails(await employeesApi.details(id, include, query)),
    enabled: Boolean(id),
  });
}

export function useEmployeeDevices(params) {
  return useQuery({
    queryKey: [...queryKeys.employees.all, "devices", params ?? null],
    queryFn: async () => toDevicesList(await employeesApi.devices(params)),
    placeholderData: (previous) => previous,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: [...queryKeys.employees.all, "roles"],
    queryFn: async () => toRolesList(await employeesApi.roles()),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: [...queryKeys.employees.all, "permissions"],
    queryFn: async () => toPermissionsCatalog(await employeesApi.permissions()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAttendanceList(params) {
  return useQuery({
    queryKey: queryKeys.attendance.list(params),
    queryFn: async () => toAttendanceList(await attendanceApi.list(params)),
    placeholderData: (previous) => previous,
  });
}

export function useAttendanceDetails(id) {
  return useQuery({
    queryKey: queryKeys.attendance.detail(id),
    queryFn: async () => toAttendanceDetails(await attendanceApi.details(id)),
    enabled: Boolean(id),
  });
}
