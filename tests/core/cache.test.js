const { createCache, createMemoryCache, createRestCache } = require("../../src/core/cache");

const jsonResponse = (result) =>
  Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return { result };
    },
  });

describe("cache adapters", () => {
  test("keeps the existing memory cache behavior behind the factory", async () => {
    const cache = createCache({ cacheDriver: "memory" });

    await cache.setFresh("hot:example:default", [{ title: "cached" }], 60);

    expect(cache.driver).toBe(createMemoryCache().driver);
    expect(await cache.getFresh("hot:example:default")).toEqual([{ title: "cached" }]);
  });

  test("uses Upstash/Vercel KV REST commands for shared cache storage", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      const command = JSON.parse(options.body);
      if (command[0] === "GET") {
        return jsonResponse(JSON.stringify({ value: [{ title: "remote" }] }));
      }
      return jsonResponse("OK");
    };
    const cache = createRestCache({
      url: "https://redis.example.com",
      token: "secret-token",
      namespace: "hot-api-test",
      fetchImpl,
    });

    await cache.setFresh("hot:example:default", [{ title: "remote" }], 120);
    const value = await cache.getFresh("hot:example:default");
    await cache.del("hot:example:default");

    expect(value).toEqual([{ title: "remote" }]);
    expect(calls).toHaveLength(4);
    expect(calls[0]).toMatchObject({
      url: "https://redis.example.com",
      options: {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "SET",
          "hot-api-test:fresh:hot:example:default",
          JSON.stringify({ value: [{ title: "remote" }] }),
          "EX",
          120,
        ]),
      },
    });
    expect(JSON.parse(calls[1].options.body)).toEqual([
      "GET",
      "hot-api-test:fresh:hot:example:default",
    ]);
    expect(JSON.parse(calls[2].options.body)).toEqual([
      "DEL",
      "hot-api-test:fresh:hot:example:default",
    ]);
    expect(JSON.parse(calls[3].options.body)).toEqual([
      "DEL",
      "hot-api-test:stale:hot:example:default",
    ]);
  });

  test("selects the REST cache when a REST url and token are configured", () => {
    const cache = createCache({
      cacheDriver: "rest",
      cacheRestUrl: "https://redis.example.com",
      cacheRestToken: "secret-token",
      cacheNamespace: "hot-api-test",
      fetchImpl: async () => jsonResponse(null),
    });

    expect(cache.driver).toBe("rest");
  });

  test("selects REST cache automatically when complete REST credentials are present", () => {
    const cache = createCache({
      cacheRestUrl: "https://redis.example.com",
      cacheRestToken: "secret-token",
      fetchImpl: async () => jsonResponse(null),
    });

    expect(cache.driver).toBe("rest");
  });

  test("treats REST cache outages as cache misses without breaking requests", async () => {
    const errors = [];
    const cache = createRestCache({
      url: "https://redis.example.com",
      token: "secret-token",
      namespace: "hot-api-test",
      fetchImpl: async () => {
        throw new Error("network down");
      },
      onError: (error) => errors.push(error.message),
    });

    await expect(cache.getFresh("hot:example:default")).resolves.toBeNull();
    await expect(cache.setFresh("hot:example:default", [{ title: "cached" }], 60)).resolves.toBe(
      undefined,
    );
    await expect(cache.del("hot:example:default")).resolves.toBe(undefined);
    expect(errors).toEqual(["network down", "network down", "network down", "network down"]);
  });

  test("treats malformed REST cache payloads as cache misses", async () => {
    const errors = [];
    const cache = createRestCache({
      url: "https://redis.example.com",
      token: "secret-token",
      namespace: "hot-api-test",
      fetchImpl: async () => jsonResponse("not-json"),
      onError: (error) => errors.push(error.message),
    });

    await expect(cache.getFresh("hot:example:default")).resolves.toBeNull();
    expect(errors[0]).toContain("Unexpected token");
  });
});
