import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { auditFrontend, getBlockingFindings, renderBaselineMarkdown } from "./lib/frontend-audit.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const report = await auditFrontend({ root });
const outputDirectory = path.join(root, "reports");

if (args.has("--write-baseline")) {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDirectory, "frontend-integration-baseline.json"), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(path.join(outputDirectory, "frontend-integration-baseline.md"), renderBaselineMarkdown(report)),
  ]);
}

console.log(JSON.stringify({ sourceFileCount: report.sourceFileCount, counts: report.counts }, null, 2));

if (args.has("--strict")) {
  const blocking = getBlockingFindings(report);
  if (blocking > 0) {
    console.error(`Frontend integration audit failed with ${blocking} blocking finding(s).`);
    process.exitCode = 1;
  }
}
