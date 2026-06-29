const { loadConfig } = require("../../src/config/env");

describe("environment configuration", () => {
  test("loads explicit REST cache configuration", () => {
    const config = loadConfig({
      CACHE_DRIVER: "rest",
      CACHE_NAMESPACE: "hot-api-test",
      CACHE_REST_URL: "https://redis.example.com",
      CACHE_REST_TOKEN: "secret-token",
    });

    expect(config).toMatchObject({
      cacheDriver: "rest",
      cacheNamespace: "hot-api-test",
      cacheRestUrl: "https://redis.example.com",
      cacheRestToken: "secret-token",
    });
  });

  test("accepts Vercel KV compatible REST aliases", () => {
    const config = loadConfig({
      CACHE_DRIVER: "rest",
      KV_REST_API_URL: "https://vercel-kv.example.com",
      KV_REST_API_TOKEN: "vercel-token",
    });

    expect(config).toMatchObject({
      cacheDriver: "rest",
      cacheRestUrl: "https://vercel-kv.example.com",
      cacheRestToken: "vercel-token",
    });
  });

  test("accepts Upstash Redis REST aliases", () => {
    const config = loadConfig({
      CACHE_DRIVER: "rest",
      UPSTASH_REDIS_REST_URL: "https://upstash.example.com",
      UPSTASH_REDIS_REST_TOKEN: "upstash-token",
    });

    expect(config).toMatchObject({
      cacheDriver: "rest",
      cacheRestUrl: "https://upstash.example.com",
      cacheRestToken: "upstash-token",
    });
  });
});
