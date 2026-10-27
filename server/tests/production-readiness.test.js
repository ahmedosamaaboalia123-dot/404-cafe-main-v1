/**
 * Phase 2 — Production hardening gates (server configuration).
 *
 * These tests encode the configuration a production deployment must satisfy
 * before it can be handed to a client. Items that are not implemented yet are
 * intentional gates: they fail until the corresponding hardening is shipped.
 */
import { describe, expect, it } from 'vitest';
import { loadEnv, redactConfig } from '../src/config/env.js';

const mongo = 'mongodb://127.0.0.1:27017/test?replicaSet=rs0';
const prodBase = { NODE_ENV: 'production', MONGODB_URI: mongo };

describe('phase 2 — production env contract', () => {
  it('requires an explicit CORS allowlist in production', () => {
    expect(() => loadEnv(prodBase)).toThrow(/CORS_ORIGINS must be set explicitly/);
  });

  it('accepts only bare http(s) origins and rejects wildcards and paths', () => {
    expect(() => loadEnv({ ...prodBase, CORS_ORIGINS: '*' })).toThrow(/CORS/);
    expect(() => loadEnv({ ...prodBase, CORS_ORIGINS: 'https://x.com/app' })).toThrow(/CORS/);
    const cfg = loadEnv({ ...prodBase, CORS_ORIGINS: 'https://shop.example.com:443' });
    expect(cfg.http.corsOrigins).toEqual(['https://shop.example.com:443']);
  });

  it('enforces safe access and refresh token TTL bounds', () => {
    const cfg = loadEnv({
      ...prodBase,
      CORS_ORIGINS: 'https://x.com',
      AUTH_ACCESS_TTL_SECONDS: '900',
      AUTH_REFRESH_TTL_DAYS: '30'
    });
    expect(cfg.auth.accessTtlSeconds).toBe(900);
    expect(cfg.auth.refreshTtlDays).toBe(30);
    expect(() =>
      loadEnv({ ...prodBase, CORS_ORIGINS: 'https://x.com', AUTH_ACCESS_TTL_SECONDS: '10' })
    ).toThrow(/AUTH_ACCESS_TTL_SECONDS/);
    expect(() =>
      loadEnv({ ...prodBase, CORS_ORIGINS: 'https://x.com', AUTH_REFRESH_TTL_DAYS: '500' })
    ).toThrow(/AUTH_REFRESH_TTL_DAYS/);
  });

  it('redacts every secret from the safe config', () => {
    const safe = redactConfig(
      loadEnv({
        ...prodBase,
        CORS_ORIGINS: 'https://x.com',
        AUTH_ACCESS_SECRET: 'a'.repeat(40),
        DEEPSEEK_API_KEY: 'k',
        CLOUDINARY_API_SECRET: 's',
        MEDIA_URL_SECRET: 'm'.repeat(40)
      })
    );
    expect(safe.auth.accessSecret).toBe('[REDACTED]');
    expect(safe.mongo.uri).toBe('[REDACTED]');
    expect(safe.deepseek.apiKey).toBe('[REDACTED]');
    expect(safe.cloudinary.apiSecret).toBe('[REDACTED]');
    expect(safe.media.urlSecret).toBe('[REDACTED]');
  });

  // GATE: the committed development placeholder must never be a valid
  // production secret. Currently loadEnv accepts it, so this gate fails and
  // will pass once placeholder rejection is implemented.
  it('rejects the development placeholder access secret in production', () => {
    expect(() =>
      loadEnv({
        ...prodBase,
        CORS_ORIGINS: 'https://x.com',
        AUTH_ACCESS_SECRET: 'development-access-secret-change-me-32'
      })
    ).toThrow(/AUTH_ACCESS_SECRET/);
  });

  it('rejects the development placeholder media secret in production', () => {
    expect(() =>
      loadEnv({
        ...prodBase,
        CORS_ORIGINS: 'https://x.com',
        MEDIA_URL_SECRET: 'development-media-secret-change-me-32'
      })
    ).toThrow(/MEDIA_URL_SECRET/);
  });
});
