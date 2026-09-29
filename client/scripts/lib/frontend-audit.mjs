import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", ".git", "coverage"]);
const API_LITERAL = /(?:apiClient|axios|v1Client)\s*\.\s*(?:get|post|put|patch|delete)\s*\(\s*(["'`])\/(?!\/)([^"'`]+)\1/g;
const MOCK_IMPORT = /(?:from\s*|import\s*\()(["'`])([^"'`]*(?:mock|Mock)[^"'`]*)\1/g;
const LOCAL_STORAGE = /\blocalStorage\s*\./g;
const NUMERIC_ID = /\b(?:Number|parseInt)\s*\(\s*[^)]*(?:\bid\b|Id\b|ID\b)[^)]*\)/g;

export async function walkSource(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
    }
  }
  await visit(root);
  return files.sort();
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function collectMatches(text, regex, toValue) {
  const matches = [];
  regex.lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    matches.push({ line: lineNumber(text, match.index), value: toValue(match) });
  }
  return matches;
}

export function inspectSourceText(text) {
  return {
    endpointLiterals: collectMatches(text, API_LITERAL, (match) => `/${match[2]}`),
    mockImports: collectMatches(text, MOCK_IMPORT, (match) => match[2]),
    localStorageUses: collectMatches(text, LOCAL_STORAGE, () => "localStorage"),
    // Table numbers are contract integers 1..20 (backend: tableNumber), not MongoIds —
    // parsing them is sanctioned, so matches mentioning "table" are excluded here.
    numericIds: collectMatches(text, NUMERIC_ID, (match) => match[0]).filter(
      (match) => !/table/i.test(match.value)
    ),
  };
}

export async function auditFrontend({ root }) {
  const sourceRoot = path.join(root, "src");
  const files = await walkSource(sourceRoot);
  const findings = { endpointLiterals: [], mockImports: [], localStorageUses: [], numericIds: [] };
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const inspected = inspectSourceText(text);
    for (const [category, matches] of Object.entries(inspected)) {
      for (const match of matches) {
        findings[category].push({
          file: path.relative(root, file).replaceAll("\\", "/"),
          ...match,
        });
      }
    }
  }
  const counts = Object.fromEntries(Object.entries(findings).map(([key, value]) => [key, value.length]));
  return { generatedAt: new Date().toISOString(), sourceFileCount: files.length, counts, findings };
}

export function renderBaselineMarkdown(report) {
  const sections = [
    ["Endpoint literals خارج registry", "endpointLiterals"],
    ["Mock imports في source", "mockImports"],
    ["استخدامات localStorage", "localStorageUses"],
    ["تحويلات محتملة لمعرفات Mongo إلى أرقام", "numericIds"],
  ];
  const output = [
    "# Frontend Integration Baseline",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Source files scanned: ${report.sourceFileCount}`,
    "- This report records migration work; findings are expected during phase 0.",
    "",
  ];
  for (const [title, key] of sections) {
    output.push(`## ${title} (${report.counts[key]})`, "");
    if (!report.findings[key].length) output.push("- لا توجد نتائج.", "");
    else {
      for (const item of report.findings[key]) output.push(`- \`${item.file}:${item.line}\` — \`${item.value}\``);
      output.push("");
    }
  }
  return `${output.join("\n")}\n`;
}

export function getBlockingFindings(report) {
  return report.counts.endpointLiterals + report.counts.mockImports + report.counts.numericIds;
}
