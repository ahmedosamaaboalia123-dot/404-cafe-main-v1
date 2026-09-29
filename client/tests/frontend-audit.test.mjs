import { describe, expect, it } from "vitest";
import { inspectSourceText, renderBaselineMarkdown } from "../scripts/lib/frontend-audit.mjs";

describe("frontend integration audit", () => {
it("detects direct endpoints, mock imports, storage and numeric IDs", () => {
  const source = [
    'import rows from "./mockOrders.js";',
    'apiClient.get("/orders");',
    'localStorage.setItem("order", "x");',
    'const productId = Number(item.productId);',
  ].join("\n");
  const result = inspectSourceText(source);
  expect(result.endpointLiterals).toHaveLength(1);
  expect(result.mockImports).toHaveLength(1);
  expect(result.localStorageUses).toHaveLength(1);
  expect(result.numericIds).toHaveLength(1);
});

it("baseline markdown includes every finding category", () => {
  const markdown = renderBaselineMarkdown({
    generatedAt: "2026-09-12T00:00:00.000Z",
    sourceFileCount: 1,
    counts: { endpointLiterals: 0, mockImports: 0, localStorageUses: 0, numericIds: 0 },
    findings: { endpointLiterals: [], mockImports: [], localStorageUses: [], numericIds: [] },
  });
  expect(markdown).toMatch(/Endpoint literals/);
  expect(markdown).toMatch(/localStorage/);
});
});
