/**
 * Phase 2 — Repository hygiene gates.
 *
 * Detects dead code, unused environment flags and documentation that promises
 * tooling which does not exist. Each test encodes the target state, so any
 * failing assertion is a real cleanup item rather than a broken expectation.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(serverRoot, '..');

function walk(dir, base = '') {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

describe('phase 2 — repository hygiene', () => {
  it('ships no dead mock-data modules in the client source', () => {
    const offenders = walk(join(repoRoot, 'client', 'src')).filter(
      (rel) => /mock/i.test(rel) && !/\.(test|spec)\./.test(rel)
    );
    expect(offenders).toEqual([]);
  });

  it('uses every VITE_ flag declared in the client .env', () => {
    const env = readFileSync(join(repoRoot, 'client', '.env'), 'utf8');
    const flags = [...env.matchAll(/^(VITE_[A-Z0-9_]+)=/gm)].map((m) => m[1]);
    const source = walk(join(repoRoot, 'client', 'src'))
      .map((rel) => readFileSync(join(repoRoot, 'client', 'src', rel), 'utf8'))
      .join('\n');
    const unused = flags.filter((flag) => !source.includes(flag));
    expect(unused).toEqual([]);
  });

  it('references only npm scripts that actually exist', () => {
    const pkg = JSON.parse(readFileSync(join(serverRoot, 'package.json'), 'utf8'));
    const docs = readdirSync(serverRoot)
      .filter((name) => name.endsWith('.md'))
      .map((name) => readFileSync(join(serverRoot, name), 'utf8'))
      .join('\n');
    const referenced = new Set();
    for (const match of docs.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)) referenced.add(match[1]);
    const missing = [...referenced].filter((name) => !(name in pkg.scripts));
    expect(missing).toEqual([]);
  });

  it('keeps the release-gate documentation consistent with KNOWN_LIMITATIONS', () => {
    const text = readFileSync(join(serverRoot, 'KNOWN_LIMITATIONS.md'), 'utf8');
    const pkg = JSON.parse(readFileSync(join(serverRoot, 'package.json'), 'utf8'));
    // Every gate the docs ask you to run must exist as a script.
    for (const gate of ['migrate', 'indexes:check', 'integrity:check']) {
      expect(pkg.scripts, `release gate "${gate}"`).toBeTruthy();
    }
    expect(text).toMatch(/migrate:status/);
    expect(pkg.scripts['migrate:status']).toBeTruthy();
  });
});
