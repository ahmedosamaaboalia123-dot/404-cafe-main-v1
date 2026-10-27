/**
 * Phase 3 — Acceptance smoke for the public surface.
 *
 * Runs the real Express app (no database) and asserts the contracts a client
 * and an operator rely on: health endpoints, CORS allowlisting, security
 * headers, structured error envelopes and input validation that happens before
 * any database access.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { apiBasePath: '/api/v1', http: { corsOrigins: ['https://shop.example.com'] } };
const buildInfo = { apiVersion: 'v1', schemaVersion: 1, build: 'acceptance' };

function buildApp(healthProbe = async () => ({ mongodb: { status: 'UP', required: true } })) {
  return createApp({ config, buildInfo, healthProbe });
}

describe('phase 3 — acceptance smoke', () => {
  it('serves liveness, readiness and version without authentication', async () => {
    const app = buildApp();
    expect((await request(app).get('/health/live').expect(200)).body.data.status).toBe('UP');
    expect((await request(app).get('/health/ready').expect(200)).body.data.status).toBe('UP');
    expect((await request(app).get('/system/version').expect(200)).body.data.apiVersion).toBe('v1');
  });

  it('reflects the CORS allowlist for an allowed origin', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/health/live')
      .set('Origin', 'https://shop.example.com')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://shop.example.com');
  });

  it('does not reflect a disallowed origin', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/health/live')
      .set('Origin', 'https://evil.example.com')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sends security headers on every response', async () => {
    const app = buildApp();
    const res = await request(app).get('/health/live').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBeTruthy();
    expect(res.headers['x-frame-options']).toBeTruthy();
  });

  it('returns a structured 404 envelope for unknown routes', async () => {
    const app = buildApp();
    const res = await request(app).get('/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.meta.requestId).toBeTruthy();
  });

  it('rejects malformed auth payloads before touching the database', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ name: 'Admin', password: 'x', fingerprint: 'f', device: {}, injected: true })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed public order lookup payloads before touching the database', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/public-orders/lookup')
      .send({ orderNumber: 'ORD-1', phone: 'bad' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication for an admin-only route', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/admin/bootstrap').expect(401);
    expect(res.body.ok).toBe(false);
  });
});
