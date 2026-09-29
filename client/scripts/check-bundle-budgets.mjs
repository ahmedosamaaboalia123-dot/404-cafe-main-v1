import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, "dist/.vite/manifest.json"), "utf8"));
const entry = Object.values(manifest).find((item) => item.isEntry);
if (!entry) throw new Error("Vite entry is missing from the manifest");
const byFile = new Map(Object.values(manifest).map((item) => [item.file, item]));
const files = new Set();
const visit = (item) => {
  if (!item || files.has(item.file)) return;
  files.add(item.file);
  for (const dependency of item.imports || []) visit(manifest[dependency] || byFile.get(dependency));
};
visit(entry);
let raw = 0;
let gzip = 0;
for (const file of files) {
  const content = await readFile(path.join(root, "dist", file));
  raw += (await stat(path.join(root, "dist", file))).size;
  gzip += gzipSync(content).length;
}
const budgets = { raw: 450_000, gzip: 145_000 };
const result = { initialFiles: files.size, rawBytes: raw, gzipBytes: gzip, budgets };
console.log(JSON.stringify(result, null, 2));
if (raw > budgets.raw || gzip > budgets.gzip) {
  console.error("Initial JavaScript bundle exceeds the performance budget");
  process.exitCode = 1;
}
