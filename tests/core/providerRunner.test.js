const { createMemoryCache } = require("../../src/core/cache");
const { ProviderError } = require("../../src/core/errors");
const { createProviderRunner } = require("../../src/core/providerRunner");

const createStore = () => {
  const snapshots = [];
  return {
    snapshots,
    async saveSnapshot(snapshot) {
      snapshots.push(snapshot);
    },
    async getLatestSnapshot(providerId) {
      return [...snapshots].reverse().find((snapshot) => snapshot.providerId === providerId);
    },
  };
};

const createProvider = (overrides = {}) => ({
  id: "example",
  title: "示例",
  subtitle: "热榜",
  ttl: 60,
  staleTtl: 86400,
  async fetch() {
    return { items: [{ title: "live item", url: "https://example.com/live" }] };
  },
  parse(raw) {
    return raw.items;
  },
  ...overrides,
});

describe("providerRunner", () => {
  test("returns fresh cache without calling the upstream provider", async () => {
    const cache = createMemoryCache();
    const store = createStore();
    const provider = createProvider({
      fetch: async () => {
        throw new Error("should not fetch");
      },
    });
    await cache.setFresh("hot:example:default", [{ title: "cached item" }], 60);

    const runner = createProviderRunner({ cache, snapshotStore: store });
    const result = await runner.run(provider);

    expect(result.status).toBe(200);
    expect(result.body.from).toBe("cache");
    expect(result.body.stale).toBe(false);
    expect(result.body.data).toEqual([{ title: "cached item" }]);
  });

  test("serves stale cache when the upstream provider fails", async () => {
    const cache = createMemoryCache();
    const store = createStore();
    const provider = createProvider({
      fetch: async () => {
        throw new Error("upstream timeout");
      },
    });
    await cache.setStale("hot:example:default", [{ title: "stale item" }], 86400);

    const runner = createProviderRunner({ cache, snapshotStore: store });
    const result = await runner.run(provider);

    expect(result.status).toBe(200);
    expect(result.body.from).toBe("stale-cache");
    expect(result.body.stale).toBe(true);
    expect(result.body.warning.type).toBe("UPSTREAM_UNAVAILABLE");
    expect(result.body.data).toEqual([{ title: "stale item" }]);
  });

  test("falls back to the latest snapshot when cache is empty and upstream fails", async () => {
    const cache = createMemoryCache();
    const store = createStore();
    await store.saveSnapshot({
      providerId: "example",
      items: [{ title: "snapshot item" }],
      fetchedAt: "2026-06-25T00:00:00.000Z",
      success: true,
    });
    const provider = createProvider({
      fetch: async () => {
        throw new Error("upstream unavailable");
      },
    });

    const runner = createProviderRunner({ cache, snapshotStore: store });
    const result = await runner.run(provider);

    expect(result.status).toBe(200);
    expect(result.body.from).toBe("snapshot");
    expect(result.body.stale).toBe(true);
    expect(result.body.updateTime).toBe("2026-06-25T00:00:00.000Z");
    expect(result.body.data).toEqual([{ title: "snapshot item" }]);
  });

  test("returns a stable unavailable response when no fallback exists", async () => {
    const cache = createMemoryCache();
    const store = createStore();
    const provider = createProvider({
      fetch: async () => {
        throw new Error("upstream unavailable");
      },
    });

    const runner = createProviderRunner({ cache, snapshotStore: store });
    const result = await runner.run(provider);

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({
      code: 503,
      provider: "example",
      from: "unavailable",
      stale: false,
      total: 0,
      data: [],
      error: {
        type: "UPSTREAM_UNAVAILABLE",
        retryAfter: 300,
      },
    });
  });

  test("returns provider client errors without attempting fallback", async () => {
    const cache = createMemoryCache();
    const store = createStore();
    const provider = createProvider({
      resolveParams() {
        throw new ProviderError("参数格式错误", { type: "BAD_REQUEST", status: 400 });
      },
    });

    const runner = createProviderRunner({ cache, snapshotStore: store });
    const result = await runner.run(provider);

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      code: 400,
      message: "参数格式错误",
      provider: "example",
      error: {
        type: "BAD_REQUEST",
      },
    });
  });
});
