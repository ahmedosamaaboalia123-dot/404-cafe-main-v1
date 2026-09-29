import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import DrawerPage from "@/modules/admin/drawer/pages/DrawerPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

// hoisted so the vi.mock factory below can close over them
const { cashIn, cashOut } = vi.hoisted(() => ({
  cashIn: vi.fn(async () => ({})),
  cashOut: vi.fn(async () => ({})),
}));

vi.mock("@/modules/admin/drawer/api/drawer.api", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    drawerApi: {
      ...original.drawerApi,
      screen: vi.fn(async () => ({
        currentShift: {
          id: "shift-1",
          shiftNo: "SH-000001",
          status: "OPEN",
          currency: "EGP",
          openingBalance: "100.00",
          totalCashIn: "0.00",
          totalCashOut: "0.00",
          expectedClosingBalance: "100.00",
          version: 3,
          openedAt: "2026-09-25T10:00:00.000Z",
        },
        summary: { balance: "100.00" },
        recentTransactions: { items: [] },
        openShiftAlerts: { items: [] },
      })),
      shifts: vi.fn(async () => ({ items: [] })),
      transactions: vi.fn(async () => ({ items: [{ id: 'move-1', sourceType: 'MANUAL', direction: 'IN', description: 'حركة قائمة للاختبار', amount: '10', balanceAfter: '100' }] })),
      alerts: vi.fn(async () => ({ items: [] })),
      print: vi.fn(async () => ({ shift: {}, transactions: [], reconciliation: {} })),
      cashIn,
      cashOut,
    },
  };
});

const drawerAuth = {
  permissions: [{ pageKey: "drawer", visible: true, actions: ["read", "move", "close"] }],
};

/**
 * Regression: the incoming (وارد) and outgoing (صادر) forms used to share a single
 * `move` state object, so typing in one form wrote into the other one. Each form
 * must own its fields, and submitting one must submit only its own values.
 */
describe("cash drawer movement forms", () => {
  it("keeps the incoming and outgoing forms independent", async () => {
    renderApp(<DrawerPage />, { route: "/admin/drawer", auth: drawerAuth });

    await waitFor(() => expect(screen.getByText("وارد يدوي")).toBeInTheDocument());
    expect(screen.getByText("صادر يدوي")).toBeInTheDocument();
    await screen.findByText("حركة قائمة للاختبار");
    expect(screen.queryByRole("button", { name: "عكس" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "إجراء" })).not.toBeInTheDocument();

    const inAmount = screen.getByLabelText("المبلغ", { selector: "#cash-in-amount" });
    const outAmount = screen.getByLabelText("المبلغ", { selector: "#cash-out-amount" });
    const inDescription = screen.getByLabelText("البيان", { selector: "#cash-in-description" });
    const outDescription = screen.getByLabelText("البيان", { selector: "#cash-out-description" });
    const inReason = screen.getByLabelText("السبب", { selector: "#cash-in-reason" });
    const outReason = screen.getByLabelText("السبب", { selector: "#cash-out-reason" });

    fireEvent.change(inAmount, { target: { value: "250" } });
    fireEvent.change(inDescription, { target: { value: "دخل اختباري" } });
    fireEvent.change(inReason, { target: { value: "سبب الدخل" } });

    // Typing in the incoming form must not leak into the outgoing form.
    expect(outAmount).toHaveValue("");
    expect(outDescription).toHaveValue("");
    expect(outReason).toHaveValue("");

    fireEvent.change(outAmount, { target: { value: "75" } });
    fireEvent.change(outDescription, { target: { value: "مصروف اختباري" } });
    fireEvent.change(outReason, { target: { value: "سبب المصروف" } });

    // ...and the reverse must hold as well.
    expect(inAmount).toHaveValue("250");
    expect(inDescription).toHaveValue("دخل اختباري");
    expect(inReason).toHaveValue("سبب الدخل");

    fireEvent.click(screen.getByRole("button", { name: "تسجيل الصادر" }));

    await waitFor(() => expect(cashOut).toHaveBeenCalledOnce());
    const [, outBody] = cashOut.mock.calls[0];
    expect(outBody).toMatchObject({ amount: "75", description: "مصروف اختباري", reason: "سبب المصروف", expectedVersion: 3 });
    expect(cashIn).not.toHaveBeenCalled();

    // The submitted form clears, and only the submitted form clears.
    await waitFor(() => expect(screen.getByLabelText("البيان", { selector: "#cash-out-description" })).toHaveValue(""));
    expect(screen.getByLabelText("البيان", { selector: "#cash-in-description" })).toHaveValue("دخل اختباري");
    expect(screen.getByLabelText("المبلغ", { selector: "#cash-in-amount" })).toHaveValue("250");

    fireEvent.click(screen.getByRole("button", { name: "تسجيل الوارد" }));
    await waitFor(() => expect(cashIn).toHaveBeenCalledOnce());
    const [, inBody] = cashIn.mock.calls[0];
    expect(inBody).toMatchObject({ amount: "250", description: "دخل اختباري", reason: "سبب الدخل", expectedVersion: 3 });
  });
});
