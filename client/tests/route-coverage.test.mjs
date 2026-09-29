import { expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("the pinned backend route manifest is valid and contains the expected contract", async () => {
  const manifestPath = path.join(
    process.cwd(),
    "src",
    "api",
    "route-manifest.snapshot.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  expect(manifest).toHaveLength(201);
  const keys = new Set(manifest.map(({ method, path }) => `${method} ${path}`));
  expect(keys.size).toBe(manifest.length);
  for (const expected of [
    "GET /api/v1/admin/bootstrap",
    "GET /api/v1/suppliers-screen",
    "GET /api/v1/raw-materials-screen",
    "GET /api/v1/purchases-screen",
    "POST /api/v1/orders",
    "GET /api/v1/preparation-screen",
    "GET /api/v1/financial-reports-screen",
    "GET /api/v1/audit-events-screen",
  ])
    expect(keys.has(expected), `Missing required route: ${expected}`).toBe(
      true,
    );
});
