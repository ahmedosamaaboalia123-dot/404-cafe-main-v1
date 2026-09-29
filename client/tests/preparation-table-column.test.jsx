import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PreparationPage from "@/modules/admin/orders/pages/PreparationPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

const { usePreparation } = vi.hoisted(() => ({ usePreparation: vi.fn() }));
vi.mock("@/modules/admin/orders/hooks/order.queries", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, usePreparation };
});

const card = (overrides = {}) => ({
  id: "o1",
  orderNumber: "ORD-00000007",
  fulfillmentType: "DINE_IN",
  tableNumber: 4,
  status: "PREPARING",
  items: [{ id: "i1", productName: "لاتيه", quantity: 2 }],
  progress: { ready: 0, total: 1 },
  version: 0,
  ...overrides
});

const serverMeta = { page: 1, limit: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
const emptyPage = { data: { items: [], meta: serverMeta }, isLoading: false, error: null };
/** The screen queries the online and the tables group separately. */
const withCard = (row) =>
  usePreparation.mockImplementation(({ group }) => (group === "tables" ? { ...emptyPage, data: { items: [row], meta: serverMeta } } : emptyPage));
const renderPage = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PreparationPage />
      </QueryClientProvider>
    </MemoryRouter>
  );

describe("preparation screen table column", () => {
  /**
   * Regression: the products cell rendered `طاولة ${order.table}` for DINE_IN
   * orders, but the card DTO never carried a table field, so the kitchen screen
   * showed "طاولة undefined" for every table order.
   */
  it("shows the resolved table number and the product count in their own columns", async () => {
    withCard(card());
    renderPage();
    const row = (await screen.findByText("ORD-00000007")).closest("tr");
    expect(row.cells[1].textContent).toBe("1 منتج");
    expect(row.cells[2].textContent).toBe("طاولة 4");
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("falls back to a dash when the table number is unknown", async () => {
    withCard(card({ tableNumber: null }));
    renderPage();
    const row = (await screen.findByText("ORD-00000007")).closest("tr");
    expect(row.cells[1].textContent).toBe("1 منتج");
    expect(row.cells[2].textContent).toBe("—");
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("leaves the table column empty for online orders", async () => {
    withCard(card({ fulfillmentType: "TAKEAWAY", tableNumber: null }));
    renderPage();
    const row = (await screen.findByText("ORD-00000007")).closest("tr");
    expect(row.cells[1].textContent).toBe("1 منتج");
    expect(row.cells[2].textContent).toBe("—");
    expect(document.body.textContent).not.toContain("undefined");
  });
});
