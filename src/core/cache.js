const createBucket = () => new Map();

const isAlive = (entry) => entry && entry.expiresAt > Date.now();

const positiveTtl = (ttlSeconds) => Math.max(1, Number(ttlSeconds) || 1);

const createMemoryCache = () => {
  const fresh = createBucket();
  const stale = createBucket();

  const set = async (bucket, key, value, ttlSeconds) => {
    bucket.set(key, {
      value,
      expiresAt: Date.now() + positiveTtl(ttlSeconds) * 1000,
    });
  };

  const get = async (bucket, key) => {
    const entry = bucket.get(key);
    if (!isAlive(entry)) {
      bucket.delete(key);
      return null;
    }
    return entry.value;
  };

  return {
    driver: "memory",
    async getFresh(key) {
      return get(fresh, key);
    },
    async setFresh(key, value, ttlSeconds) {
      return set(fresh, key, value, ttlSeconds);
    },
    async getStale(key) {
      return get(stale, key);
    },
    async setStale(key, value, ttlSeconds) {
      return set(stale, key, value, ttlSeconds);
    },
    async del(key) {
      fresh.delete(key);
      stale.delete(key);
    },
    async clear() {
      fresh.clear();
      stale.clear();
    },
  };
};

const defaultFetch = (...args) => fetch(...args);

const parseCacheValue = (value) => {
  if (value == null) return null;
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return Object.prototype.hasOwnProperty.call(parsed, "value") ? parsed.value : parsed;
};

const createRestCache = ({
  url,
  token,
  namespace = "dailyhot",
  fetchImpl = defaultFetch,
  onError,
  logger,
} = {}) => {
  const normalizedUrl = String(url || "").replace(/\/+$/, "");
  const normalizedNamespace = String(namespace || "dailyhot").replace(/:+$/, "");

  const reportError = (error, command) => {
    try {
      if (onError) {
        onError(error, command);
        return;
      }
      logger?.warn?.(
        {
          errorType: error.name,
          message: error.message,
          command: command?.[0],
        },
        "cache command failed",
      );
    } catch {
      // Cache telemetry must never break request handling.
    }
  };

  const redisKey = (bucket, key) => `${normalizedNamespace}:${bucket}:${key}`;

  const command = async (args, fallback = null) => {
    try {
      const response = await fetchImpl(normalizedUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      if (!response.ok) {
        throw new Error(`Cache REST command failed with status ${response.status}`);
      }
      const payload = await response.json();
      if (payload?.error) {
        throw new Error(String(payload.error));
      }
      return payload?.result ?? null;
    } catch (error) {
      reportError(error, args);
      return fallback;
    }
  };

  const get = async (bucket, key) => {
    const args = ["GET", redisKey(bucket, key)];
    const result = await command(args, null);
    try {
      return parseCacheValue(result);
    } catch (error) {
      reportError(error, args);
      return null;
    }
  };

  const set = async (bucket, key, value, ttlSeconds) => {
    await command([
      "SET",
      redisKey(bucket, key),
      JSON.stringify({ value }),
      "EX",
      positiveTtl(ttlSeconds),
    ]);
  };

  return {
    driver: "rest",
    namespace: normalizedNamespace,
    async getFresh(key) {
      return get("fresh", key);
    },
    async setFresh(key, value, ttlSeconds) {
      return set("fresh", key, value, ttlSeconds);
    },
    async getStale(key) {
      return get("stale", key);
    },
    async setStale(key, value, ttlSeconds) {
      return set("stale", key, value, ttlSeconds);
    },
    async del(key) {
      await command(["DEL", redisKey("fresh", key)]);
      await command(["DEL", redisKey("stale", key)]);
    },
    async clear() {
      // Shared REST caches do not expose a safe namespace-only clear operation.
    },
  };
};

const createCache = (config = {}) => {
  const driver = String(config.cacheDriver || "memory").toLowerCase();
  const shouldUseRest = driver === "rest" || driver === "kv";
  const hasRestCredentials = Boolean(config.cacheRestUrl && config.cacheRestToken);

  if ((shouldUseRest || hasRestCredentials) && hasRestCredentials) {
    return createRestCache({
      url: config.cacheRestUrl,
      token: config.cacheRestToken,
      namespace: config.cacheNamespace,
      fetchImpl: config.fetchImpl,
      logger: config.logger,
      onError: config.onError,
    });
  }

  return createMemoryCache();
};

module.exports = {
  createCache,
  createMemoryCache,
  createRestCache,
};
