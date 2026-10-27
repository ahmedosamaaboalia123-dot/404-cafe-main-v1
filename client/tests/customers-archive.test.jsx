import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import CustomersPage from "@/modules/admin/customers/pages/CustomersPage";

const { screenMock, update } = vi.hoisted(() => ({
  screenMock: vi.fn(),
  update: vi.fn(async () => ({})),
}));

vi.mock("@/modules/admin/customers/api/customers.api", () => ({
  customersApi: { screen: screenMock, create: vi.fn(async () => ({})), details: vi.fn(), update },
}));

const activeCustomer = {
  id: "c1",
  name: "أحمد محمد",
  phone: "01000000001",
  address: "القاهرة",
  status: "ACTIVE",
  orderCount: 4,
  completedOrderCount: 3,
  lifetimeValue: "1250.50",
  version: 2,
};

const archivedCustomer = { ...activeCustomer, id: "c2", name: "سارة", status: "ARCHIVED", version: 7 };

const screenPayload = (rows) => ({
  summary: { total: rows.length, active: 1, blocked: 0 },
  customers: rows,
  pageMeta: { page: 1, limit: 10, totalItems: rows.length, totalPages: 1 },
});

const adminAuth = {
  permissions: [{ pageKey: "customers", visible: true, actions: ["read", "create", "update"] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  screenMock.mockResolvedValue(screenPayload([activeCustomer]));
});

describe("customers archive and restore", () => {
  it("loads active customers by default and shows Arabic status", async () => {
    renderApp(<CustomersPage />, { route: "/admin/customers", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("أحمد محمد")).toBeInTheDocument());
    expect(screenMock).toHaveBeenCalledWith(expect.objectContaining({ status: "ACTIVE" }));
    const row = screen.getByText("أحمد محمد").closest("tr");
    expect(within(row).getByText("نشط")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تعديل" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "أرشفة" })).toBeInTheDocument();
  });

  it("filters archived customers on select", async () => {
    renderApp(<CustomersPage />, { route: "/admin/customers", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("أحمد محمد")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("تصفية حسب الحالة"), { target: { value: "ARCHIVED" } });
    await waitFor(() =>
      expect(screenMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "ARCHIVED" }))
    );
  });

  it("archives with the row version", async () => {
    renderApp(<CustomersPage />, { route: "/admin/customers", auth: adminAuth });
    fireEvent.click(await screen.findByRole("button", { name: "أرشفة" }));
    expect(await screen.findByText("أرشفة العميل")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith("c1", { status: "ARCHIVED", expectedVersion: 2 }, expect.anything());
  });

  it("restores an archived customer", async () => {
    screenMock.mockResolvedValue(screenPayload([archivedCustomer]));
    renderApp(<CustomersPage />, { route: "/admin/customers", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("سارة")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("تصفية حسب الحالة"), { target: { value: "ARCHIVED" } });
    await waitFor(() => expect(within(screen.getByText("سارة").closest("tr")).getByText("مؤرشف")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "استعادة" }));
    expect(await screen.findByText("استعادة العميل")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد" }));
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith("c2", { status: "ACTIVE", expectedVersion: 7 }, expect.anything());
  });
});
