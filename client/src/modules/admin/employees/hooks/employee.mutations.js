import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { queryKeys } from "@/api/queryKeys";
import { attendanceApi, employeesApi } from "../api/employees.api";

const uniqueScope = (name) => `${name}:${globalThis.crypto?.randomUUID?.() || Math.random()}`;

function useEmployeeMutation(name, mutation, { employeeId, onSuccess } = {}) {
  const queryClient = useQueryClient();
  const scope = useRef(uniqueScope(name));
  const result = useMutation({
    mutationFn: (variables) => mutation(variables, beginOperation(scope.current)),
    onSuccess: async (data, variables) => {
      finishOperation(scope.current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.all }),
        employeeId ? queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) }) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap }),
      ]);
      onSuccess?.(data, variables);
    },
  });
  return { ...result, resetAttempt() { finishOperation(scope.current); result.reset(); } };
}

export const useCreateEmployee = (options) =>
  useEmployeeMutation("employee:create", (body, key) => employeesApi.create(body, key), options);

export const useUpdateEmployee = (employeeId, options) =>
  useEmployeeMutation("employee:update", (body, key) => employeesApi.update(employeeId, body, key), { employeeId, ...options });

export const useDeleteEmployee = (options) =>
  useEmployeeMutation("employee:delete", (body, key) => {
    const { employeeId, ...payload } = body;
    return employeesApi.remove(employeeId, payload, key);
  }, options);

export const useApproveDevice = (options) =>
  useEmployeeMutation("device:approve", (body, key) => {
    const { deviceId, ...payload } = body;
    return employeesApi.approveDevice(deviceId, payload, key);
  }, options);

export const useBlockDevice = (options) =>
  useEmployeeMutation("device:block", (body, key) => {
    const { deviceId, ...payload } = body;
    return employeesApi.blockDevice(deviceId, payload, key);
  }, options);

export const useRevokeDevice = (options) =>
  useEmployeeMutation("device:revoke", (body, key) => {
    const { deviceId, ...payload } = body;
    return employeesApi.revokeDevice(deviceId, payload, key);
  }, options);

export const useReplacePermissionMatrix = (employeeId, options) =>
  useEmployeeMutation("employee:matrix", (body, key) => employeesApi.replacePermissionMatrix(employeeId, body, key), { employeeId, ...options });

export const useCreateRole = (options) =>
  useEmployeeMutation("role:create", (body, key) => employeesApi.createRole(body, key), options);

export const useUpdateRole = (roleId, options) =>
  useEmployeeMutation("role:update", (body, key) => employeesApi.updateRole(roleId, body, key), options);

export const useReplaceRolePermissions = (roleId, options) =>
  useEmployeeMutation("role:permissions", (body, key) => employeesApi.replaceRolePermissions(roleId, body, key), options);

export const useCheckIn = (options) =>
  useEmployeeMutation("attendance:check-in", (_body, key) => attendanceApi.checkIn(key), options);

export const useCheckOutAttendance = (attendanceId, options) =>
  useEmployeeMutation("attendance:check-out", (body, key) => attendanceApi.checkOut(attendanceId, body, key), options);

export const useAdjustAttendance = (attendanceId, options) =>
  useEmployeeMutation("attendance:adjust", (body, key) => attendanceApi.adjust(attendanceId, body, key), options);

export const useForceCloseAttendance = (attendanceId, options) =>
  useEmployeeMutation("attendance:force-close", (body, key) => attendanceApi.forceClose(attendanceId, body, key), options);
