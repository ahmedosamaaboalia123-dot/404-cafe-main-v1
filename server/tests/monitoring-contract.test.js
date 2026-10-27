/**
 * Phase 3 — Monitoring contract.
 *
 * A handover is only operable if the monitoring surface is stable: liveness is
 * dependency-free, readiness reports required dependencies with a retryable
 * error, optional dependencies never block readiness, and every response carries
 * a request id for correlation.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { apiBasePath: '/api/v1', http: { corsOrigins: ['https://shop.example.com'] } };
const buildInfo = {
  apiVersion: 'v1',
  schemaVersion: 1,
  build: 'monitoring',
  business: { name: '404 Coffee' }
};

function buildApp(healthProbe) {
  return createApp({ config, buildInfo, healthProbe });
}

describe('phase 3 — monitoring contract', () => {
  it('keeps liveness independent of dependency state', async () => {
    const app = buildApp(async () => {
      throw new Error('must not run');
    });
    const res = await request(app).get('/health/live').expect(200);
    expect(res.body.data.status).toBe('UP');
  });

  it('reports DOWN with a retryable error when a required dependency is down', async () => {
    const app = buildApp(async () => ({ mongodb: { status: 'DOWN', required: true } }));
    const res = await request(app).get('/health/ready').expect(503);
    expect(res.body.error.code).toBe('SERVICE_NOT_READY');
    expect(res.body.error.retryable).toBe(true);
    expect(res.body.error.details.dependencies.mongodb.status).toBe('DOWN');
  });

  it('treats optional dependencies as non-blocking', async () => {
    const app = buildApp(
      async () => ({
        mongodb: { status: 'UP', required: true },
        cache: { status: 'DOWN', required: false }
      })
    );
    const res = await request(app).get('/health/ready').expect(200);
    expect(res.body.data.status).toBe('UP');
  });

  it('is reachable without authentication', async () => {
    const app = buildApp(async () => ({ mongodb: { status: 'UP', required: true } }));
    await request(app).get('/health/ready').expect(200);
    await request(app).get('/health/live').expect(200);
  });

  it('carries a correlation id on monitoring responses', async () => {
    const app = buildApp(async () => ({ mongodb: { status: 'UP', required: true } }));
    const res = await request(app).get('/health/ready').expect(200);
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('reports a version payload safe for dashboards', async () => {
    const app = buildApp(async () => ({ mongodb: { status: 'UP', required: true } }));
    const res = await request(app).get('/system/version').expect(200);
    expect(res.body.data.apiVersion).toBe('v1');
    expect(res.body.data.business.name).toBeTruthy();
    expect(res.body.data).not.toHaveProperty('accessSecret');
  });
});
