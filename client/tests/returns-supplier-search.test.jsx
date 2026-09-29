import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import { mockServer } from "@/test/server";
import { renderApp } from "@/test/renderApp";
import ReturnsPage from "@/modules/admin/returns/pages/ReturnsPage";

vi.mock("@/realtime/useRealtimeRoom", () => ({ useRealtimeRoom: () => {} }));

it("sends the entered supplier name to the returns API and clears the filter", async () => {
  const searches = [];
  mockServer.use(http.get("*/purchase-returns-screen", ({ request }) => {
    searches.push(new URL(request.url).searchParams.get("supplierSearch"));
    return HttpResponse.json({ ok: true, data: { returns: [], summary: {}, pageMeta: { page: 1, limit: 10, totalItems: 0 } } });
  }));
  renderApp(<ReturnsPage />, { route: "/admin/returns", auth: { permissions: [{ pageKey: "purchase-returns", visible: true, actions: ["read"] }] } });
  const input = screen.getByRole("textbox", { name: "بحث عن المورد" });
  fireEvent.change(input, { target: { value: "مورد النور" } });
  await waitFor(() => expect(searches).toContain("مورد النور"));
  fireEvent.change(input, { target: { value: "" } });
  await waitFor(() => expect(searches.at(-1)).toBeNull());
});
