import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PreparationPage from "@/modules/admin/orders/pages/PreparationPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

const { usePreparation } = vi.hoisted(() => ({ usePreparation: vi.fn() }));
vi.mock("../src/modules/admin/orders/hooks/order.queries", async (importOriginal) => {
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
  usePreparation.mockImplementation(() => ({ ...emptyPage, data: { items: [row], meta: serverMeta } }));
const renderPage = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PreparationPage />
      </QueryClientProvider>
    </MemoryRouter>
  );

describe("preparation screen table column", () => {
  it("shows the resolved table number", async () => {
    withCard(card());
    renderPage();
    const article = (await screen.findByText("ORD-00000007")).closest("article");
    expect(article.querySelector(".prep-card__type").textContent).toBe("طاولة 4");
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("falls back to 'طاولة' when the table number is unknown", async () => {
    withCard(card({ tableNumber: null }));
    renderPage();
    const article = (await screen.findByText("ORD-00000007")).closest("article");
    expect(article.querySelector(".prep-card__type").textContent).toBe("طاولة");
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("leaves the table column empty for online orders", async () => {
    withCard(card({ fulfillmentType: "TAKEAWAY", tableNumber: null }));
    renderPage();
    const article = (await screen.findByText("ORD-00000007")).closest("article");
    expect(article.querySelector(".prep-card__type").textContent).toBe("تيك أواي");
    expect(document.body.textContent).not.toContain("undefined");
  });
});
