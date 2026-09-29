import { describe, expect, it } from 'vitest';
import {
  getBusinessProfileSnapshot,
  getPricingSnapshot,
  loadBusinessConfig
} from '../src/config/business.js';
import { loadEnv, redactConfig } from '../src/config/env.js';

const validEnv = { NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:27017/test?replicaSet=rs0' };

describe('configuration', () => {
  it('loads typed defaults and immutable business snapshots', () => {
    const config = loadEnv(validEnv);
    const business = loadBusinessConfig(config);
    expect(config.port).toBe(5000);
    expect(getPricingSnapshot(business).currency).toBe('EGP');
    expect(getBusinessProfileSnapshot(business).timezone).toBe('Africa/Cairo');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('rejects missing Mongo URI and redacts secrets', () => {
    expect(() => loadEnv({ NODE_ENV: 'test' })).toThrow(/MONGODB_URI/);
    const safe = redactConfig(loadEnv({ ...validEnv, DEEPSEEK_API_KEY: 'secret' }));
    expect(safe.mongo.uri).toBe('[REDACTED]');
    expect(safe.deepseek.apiKey).toBe('[REDACTED]');
  });

  it('validates CORS origins and requires explicit origins in production', () => {
    expect(loadEnv(validEnv).http.corsOrigins).toEqual(['http://localhost:3000']);
    expect(
      loadEnv({ ...validEnv, CORS_ORIGINS: 'https://shop.example.com, https://admin.example.com:443' }).http
        .corsOrigins
    ).toEqual(['https://shop.example.com', 'https://admin.example.com:443']);
    expect(() => loadEnv({ ...validEnv, CORS_ORIGINS: '*' })).toThrow(/CORS/);
    expect(() => loadEnv({ ...validEnv, CORS_ORIGINS: 'https://shop.example.com/app' })).toThrow(
      /CORS/
    );
    expect(() =>
      loadEnv({ NODE_ENV: 'production', MONGODB_URI: validEnv.MONGODB_URI })
    ).toThrow(/CORS_ORIGINS must be set explicitly/);
    expect(
      loadEnv({
        NODE_ENV: 'production',
        MONGODB_URI: validEnv.MONGODB_URI,
        CORS_ORIGINS: 'https://shop.example.com'
      }).http.corsOrigins
    ).toEqual(['https://shop.example.com']);
  });
});
