import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import DelegatesPage from "@/modules/admin/delegates/pages/DelegatesPage";

const { screenMock, createDelegate, updateDelegate } = vi.hoisted(() => ({
  screenMock: vi.fn(),
  createDelegate: vi.fn(async () => ({})),
  updateDelegate: vi.fn(async () => ({})),
}));

vi.mock("@/modules/admin/delegates/api/delivery.api", () => ({
  deliveryApi: { screen: screenMock, createDelegate, updateDelegate },
}));

const activeDelegate = {
  id: "d1",
  name: "كريم",
  phone: "01000000001",
  status: "ACTIVE",
  activeOrderCount: 2,
  maxActiveOrders: 5,
  deliveredCount: 9,
  version: 4,
};

const inactiveDelegate = { ...activeDelegate, id: "d2", name: "سامي", status: "INACTIVE", version: 6 };

const screenPayload = (rows) => ({
  summary: { total: rows.length, active: rows.filter((r) => r.status === "ACTIVE").length },
  delegates: rows,
  pageMeta: { page: 1, limit: 10, totalItems: rows.length, totalPages: 1 },
});

const adminAuth = {
  permissions: [{ pageKey: "delegates", visible: true, actions: ["read", "create", "update"] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  screenMock.mockResolvedValue(screenPayload([activeDelegate]));
});

describe("delegates page manage", () => {
  it("renders Arabic status, data labels and the status filter", async () => {
    renderApp(<DelegatesPage />, { route: "/admin/delegates", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("كريم")).toBeInTheDocument());
    const row = screen.getByText("كريم").closest("tr");
    expect(within(row).getByText("نشط")).toBeInTheDocument();
    expect(screen.getByLabelText("تصفية حسب الحالة")).toBeInTheDocument();
    expect(document.querySelector('td[data-label="المندوب"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: "تعديل" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إيقاف" })).toBeInTheDocument();
  });

  it("creates a delegate with a numeric capacity", async () => {
    renderApp(<DelegatesPage />, { route: "/admin/delegates", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("كريم")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("اسم المندوب"), { target: { value: "مندوب جديد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف وواتساب"), { target: { value: "01000000009" } });
    fireEvent.change(screen.getByLabelText("السعة القصوى للطلبات"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "إضافة المندوب" }));
    await waitFor(() => expect(createDelegate).toHaveBeenCalledOnce());
    expect(createDelegate.mock.calls[0][0]).toEqual({ name: "مندوب جديد", phone: "01000000009", maxActiveOrders: 7 });
  });

  it("deactivates with a reason and the row version", async () => {
    renderApp(<DelegatesPage />, { route: "/admin/delegates", auth: adminAuth });
    fireEvent.click(await screen.findByRole("button", { name: "إيقاف" }));
    expect(await screen.findByText("إيقاف المندوب")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("مثال: انتهاء التعاون"), { target: { value: "انتهاء التعاون" } });
    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    await waitFor(() => expect(updateDelegate).toHaveBeenCalledOnce());
    expect(updateDelegate).toHaveBeenCalledWith(
      "d1",
      { status: "INACTIVE", reason: "انتهاء التعاون", expectedVersion: 4 },
      expect.anything()
    );
  });

  it("restores an inactive delegate without a reason", async () => {
    screenMock.mockResolvedValue(screenPayload([inactiveDelegate]));
    renderApp(<DelegatesPage />, { route: "/admin/delegates", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("سامي")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("تصفية حسب الحالة"), { target: { value: "INACTIVE" } });
    fireEvent.click(await screen.findByRole("button", { name: "استعادة" }));
    expect(await screen.findByText("استعادة المندوب")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    await waitFor(() => expect(updateDelegate).toHaveBeenCalledOnce());
    expect(updateDelegate).toHaveBeenCalledWith("d2", { status: "ACTIVE", expectedVersion: 6 }, expect.anything());
  });
});
