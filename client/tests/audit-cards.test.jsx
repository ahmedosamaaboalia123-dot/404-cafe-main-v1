import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createTestQueryClient } from "@/test/renderApp";
import { useAuthStore } from "@/store/authStore";
import AuditPage from "@/modules/admin/audit/pages/AuditPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

const screenPayload = {
  items: [
    {
      id: "ev1",
      eventNo: 71,
      eventType: "EMPLOYEE_DELETED",
      module: "employees",
      action: "DELETED",
      actor: { type: "EMPLOYEE", id: "a1", name: "أحمد" },
      entity: { type: "Employee", id: "e9" },
      result: "SUCCESS",
      severity: "WARNING",
      occurredAt: "2026-09-17T17:52:06.456Z",
      metadataSafe: { employeeId: "e9" },
    },
    {
      id: "ev2",
      eventNo: 70,
      eventType: "SHIFT_TICK",
      module: "drawer",
      action: "TICK",
      actor: { type: "SYSTEM" },
      entity: null,
      result: "SUCCESS",
      severity: "INFO",
      occurredAt: "2026-09-17T17:50:00.000Z",
    },
  ],
  summary: { total: 2, success: 2, failed: 0, denied: 0, warning: 1, critical: 0 },
  filters: {},
  pageMeta: { page: 1, limit: 10, total: 2, pages: 1 },
};

vi.mock("@/modules/admin/audit/api/audit.api", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    auditApi: {
      ...original.auditApi,
      screen: async () => screenPayload,
      details: async (id) => ({ event: screenPayload.items.find((item) => item.id === id) }),
    },
  };
});

const adminAuth = {
  employee: { id: "a1", name: "admin" },
  permissions: [{ pageKey: "audit", visible: true, actions: ["read"] }],
};

function renderAudit() {
  useAuthStore.setState({ employee: adminAuth.employee, permissions: adminAuth.permissions, isAuthChecking: false });
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={["/admin/audit"]}>
        <Routes>
          <Route path="/admin/audit" element={<AuditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("audit page event cards", () => {
  it("shows every event with its employee and expands the full-data card", async () => {
    const { unmount } = renderAudit();
    expect(await screen.findByText("أحمد", {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText("71")).toBeInTheDocument();
    expect(screen.getAllByText("حذف موظف").length).toBeGreaterThan(0);
    expect(screen.getAllByText("موظف").length).toBeGreaterThan(0);
    expect(screen.getAllByText("النظام").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /تفاصيل الحدث/ })[0]);
    await waitFor(() => expect(screen.getByText("السجل المتأثر")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getAllByText("رقم مرجع السجل").length).toBeGreaterThan(0);
    expect(screen.queryByText("metadataSafe")).not.toBeInTheDocument();
    expect(screen.queryByText("employeeId")).not.toBeInTheDocument();
    expect(screen.queryByText("الحدث كاملًا (JSON)")).not.toBeInTheDocument();
    unmount();
  });
});
