const { ProviderError, toProviderError } = require("./errors");
const { normalizeItems } = require("./schema");

const defaultClock = () => new Date().toISOString();

const makeCacheKey = (provider, params = {}) => {
  if (provider.cacheKey) return provider.cacheKey(params);
  return `hot:${provider.id}:default`;
};

const createSuccessBody = ({ provider, from, stale, updateTime, data, warning }) => ({
  code: 200,
  message: "获取成功",
  provider: provider.id,
  title: provider.title,
  subtitle: provider.subtitle,
  from,
  stale,
  total: data.length,
  updateTime,
  ...(warning ? { warning } : {}),
  data,
});

const createUnavailableBody = ({ provider, error }) => ({
  code: 503,
  message: "数据源暂不可用",
  provider: provider.id,
  title: provider.title,
  subtitle: provider.subtitle,
  from: "unavailable",
  stale: false,
  total: 0,
  updateTime: null,
  data: [],
  error: {
    type: error.type || "UPSTREAM_UNAVAILABLE",
    retryAfter: error.retryAfter || 300,
  },
});

const createProviderErrorBody = ({ provider, error }) => ({
  code: error.status || 500,
  message: error.message,
  provider: provider.id,
  title: provider.title,
  subtitle: provider.subtitle,
  from: "error",
  stale: false,
  total: 0,
  updateTime: null,
  data: [],
  error: {
    type: error.type || "PROVIDER_ERROR",
  },
});

const normalizeCachedPayload = (cachedData) => {
  if (Array.isArray(cachedData)) {
    return {
      data: cachedData,
      updateTime: null,
    };
  }
  return cachedData;
};

