import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createTestQueryClient } from "@/test/renderApp";
import { useAuthStore } from "@/store/authStore";
import EmployeeDetailsPage from "@/modules/admin/employees/pages/EmployeeDetailsPage";
import detailsRaw from "./fixtures/diag-details.json";
import devicesRaw from "./fixtures/diag-devices.json";
import rolesRaw from "./fixtures/diag-roles.json";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

vi.mock("@/modules/admin/employees/api/employees.api", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    employeesApi: {
      ...original.employeesApi,
      details: async () => ({
        ...detailsRaw,
        employee: { ...detailsRaw.employee, roleId: globalThis.__detailsRoleId ?? detailsRaw.employee.roleId },
      }),
      devices: async () => devicesRaw,
      roles: async () => rolesRaw,
      replacePermissionMatrix: async (id, body) => {
        globalThis.__matrixBody = { id, body };
        return {};
      },
    },
    attendanceApi: {
      ...original.attendanceApi,
    },
  };
});

const catalogPayload = {
  items: [
    { _id: "p1", key: "employees.read", pageKey: "employees", action: "read" },
    { _id: "p2", key: "employees.create", pageKey: "employees", action: "create" },
    { _id: "p3", key: "suppliers.read", pageKey: "suppliers", action: "read" },
  ],
};

vi.mock("@/modules/admin/employees/hooks/employee.queries", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    usePermissionsCatalog: () => ({
      data: {
        permissions: catalogPayload.items.map((item) => ({ id: item._id, key: item.key, pageKey: item.pageKey, action: item.action })),
        byPage: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
  };
});

const adminAuth = {
  employee: { id: "a1", name: "admin" },
  permissions: [
    { pageKey: "employees", visible: true, actions: ["read", "create", "update", "devices.decide", "permissions.manage", "password.view"] },
    { pageKey: "attendance", visible: true, actions: ["read", "check-out", "adjust", "force-close"] },
  ],
};

const ADMIN_ROLE_ID = "6aa4b56e2f0c54bb6168b523";
const EMPLOYEE_ROLE_ID = "6aa6c6129c7c780f081c37df";

function renderDetails() {
  useAuthStore.setState({ employee: adminAuth.employee, permissions: adminAuth.permissions, isAuthChecking: false });
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={["/admin/employees/6aa4b56f2f0c54bb6168b56d"]}>
        <Routes>
          <Route path="/admin/employees/:id" element={<EmployeeDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("employee details page with server payloads", () => {
  it("renders devices, attendance, matrix, and activity for non-admin", async () => {
    globalThis.__detailsRoleId = EMPLOYEE_ROLE_ID;
    const { unmount } = renderDetails();
    expect(await screen.findByText("أجهزة الموظف", {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText("سجل الحضور")).toBeInTheDocument();
    expect(screen.getByText("مصفوفة الصلاحيات")).toBeInTheDocument();
    expect(screen.getByText("سجل الأنشطة")).toBeInTheDocument();
    expect(screen.getByText("ساعة الحضور")).toBeInTheDocument();
    expect(screen.getByText("ساعة الانصراف")).toBeInTheDocument();
    expect(screen.queryByText("إجراءات")).not.toBeInTheDocument();
    expect(screen.getByText("الموردون")).toBeInTheDocument();
    expect(screen.queryByText("employees.read")).not.toBeInTheDocument();
    unmount();
  });

  it("hides matrix and attendance for admin employees", async () => {
    globalThis.__detailsRoleId = ADMIN_ROLE_ID;
    const { unmount } = renderDetails();
    expect(await screen.findByText("أجهزة الموظف", {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByText("مصفوفة الصلاحيات")).not.toBeInTheDocument();
    expect(screen.queryByText("سجل الحضور")).not.toBeInTheDocument();
    expect(screen.getByText("سجل الأنشطة")).toBeInTheDocument();
    unmount();
  });

  it("saves visible pages with their catalog actions and the employee role", async () => {
    globalThis.__detailsRoleId = EMPLOYEE_ROLE_ID;
    globalThis.__matrixBody = null;
    const { unmount } = renderDetails();
    await screen.findByText("مصفوفة الصلاحيات", {}, { timeout: 8000 });
    fireEvent.click(screen.getByLabelText("إظهار صفحة الموردون"));
    fireEvent.click(screen.getByText("حفظ المصفوفة"));
    await waitFor(() => expect(globalThis.__matrixBody).toBeTruthy(), { timeout: 5000 });
    const { body } = globalThis.__matrixBody;
    expect(body.roleId).toBe(EMPLOYEE_ROLE_ID);
    const sentKeys = body.permissions.map((entry) => entry.permissionKey);
    expect(sentKeys).toContain("employees.read");
    expect(sentKeys).not.toContain("suppliers.read");
    const suppliersPage = body.pages.find((page) => page.pageKey === "suppliers");
    expect(suppliersPage.visible).toBe(false);
    const employeesPage = body.pages.find((page) => page.pageKey === "employees");
    expect(employeesPage.visible).toBe(true);
    unmount();
  });
});
