import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { isAdminRole } from "@/modules/auth/permissions/role";
import UserMenu from "@/layouts/AdminLayout/components/Header/components/UserMenu";

// The mutation never fires in these tests; the button must not be reachable at all
// for an admin, so stubbing the hook is enough to prove the UI gating.
vi.mock("@/modules/auth/hooks/useCheckOut", () => ({
  useCheckOut: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
  }),
}));

const openAttendance = { id: "att-1", version: 0, status: "OPEN" };

const employeeAuth = {
  employee: { id: "emp-1", name: "سارة" },
  role: { id: "r-2", name: "Employee" },
  currentAttendance: openAttendance,
};

const adminAuth = {
  employee: { id: "emp-9", name: "مدير النظام" },
  role: { id: "r-1", name: "Admin" },
  currentAttendance: openAttendance,
};

const checkoutButton = () => screen.queryByRole("button", { name: /تسجيل الانصراف/ });

describe("checkout button visibility by role", () => {
  // An open attendance record exists for the admin because login auto-checks-in
  // unconditionally, so the button has to be hidden by role, not by attendance.
  it("hides the checkout button for the admin even with an open attendance record", () => {
    renderApp(<UserMenu />, { auth: adminAuth });
    expect(checkoutButton()).toBeNull();
  });

  it("keeps the checkout button for a non-admin employee", () => {
    renderApp(<UserMenu />, { auth: employeeAuth });
    expect(checkoutButton()).not.toBeNull();
  });

  it("keeps the button hidden for an employee with no open attendance", () => {
    renderApp(<UserMenu />, { auth: { ...employeeAuth, currentAttendance: null } });
    expect(checkoutButton()).toBeNull();
  });

  it("treats a closed attendance record as not check-out-able", () => {
    renderApp(<UserMenu />, { auth: { ...employeeAuth, currentAttendance: { ...openAttendance, status: "CLOSED" } } });
    expect(checkoutButton()).toBeNull();
  });
});

describe("isAdminRole", () => {
  it("matches the system admin by name and by level", () => {
    expect(isAdminRole({ id: "r-1", name: "Admin" })).toBe(true);
    expect(isAdminRole({ id: "r-9", name: "Supervisor", level: 100 })).toBe(true);
  });

  it("does not treat ordinary or custom roles as admin", () => {
    expect(isAdminRole({ id: "r-2", name: "Employee" })).toBe(false);
    expect(isAdminRole({ id: "r-3", name: "Admin", level: 5 })).toBe(true);
    expect(isAdminRole({ id: "r-4", name: "Manager", level: 50 })).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});
