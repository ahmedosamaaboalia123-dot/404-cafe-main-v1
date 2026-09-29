import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import CustomersPage from "@/modules/admin/customers/pages/CustomersPage";

const { screenMock, create } = vi.hoisted(() => ({
  screenMock: vi.fn(),
  create: vi.fn(async () => ({})),
}));

vi.mock("@/modules/admin/customers/api/customers.api", () => ({
  customersApi: { screen: screenMock, create, details: vi.fn(), update: vi.fn() },
}));

const customers = [
  {
    id: "c1",
    name: "أحمد محمد",
    phone: "01000000001",
    address: "القاهرة - مدينة نصر",
    status: "ACTIVE",
    orderCount: 4,
    completedOrderCount: 3,
    lifetimeValue: "1250.50",
    socialLinks: ["https://wa.me/1", "https://facebook.com/x"],
  },
  {
    id: "c2",
    name: "سارة",
    phone: "01000000002",
    address: null,
    status: "BLOCKED",
    orderCount: 0,
    completedOrderCount: 0,
    lifetimeValue: "0",
    socialLinks: [],
  },
];

const screenPayload = (rows) => ({
  summary: { total: rows.length, active: 1, blocked: 1 },
  customers: rows,
  pageMeta: { page: 1, limit: 10, totalItems: rows.length, totalPages: 1 },
});

const adminAuth = {
  permissions: [{ pageKey: "customers", visible: true, actions: ["read", "create", "update"] }],
};

/** ar-EG renders Arabic-Indic digits and separators; normalize for assertions. */
const toAsciiDigits = (text) =>
  text
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\u066b/g, ".")
    .replace(/\u066c/g, ",");

beforeEach(() => {
  screenMock.mockReset();
  create.mockClear();
  screenMock.mockResolvedValue(screenPayload(customers));
});

/**
 * Regression: the social-media links input was removed from the customer form, and
 * the list table must never surface those links.
 */
describe("customers page", () => {
  it("does not collect or render social media links", async () => {
    renderApp(<CustomersPage />, { route: "/admin/customers", auth: adminAuth });

    await waitFor(() => expect(screen.getByText("أحمد محمد")).toBeInTheDocument());
    expect(screen.queryByLabelText(/روابط السوشيال/)).not.toBeInTheDocument();
    expect(screen.queryByText(/روابط السوشيال/)).not.toBeInTheDocument();
    // The API still returns socialLinks; the table must not leak them.
    expect(screen.queryByText("https://wa.me/1")).not.toBeInTheDocument();
    expect(document.querySelector(".ct-social")).toBeNull();
  });

  it("creates a customer without a socialLinks payload", async () => {
    renderApp(<CustomersPage />, { route: "/admin/customers", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("أحمد محمد")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("الاسم"), { target: { value: "عميل جديد" } });
    fireEvent.change(screen.getByLabelText("رقم الهاتف"), { target: { value: "01000000009" } });
    fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: "الإسكندرية" } });
    fireEvent.click(screen.getByRole("button", { name: /إنشاء عميل/ }));

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    const [body] = create.mock.calls[0];
    expect(body).toEqual({ name: "عميل جديد", phone: "01000000009", address: "الإسكندرية" });
    expect(body).not.toHaveProperty("socialLinks");
  });

  it("renders the readable table columns with a formatted total", async () => {
    renderApp(<CustomersPage />, { route: "/admin/customers", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("أحمد محمد")).toBeInTheDocument());

    const table = within(screen.getByRole("table"));
    for (const header of ["الاسم", "الهاتف", "العنوان", "الحالة", "الطلبات", "المكتملة", "إجمالي المشتريات"])
      expect(table.getByText(header)).toBeInTheDocument();

    // `Money` formats with the ar-EG locale, so compare on normalized ASCII digits.
    const totals = table
      .getAllByText((_, el) => el?.tagName === "TD" && el.dataset.label === "إجمالي المشتريات")
      .map((td) => toAsciiDigits(td.textContent.trim()));
    expect(totals).toEqual(["1,250.50 ج.م", "0.00 ج.م"]);

    // Row click opens the customer; the action button keeps a distinct label.
    expect(screen.getByRole("button", { name: "فتح صفحة أحمد محمد" })).toBeInTheDocument();
  });

  it("shows an empty state instead of an empty table", async () => {
    screenMock.mockResolvedValue(screenPayload([]));
    renderApp(<CustomersPage />, { route: "/admin/customers", auth: adminAuth });
    await waitFor(() => expect(screen.getByText("لا يوجد عملاء مطابقون للبحث.")).toBeInTheDocument());
  });
});