const createProviderRunner = ({
  cache,
  snapshotStore,
  httpClient,
  metrics,
  logger,
  clock = defaultClock,
  config = {},
}) => {
  const failureState = new Map();

  const isCircuitOpen = (provider) => {
    const state = failureState.get(provider.id);
    return state?.openUntil && state.openUntil > Date.now();
  };

  const recordFailure = (provider, error) => {
    const current = failureState.get(provider.id) || { count: 0, openUntil: 0 };
    const count = current.count + 1;
    const openUntil =
      count >= Number(provider.circuitBreakerThreshold || config.circuitBreakerThreshold || 5)
        ? Date.now() + Number(provider.circuitBreakerMs || config.circuitBreakerMs || 5 * 60 * 1000)
        : 0;
    failureState.set(provider.id, {
      count,
      openUntil,
      lastErrorType: error.type,
      lastFailureAt: clock(),
    });
    metrics?.record(provider.id, {
      type: "failure",
      errorType: error.type,
      at: clock(),
    });
  };

  const recordSuccess = (provider, durationMs) => {
    failureState.delete(provider.id);
    metrics?.record(provider.id, {
      type: "success",
      durationMs,
      at: clock(),
    });
  };

  const fetchProvider = async (provider, context) => {
    if (provider.disabled) {
      throw new ProviderError("Provider disabled", { type: "PROVIDER_DISABLED" });
    }
    const raw = await provider.fetch(context);
    const parsed = provider.parse ? provider.parse(raw, context) : raw;
    if (!Array.isArray(parsed)) {
      throw new ProviderError("Provider parser did not return an array", {
        type: "PROVIDER_PARSE_ERROR",
      });
    }
    return provider.skipSchema ? parsed : normalizeItems(parsed);
  };

  const serveFallback = async ({ provider, cacheKey, error }) => {
    const staleData = normalizeCachedPayload(await cache.getStale(cacheKey));
    if (staleData) {
      metrics?.record(provider.id, { type: "stale-served" });
      return {
        status: 200,
        body: createSuccessBody({
          provider,
          from: "stale-cache",
          stale: true,
          updateTime: staleData.updateTime,
          data: staleData.data,
          warning: {
            type: error.type || "UPSTREAM_UNAVAILABLE",
            message: "外部数据源暂不可用，已返回最近缓存数据",
          },
        }),
      };
    }

    const snapshot = await snapshotStore.getLatestSnapshot(provider.id);
    if (snapshot) {
      metrics?.record(provider.id, { type: "snapshot-served" });
      return {
        status: 200,
        body: createSuccessBody({
          provider,
          from: "snapshot",
          stale: true,
          updateTime: snapshot.fetchedAt,
          data: snapshot.items,
          warning: {
            type: error.type || "UPSTREAM_UNAVAILABLE",
            message: "外部数据源暂不可用，已返回最近快照数据",
          },
        }),
      };
    }

    return {
      status: 503,
      body: createUnavailableBody({ provider, error }),
    };
  };

  return {
    getHealth(provider) {
      if (provider.disabled) {
        return {
          health: "disabled",
          failureCount: 0,
          circuitOpenUntil: null,
          lastErrorType: null,
          lastFailureAt: null,
        };
      }
      const state = failureState.get(provider.id);
      if (!state) {
        return {
          health: "healthy",
          failureCount: 0,
          circuitOpenUntil: null,
          lastErrorType: null,
          lastFailureAt: null,
        };
      }
      const circuitOpen = state.openUntil && state.openUntil > Date.now();
      return {
        health: circuitOpen ? "circuit_open" : "degraded",
        failureCount: state.count,
        circuitOpenUntil: circuitOpen ? new Date(state.openUntil).toISOString() : null,
        lastErrorType: state.lastErrorType || null,
        lastFailureAt: state.lastFailureAt || null,
      };
    },
    async run(provider, options = {}) {
      let resolvedParams;
      try {
        resolvedParams = provider.resolveParams
          ? await provider.resolveParams({
              ...options,
              config,
              httpClient,
              cache,
            })
          : options.params || {};
      } catch (caught) {
        const error = toProviderError(caught);
        if (error.status < 500) {
          return {
            status: error.status,
            body: createProviderErrorBody({ provider, error }),
          };
        }
        return {
          status: 503,
          body: createUnavailableBody({ provider, error }),
        };
      }
      const cacheKey = makeCacheKey(provider, resolvedParams);
      const context = {
        ...options,
        params: resolvedParams,
        config,
        cache,
        httpClient,
        logger,
      };

      if (!options.forceRefresh) {
        const cachedData = normalizeCachedPayload(await cache.getFresh(cacheKey));
        if (cachedData) {
          metrics?.record(provider.id, { type: "cache-hit" });
          return {
            status: 200,
            body: createSuccessBody({
              provider,
              from: "cache",
              stale: false,
              updateTime: cachedData.updateTime,
              data: cachedData.data,
            }),
          };
        }
      }

      if (isCircuitOpen(provider)) {
        const error = new ProviderError("Provider circuit is open", {
          type: "PROVIDER_CIRCUIT_OPEN",
          retryAfter: 300,
        });
        metrics?.record(provider.id, { type: "circuit-open" });
        return serveFallback({ provider, cacheKey, error });
      }

      const startedAt = Date.now();
      try {
        const data = await fetchProvider(provider, context);
        const updateTime = clock();
        const payload = { data, updateTime };
        await cache.setFresh(cacheKey, payload, Number(provider.ttl || config.defaultTtl || 300));
        await cache.setStale(
          cacheKey,
          payload,
          Number(provider.staleTtl || config.defaultStaleTtl || 86400),
        );
        await snapshotStore.saveSnapshot({
          providerId: provider.id,
          items: data,
          fetchedAt: updateTime,
          success: true,
          durationMs: Date.now() - startedAt,
        });
        recordSuccess(provider, Date.now() - startedAt);
        return {
          status: 200,
          body: createSuccessBody({
            provider,
            from: "server",
            stale: false,
            updateTime,
            data,
          }),
        };
      } catch (caught) {
        const error = toProviderError(caught);
        recordFailure(provider, error);
        logger?.warn(
          {
            provider: provider.id,
            errorType: error.type,
            message: error.message,
          },
          "provider fetch failed",
        );
        return serveFallback({ provider, cacheKey, error });
      }
    },
  };
};

module.exports = {
  createProviderRunner,
};
