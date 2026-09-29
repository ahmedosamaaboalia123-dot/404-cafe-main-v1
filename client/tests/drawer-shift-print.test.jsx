import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import DrawerPage from "@/modules/admin/drawer/pages/DrawerPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

// hoisted so the vi.mock factories below can close over them
const { print, shifts, printCalls } = vi.hoisted(() => ({
  print: vi.fn(),
  shifts: vi.fn(),
  printCalls: [],
}));

/**
 * The print layer is torn down as soon as `window.print()` returns, so the only
 * reliable moment to inspect the sheet is inside the call itself. Snapshotting
 * `#print-root` here captures exactly what the printer would receive.
 */
vi.mock("@/shared/components/PrintDocument/openPrintWindow", () => ({
  PRINTING_CLASS: "is-printing-document",
  openPrintWindow: () => {
    printCalls.push(document.getElementById("print-root")?.innerHTML ?? "");
  },
}));

vi.mock("@/modules/admin/drawer/api/drawer.api", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    drawerApi: {
      ...original.drawerApi,
      screen: vi.fn(async () => ({
        currentShift: null,
        summary: { balance: "0.00" },
        recentTransactions: { items: [] },
        openShiftAlerts: { items: [] },
      })),
      shifts,
      transactions: vi.fn(async () => ({ items: [] })),
      alerts: vi.fn(async () => ({ items: [] })),
      print,
    },
  };
});

const drawerAuth = {
  permissions: [{ pageKey: "drawer", visible: true, actions: ["read", "move", "close", "reverse"] }],
};

const shiftRow = {
  id: "shift-1",
  shiftNo: "SH-000001",
  status: "CLOSED",
  currency: "EGP",
  openingBalance: "100.00",
  totalCashIn: "500.00",
  totalCashOut: "30.00",
  expectedClosingBalance: "570.00",
  openedAt: "2026-09-25T10:00:00.000Z",
  closedAt: "2026-09-25T18:00:00.000Z",
};

const printData = {
  shift: shiftRow,
  // Deliberately unsorted on purpose: the report groups by direction, and the
  // server is responsible for the ascending per-direction order.
  transactions: [
    { id: "t3", direction: "OUT", amount: "30.00", recordedAt: "2026-09-25T17:00:00.000Z", sourceType: "EXPENSE", description: "شراء سنبل" },
    { id: "t1", direction: "IN", amount: "500.00", recordedAt: "2026-09-25T11:00:00.000Z", sourceType: "ORDER", description: "طلب رقم 12" },
    { id: "t2", direction: "IN", amount: "20.00", recordedAt: "2026-09-25T12:00:00.000Z", sourceType: "MANUAL", description: "دخل متنوع" },
  ],
  reconciliation: {},
  totals: { cashIn: "500.00", cashOut: "30.00" },
};

let printRoot;

beforeEach(() => {
  print.mockReset();
  shifts.mockReset();
  printCalls.length = 0;
  printRoot = document.createElement("div");
  printRoot.id = "print-root";
  document.body.appendChild(printRoot);
  shifts.mockResolvedValue({ items: [shiftRow], pageMeta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } });
  print.mockResolvedValue(printData);
});

afterEach(() => {
  printRoot.remove();
});

/** Parses the printed sheet so assertions target tables, not raw HTML strings. */
function readSheet(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  return [...host.querySelectorAll("section.print-sheet__block")].map((section) => ({
    title: section.querySelector("h2.print-sheet__title")?.textContent ?? "",
    rows: [...section.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent)),
    total: section.querySelector("tfoot td:last-child")?.textContent ?? "",
  }));
}

async function printFirstShift() {
  renderApp(<DrawerPage />, { route: "/admin/drawer", auth: drawerAuth });
  const button = await screen.findByRole("button", { name: "طباعة" });
  fireEvent.click(button);
  await waitFor(() => expect(print).toHaveBeenCalledOnce());
  await waitFor(() => expect(printCalls).toHaveLength(1));
  return readSheet(printCalls[0]);
}

/**
 * Regression: the shift report used to print every movement in one merged table.
 * Incoming and outgoing movements now get their own table, each with the shift's
 * authoritative total instead of the sum of the printed rows.
 */
describe("cash drawer shift print", () => {
  it("splits the report into a separate incoming and outgoing table", async () => {
    const blocks = await printFirstShift();

    expect(blocks).toHaveLength(2);
    expect(blocks[0].title).toBe("الوارد");
    expect(blocks[1].title).toBe("الصادر");

    expect(blocks[0].rows).toHaveLength(2);
    expect(blocks[0].rows.map((r) => r[3])).toEqual(["500.00", "20.00"]);
    expect(blocks[0].rows[0][2]).toBe("طلب رقم 12");

    expect(blocks[1].rows).toHaveLength(1);
    expect(blocks[1].rows[0][3]).toBe("30.00");
    expect(blocks[1].rows[0][2]).toBe("شراء سنبل");
  });

  it("uses the official shift totals, not the sum of the printed rows", async () => {
    const blocks = await printFirstShift();

    // Printed rows sum to 520.00 in / 30.00 out; the shift is 500.00 in.
    expect(blocks[0].total).toBe("500.00");
    expect(blocks[1].total).toBe("30.00");
  });

  it("renders an empty state for a direction without movements", async () => {
    print.mockResolvedValue({ ...printData, transactions: [] });
    const blocks = await printFirstShift();

    expect(blocks).toHaveLength(2);
    for (const block of blocks) {
      expect(block.rows).toHaveLength(1);
      expect(block.rows[0]).toHaveLength(1);
      expect(block.rows[0][0]).toMatch(/لا توجد حركات/);
    }
  });

  it("keeps the shift header and reconciliation meta in the sheet", async () => {
    renderApp(<DrawerPage />, { route: "/admin/drawer", auth: drawerAuth });
    fireEvent.click(await screen.findByRole("button", { name: "طباعة" }));
    await waitFor(() => expect(printCalls).toHaveLength(1));

    const host = document.createElement("div");
    host.innerHTML = printCalls[0];
    expect(host.querySelector("h1.print-sheet__title")?.textContent).toBe("الوردية SH-000001");
    expect(host.textContent).toContain("الرصيد الافتتاحي");
    expect(host.textContent).toContain("100.00");
  });
});
