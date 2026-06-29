const { z } = require("zod");

const csv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(6688),
  ALLOWED_DOMAIN: z.string().default("*"),
  ADMIN_TOKEN: z.string().optional().default(""),
  BAIDU_MAP_AK: z.string().optional().default(""),
  MONGODB_URI: z.string().optional().default(""),
  MONGODB_DB: z.string().optional().default("dailyhot"),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  UPSTREAM_RETRIES: z.coerce.number().int().min(0).default(1),
  DEFAULT_PROVIDER_TTL: z.coerce.number().int().positive().default(300),
  DEFAULT_PROVIDER_STALE_TTL: z.coerce.number().int().positive().default(86400),
  CACHE_DRIVER: z.string().default("memory"),
  CACHE_NAMESPACE: z.string().default("dailyhot"),
  CACHE_REST_URL: z.string().optional().default(""),
  CACHE_REST_TOKEN: z.string().optional().default(""),
  KV_REST_API_URL: z.string().optional().default(""),
  KV_REST_API_TOKEN: z.string().optional().default(""),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),
  REFRESH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

const loadConfig = (overrides = {}) => {
  const env = envSchema.parse({ ...process.env, ...overrides });
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    allowedDomains: csv(env.ALLOWED_DOMAIN),
    adminToken: env.ADMIN_TOKEN,
    baiduMapAk: env.BAIDU_MAP_AK,
    mongodbUri: env.MONGODB_URI,
    mongodbDb: env.MONGODB_DB,
    upstreamTimeoutMs: env.UPSTREAM_TIMEOUT_MS,
    upstreamRetries: env.UPSTREAM_RETRIES,
    defaultTtl: env.DEFAULT_PROVIDER_TTL,
    defaultStaleTtl: env.DEFAULT_PROVIDER_STALE_TTL,
    cacheDriver: env.CACHE_DRIVER,
    cacheNamespace: env.CACHE_NAMESPACE,
    cacheRestUrl: env.CACHE_REST_URL || env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL,
    cacheRestToken: env.CACHE_REST_TOKEN || env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN,
    refreshRateLimitWindowMs: env.REFRESH_RATE_LIMIT_WINDOW_MS,
    refreshRateLimitMax: env.REFRESH_RATE_LIMIT_MAX,
    circuitBreakerThreshold: 5,
    circuitBreakerMs: 5 * 60 * 1000,
  };
};

module.exports = {
  loadConfig,
};
