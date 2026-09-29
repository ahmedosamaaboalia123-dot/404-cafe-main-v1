import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, renderApp } from "@/test/renderApp";
import { useAuthStore } from "@/store/authStore";
import SalesPage from "@/modules/admin/orders/pages/SalesPage";
import { getProductCatalog } from "@/modules/admin/orders/services/adminProductsService";

const { catalog, create, table, tableOrder } = vi.hoisted(() => ({
  catalog: vi.fn(),
  create: vi.fn(async () => ({ order: { id: "o1" } })),
  table: vi.fn(async () => ({ table: { id: "t9", tableNumber: 4, version: 2 }, order: null, session: null })),
  tableOrder: vi.fn(async () => ({ order: { id: "o2" } })),
}));

vi.mock("@/modules/admin/products/api/products.api", async (importOriginal) => {
  const original = await importOriginal();
  return { productsApi: { ...original.productsApi, catalog } };
});

vi.mock("@/modules/admin/orders/api/orders.api", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ordersApi: {
      ...original.ordersApi,
      create,
      table,
      tableOrder,
      session: vi.fn(async () => ({ session: null })),
    },
  };
});

/** One catalog row shaped exactly like `getCatalog` in catalog.queries.js (string prices, `id` fields). */
const latteRow = {
  id: "p1",
  name: "لاتيه",
  category: { id: "c1" },
  types: [
    {
      id: "t1",
      name: "حار",
      sizes: [
        { id: "s1", name: "صغير", price: "40.00" },
        { id: "s2", name: "كبير", price: "55.00" },
      ],
    },
    { id: "t2", name: "بارد", sizes: [{ id: "s3", name: "وسط", price: "45.00" }] },
  ],
  addons: [
    { id: "a1", name: "شوكولاتة", price: "10.00" },
    { id: "a2", name: "قرفة", price: "5.00" },
  ],
};

const page = (products, pageMeta) => ({
  catalogVersion: "v1",
  categories: [{ id: "c1", name: "مشروبات" }],
  products,
  pageMeta,
});

/** 12 products behind a 10-per-page cap, so the screen has to walk the pages. */
const paginatedCatalog = () => {
  catalog.mockImplementation(async ({ page: pageNumber }) =>
    pageNumber === 1
      ? page(
          Array.from({ length: 10 }, (_, i) =>
            i === 0 ? latteRow : { ...latteRow, id: `p${i + 1}`, name: `منتج ${i + 1}` }
          ),
          { page: 1, limit: 10, totalItems: 12, hasNextPage: true }
        )
      : page(
          [
            { ...latteRow, id: "p11", name: "منتج 11" },
            { ...latteRow, id: "p12", name: "منتج 12" },
          ],
          { page: 2, limit: 10, totalItems: 12, hasNextPage: false }
        )
  );
};

