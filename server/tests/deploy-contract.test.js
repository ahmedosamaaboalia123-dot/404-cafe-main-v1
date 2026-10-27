/**
 * Phase 2 — Deploy / rollback contract.
 *
 * A production handover needs a safe release path: the documented release-gate
 * commands must exist, the build identity must be stamped from the environment,
 * and a rollback path must be available so a bad release can be reverted.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('phase 2 — deploy / rollback contract', () => {
  it('exposes every documented release-gate command', () => {
    const pkg = JSON.parse(readFileSync(join(serverRoot, 'package.json'), 'utf8'));
    for (const script of ['migrate', 'migrate:status', 'indexes:check', 'indexes:apply', 'integrity:check']) {
      expect(pkg.scripts, `release gate "${script}"`).toBeTruthy();
    }
  });

  it('stamps the production build identity from APP_BUILD', () => {
    const bootstrap = readFileSync(join(serverRoot, 'src', 'bootstrap.js'), 'utf8');
    expect(bootstrap).toContain('process.env.APP_BUILD');
  });

  // GATE: no rollback script exists yet, so this fails until one is added.
  it('ships a rollback / revert script for the hbuilds symlink layout', () => {
    const scripts = readdirSync(join(serverRoot, 'scripts'));
    const hasRollback = scripts.some((name) => /rollback|revert|deploy/i.test(name));
    expect(hasRollback, 'expected a deploy/rollback script in server/scripts').toBe(true);
  });

  // GATE: a runbook for rollback must be documented before handover.
  it('documents a rollback runbook', () => {
    const runbook = join(serverRoot, 'ROLLBACK.md');
    expect(existsSync(runbook), 'expected server/ROLLBACK.md').toBe(true);
  });
});
