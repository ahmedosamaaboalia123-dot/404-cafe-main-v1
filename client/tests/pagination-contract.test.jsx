import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { normalizePageParams, readPageMeta, resetPageOnFilterChange } from "@/api/pagination";
import ServerPagination from "@/shared/components/ServerPagination/ServerPagination";
import { toShiftPage, toTransactionPage } from "@/modules/admin/drawer/adapters/drawer.adapter";

/** Exactly what `server/src/platform/database/pagination.js#buildPageMeta` emits. */
const serverMeta = (page, totalItems, limit = 10) => ({
  page,
  limit,
  totalItems,
  totalPages: Math.ceil(totalItems / limit),
  hasNextPage: page * limit < totalItems,
  hasPreviousPage: page > 1,
  sort: { openedAt: -1, _id: -1 }
});

const readServerPaginationSource = () =>
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../../server/src/platform/database/pagination.js"),
    "utf8"
  );

describe("the server page envelope is the one the client reads", () => {
  /**
   * Regression guard for the whole admin app: every screen paginates through
   * `readPageMeta`, so if the server renames a field in `buildPageMeta` the whole
   * app silently drops back to "page 1 of 1". This asserts the two sides against
   * each other instead of against a hand-written copy of the payload.
   */
  it("keeps every envelope field the client depends on", () => {
    const source = readServerPaginationSource();
    for (const field of ["totalItems", "totalPages", "hasNextPage", "hasPreviousPage"]) {
      expect(source).toContain(field);
      expect(readPageMeta(serverMeta(1, 47))).toHaveProperty(
        field === "totalItems" ? "total" : field === "totalPages" ? "pages" : field === "hasNextPage" ? "hasNext" : "hasPrevious"
      );
    }
  });

  it("caps the client limit at the same ceiling the server accepts", () => {
    // `parsePage` rejects limit > 10, and `normalizePageParams` clamps to
    // DEFAULT_PAGE_LIMIT, so the two must stay in step.
    expect(readServerPaginationSource()).toMatch(/limit\s*>\s*10/);
    expect(normalizePageParams({ limit: 12 }).limit).toBeLessThanOrEqual(10);
    expect(normalizePageParams({ limit: 12 }).limit).toBe(10);
  });
});

describe("server page envelopes", () => {
  /**
   * Regression: the drawer screen, and every other screen, is stuck on page 1.
   * `readPageMeta` used to read `total` / `pages` / `hasNext`, which the server
   * never sends, so the page count silently collapsed to 1.
   */
  it("reads the totals off the envelope the server actually builds", () => {
    expect(readPageMeta(serverMeta(2, 47))).toEqual({
      page: 2,
      limit: 10,
      total: 47,
      pages: 5,
      hasNext: true,
      hasPrevious: true
    });
    expect(readPageMeta(serverMeta(5, 47))).toMatchObject({ pages: 5, hasNext: false, hasPrevious: true });
    expect(readPageMeta(serverMeta(1, 47))).toMatchObject({ pages: 5, hasNext: true, hasPrevious: false });
  });

  it("still accepts the short legacy names", () => {
    expect(readPageMeta({ page: 1, limit: 10, total: 30, pages: 3, hasNext: true })).toMatchObject({
      total: 30,
      pages: 3,
      hasNext: true
    });
  });

  it("keeps the fallback honest for a partial or empty envelope", () => {
    expect(readPageMeta({ page: 1, limit: 10 }, 10)).toMatchObject({ total: 10, pages: 1, hasNext: false });
    expect(readPageMeta({}, 0)).toMatchObject({ page: 1, total: 0, pages: 1, hasNext: false });
  });

  it("carries the envelope through the drawer adapters", () => {
    const shifts = toShiftPage({ items: [{ _id: "1", shiftNo: "S-1" }], pageMeta: serverMeta(2, 47) });
    const txs = toTransactionPage({
      items: [{ _id: "1", direction: "IN", amount: "100" }],
      pageMeta: serverMeta(1, 23)
    });
    expect(shifts.pageMeta).toMatchObject({ total: 47, pages: 5, hasNext: true, hasPrevious: true });
    expect(txs.pageMeta).toMatchObject({ total: 23, pages: 3, hasNext: true });
  });
});

describe("ServerPagination", () => {
  it("offers the next page and reports the real count", async () => {
    const onPageChange = vi.fn();
    render(
      <ServerPagination meta={serverMeta(1, 47)} onPageChange={onPageChange} label="حركة" />
    );
    expect(screen.getByText(/صفحة 1 من 5/)).toBeTruthy();
    expect(screen.getByText(/إجمالي 47 حركة/)).toBeTruthy();
    await userEvent.click(screen.getByLabelText("الصفحة التالية"));
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(screen.getByLabelText("الصفحة السابقة").disabled).toBe(true);
  });

  it("disables the next button on the last page", () => {
    render(<ServerPagination meta={serverMeta(5, 47)} onPageChange={vi.fn()} label="وردية" />);
    expect(screen.getByLabelText("الصفحة التالية").disabled).toBe(true);
    expect(screen.getByText(/صفحة 5 من 5/)).toBeTruthy();
  });

  it("renders nothing when there are no rows at all", () => {
    const { container } = render(
      <ServerPagination meta={serverMeta(1, 0)} onPageChange={vi.fn()} />
    );
    expect(container.querySelector(".server-pagination")).toBeNull();
  });
});

describe("page params", () => {
  it("clamps the limit to what the server accepts and normalises the page", () => {
    expect(normalizePageParams({ page: "0", limit: 500 })).toMatchObject({ page: 1, limit: 10 });
    expect(normalizePageParams({ page: "3", limit: "25" })).toMatchObject({ page: 3, limit: 10 });
    expect(normalizePageParams({ page: 2, search: "ali" })).toMatchObject({ page: 2, search: "ali" });
  });

  it("resets to page 1 only when the filters change", () => {
    expect(resetPageOnFilterChange({ page: 4, search: "a" }, { page: 7, search: "a" })).toMatchObject({
      page: 7
    });
    expect(resetPageOnFilterChange({ page: 4, search: "a" }, { page: 4, search: "b" })).toMatchObject({
      page: 1
    });
  });
});
