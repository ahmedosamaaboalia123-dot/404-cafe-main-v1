import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const table = { tableNumber: 1, tableOrders: [] };
const localOrder = { id: "local-1", orderNumber: "LOCAL-1", status: "completed" };
const store = { local: [localOrder] };

vi.mock("@/modules/customer/orders/pages/CustomerOrdersPage", () => ({
  default: ({ orders }) => (
    <div
      data-testid="orders-page"
      data-ids={(orders ?? []).map((o) => o.id).join(",")}
      data-count={orders?.length ?? 0}
    />
  ),
}));

vi.mock("@/modules/table/context/TableContext", () => ({ useTable: () => table }));

vi.mock("@/modules/table/services/tableOrdersService", () => ({
  getOrdersByTableNumber: () => store.local,
}));

const TableOrdersPage = (await import("@/modules/table/orders/pages/TableOrdersPage")).default;

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/table/1/orders"]}>
      <TableOrdersPage />
    </MemoryRouter>
  );

const shownIds = () => screen.getByTestId("orders-page").dataset.ids;

beforeEach(() => {
  table.tableNumber = 1;
  table.tableOrders = [];
  store.local = [localOrder];
});

describe("table orders page order list", () => {
  it("shows the open table order coming from the table context", () => {
    table.tableOrders = [
      { id: "68aaaa0000000000000000aa", orderNumber: "ORD-1042", status: "in_progress" },
      { id: "local-1", orderNumber: "LOCAL-1", status: "completed" },
    ];
    renderPage();
    expect(shownIds()).toBe("68aaaa0000000000000000aa,local-1");
  });

  it("falls back to the stored table orders while the first refresh is in flight", () => {
    table.tableOrders = [];
    renderPage();
    expect(shownIds()).toBe("local-1");
  });

  it("shows the live order even when the table has no stored demo orders", () => {
    store.local = [];
    table.tableOrders = [{ id: "68aaaa0000000000000000bb", orderNumber: "ORD-7", status: "ready" }];
    renderPage();
    expect(shownIds()).toBe("68aaaa0000000000000000bb");
  });

  it("renders the empty state when the table has neither a live nor a stored order", () => {
    store.local = [];
    table.tableOrders = [];
    renderPage();
    expect(shownIds()).toBe("");
  });
});
