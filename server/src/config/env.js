import 'dotenv/config';
import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');
// Every entry must be a bare http(s) origin (host + optional port, no path).
// '*' is never accepted: with an explicit allowlist a misconfiguration fails
// loudly instead of silently opening the API to every website.
const corsOrigins = z
  .string()
  .default('http://localhost:3000')
  .superRefine((value, ctx) => {
    for (const part of value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)) {
      if (!/^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(part))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `CORS origin must be a bare http(s) origin without path or wildcard: ${part}`
        });
    }
  });
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  API_BASE_PATH: z
    .string()
    .regex(/^\/[a-z0-9/-]+$/)
    .default('/api/v1'),
  MONGODB_URI: z.string().min(1),
  MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(5000),
  HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(1000),
  HTTP_SHUTDOWN_GRACE_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  CORS_ORIGINS: corsOrigins,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  BUSINESS_TIMEZONE: z.string().default('Africa/Cairo'),
  BUSINESS_CURRENCY: z.string().length(3).default('EGP'),
  BUSINESS_NAME: z.string().min(1).default('404 Coffee'),
  BUSINESS_ADDRESS: z.string().default(''),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0),
  SERVICE_RATE: z.coerce.number().min(0).max(1).default(0),
  DELIVERY_FEE: z.coerce.number().min(0).default(0),
  DEEPSEEK_API_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_API_KEY: z.string().default(''),
  DEEPSEEK_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(8000),
  MEDIA_STORAGE_DIR: z.string().min(1).default('./uploads'),
  MEDIA_URL_SECRET: z.string().min(32).default('development-media-secret-change-me-32'),
  CLOUDINARY_CLOUD_NAME: z.string().trim().default(''),
  CLOUDINARY_API_KEY: z.string().trim().default(''),
  CLOUDINARY_API_SECRET: z.string().trim().default(''),
  CLOUDINARY_FOLDER: z.string().trim().default('products'),
  ENABLE_WORKERS: booleanString.default('true'),
  AUTH_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-32'),
  AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  AUTH_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30)
});

export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration: ${details.join('; ')}`);
  }
  // The localhost default is a development convenience. In production an
  // explicit origin list is required so the API is never exposed to the wrong
  // website (or to no website) by accident.
  if (result.data.NODE_ENV === 'production' && source.CORS_ORIGINS === undefined)
    throw new Error(
      'Invalid environment configuration: CORS_ORIGINS must be set explicitly in production'
    );
  return Object.freeze({
    environment: result.data.NODE_ENV,
    port: result.data.PORT,
    apiBasePath: result.data.API_BASE_PATH,
    mongo: Object.freeze({
      uri: result.data.MONGODB_URI,
      connectTimeoutMs: result.data.MONGODB_CONNECT_TIMEOUT_MS
    }),
    http: Object.freeze({
      requestTimeoutMs: result.data.HTTP_REQUEST_TIMEOUT_MS,
      shutdownGraceMs: result.data.HTTP_SHUTDOWN_GRACE_MS,
      corsOrigins: result.data.CORS_ORIGINS.split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    }),
    logLevel: result.data.LOG_LEVEL,
    business: Object.freeze({
      timezone: result.data.BUSINESS_TIMEZONE,
      currency: result.data.BUSINESS_CURRENCY.toUpperCase(),
      name: result.data.BUSINESS_NAME,
      address: result.data.BUSINESS_ADDRESS,
      taxRate: String(result.data.TAX_RATE),
      serviceRate: String(result.data.SERVICE_RATE),
      deliveryFee: String(result.data.DELIVERY_FEE)
    }),
    deepseek: Object.freeze({
      apiUrl: result.data.DEEPSEEK_API_URL,
      apiKey: result.data.DEEPSEEK_API_KEY,
      timeoutMs: result.data.DEEPSEEK_TIMEOUT_MS
    }),
    media: Object.freeze({
      storageDir: result.data.MEDIA_STORAGE_DIR,
      urlSecret: result.data.MEDIA_URL_SECRET
    }),
    cloudinary: Object.freeze({
      cloudName: result.data.CLOUDINARY_CLOUD_NAME,
      apiKey: result.data.CLOUDINARY_API_KEY,
      apiSecret: result.data.CLOUDINARY_API_SECRET,
      folder: result.data.CLOUDINARY_FOLDER
    }),
    auth: Object.freeze({
      accessSecret: result.data.AUTH_ACCESS_SECRET,
      accessTtlSeconds: result.data.AUTH_ACCESS_TTL_SECONDS,
      refreshTtlDays: result.data.AUTH_REFRESH_TTL_DAYS
    }),
    workersEnabled: result.data.ENABLE_WORKERS
  });
}

export function redactConfig(config) {
  return {
    ...config,
    mongo: { ...config.mongo, uri: '[REDACTED]' },
    deepseek: { ...config.deepseek, apiKey: config.deepseek.apiKey ? '[REDACTED]' : '' },
    media: { ...config.media, urlSecret: config.media.urlSecret ? '[REDACTED]' : '' },
    cloudinary: {
      ...config.cloudinary,
      apiKey: config.cloudinary.apiKey ? '[REDACTED]' : '',
      apiSecret: config.cloudinary.apiSecret ? '[REDACTED]' : ''
    },
    auth: { ...config.auth, accessSecret: '[REDACTED]' }
  };
}