const renderTableRoute = () => {
  useAuthStore.setState({
    employee: null,
    role: null,
    permissions: [],
    notifications: [],
    shift: null,
    isAuthChecking: false,
  });
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={["/admin/sales/table/t9"]}>
        <Routes>
          {/* mirrors adminRoutes: sales/:type/:id */}
          <Route path="/admin/sales/:type/:id" element={<SalesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/** Anchored so the invoice's "حذف لاتيه" / "تعديل خيارات لاتيه" buttons cannot match. */
const latteCard = () => screen.getByRole("button", { name: /^لاتيه/ });

const openDialog = async () => {
  fireEvent.click(latteCard());
  return screen.findByRole("dialog");
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Regression: the sales grid used to render one card per `type + size` combination
 * and add it straight to the invoice, so the cashier could never choose a size, an
 * add-on, or send notes. The server already prices `addonIds` and `notes`, so the
 * whole gap was in this screen.
 */
describe("sales order product options", () => {
  it("loads every catalog page and keeps the add-ons the server returns", async () => {
    paginatedCatalog();

    const result = await getProductCatalog({ force: true });

    expect(catalog).toHaveBeenCalledTimes(2);
    expect(result.products).toHaveLength(12);
    expect(result.categories).toEqual([{ id: "c1", name: "مشروبات" }]);

    const latte = result.products[0];
    expect(latte.categoryId).toBe("c1");
    expect(latte.addons.map((a) => a.name)).toEqual(["شوكولاتة", "قرفة"]);
    expect(latte.hasAddons).toBe(true);
    expect(latte.variants).toHaveLength(2);
    expect(latte.variants[0].sizes[0].sellingPrice).toBe("40.00");
    expect(latte.sizeCount).toBe(3);
    // "starting from" = cheapest size across all types.
    expect(latte.basePrice).toBe(40);
  });

  it("sends addonIds and notes for an online order", async () => {
    paginatedCatalog();
    renderApp(<SalesPage />, { route: "/admin/orders/online" });

    await waitFor(() => expect(latteCard()).toBeInTheDocument());
    const dialog = await openDialog();

    // One card per product now, and picking it opens the options dialog.
    const typeGroup = within(dialog).getByRole("group", { name: "النوع" });
    const sizeGroup = within(dialog).getByRole("group", { name: "الحجم" });
    expect(within(typeGroup).getAllByRole("button").map((b) => b.textContent)).toEqual(["حار", "بارد"]);
    expect(within(sizeGroup).getByRole("button", { name: /صغير/ })).toBeInTheDocument();
    expect(within(sizeGroup).getByRole("button", { name: /كبير/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /شوكولاتة/ })).toBeInTheDocument();

    fireEvent.click(within(sizeGroup).getByRole("button", { name: /كبير/ }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /شوكولاتة/ }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /قرفة/ }));
    fireEvent.change(within(dialog).getByLabelText("ملاحظات"), { target: { value: "بدون ثلج" } });
    fireEvent.click(within(dialog).getByLabelText("زيادة الكمية"));

    fireEvent.click(within(dialog).getByRole("button", { name: "إضافة للفاتورة" }));

    // The line reflects the choices that were made.
    await waitFor(() => expect(screen.getByText(/شوكولاتة \+ قرفة/)).toBeInTheDocument());
    expect(screen.getByText(/بدون ثلج/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("اسم العميل"), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByPlaceholderText("رقم الهاتف"), { target: { value: "01000000000" } });
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    const [body] = create.mock.calls[0];
    expect(body.fulfillmentType).toBe("TAKEAWAY");
    expect(body.items).toEqual([
      {
        productId: "p1",
        productSizeId: "s2",
        quantity: 2,
        addonIds: ["a1", "a2"],
        notes: "بدون ثلج",
      },
    ]);
  });

  it("sends addonIds and notes when opening a table order", async () => {
    paginatedCatalog();
    renderTableRoute();

    await waitFor(() => expect(latteCard()).toBeInTheDocument());
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "بارد" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /شوكولاتة/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "إضافة للفاتورة" }));

    fireEvent.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    await waitFor(() => expect(tableOrder).toHaveBeenCalledOnce());
    // ordersApi.tableOrder(tableId, body, idempotencyKey)
    const [tableId, body] = tableOrder.mock.calls[0];
    expect(tableId).toBe("t9");
    expect(body.expectedTableVersion).toBe(2);
    expect(body.items).toEqual([
      { productId: "p1", productSizeId: "s3", quantity: 1, addonIds: ["a1"] },
    ]);
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps different add-on sets as separate invoice lines", async () => {
    paginatedCatalog();
    renderApp(<SalesPage />, { route: "/admin/orders/online" });

    await waitFor(() => expect(latteCard()).toBeInTheDocument());

    const pick = async (sizeName, addonName) => {
      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(sizeName) }));
      fireEvent.click(within(dialog).getByRole("checkbox", { name: new RegExp(addonName) }));
      fireEvent.click(within(dialog).getByRole("button", { name: "إضافة للفاتورة" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    };

    await pick("صغير", "شوكولاتة");
    await pick("صغير", "قرفة");

    // Same product and size but a different add-on set => two lines, not a merge.
    expect(screen.getByText("2 منتج")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("اسم العميل"), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByPlaceholderText("رقم الهاتف"), { target: { value: "01000000000" } });
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    const [body] = create.mock.calls[0];
    expect(body.items).toHaveLength(2);
    expect(body.items[0].addonIds).toEqual(["a1"]);
    expect(body.items[1].addonIds).toEqual(["a2"]);
  });
});
