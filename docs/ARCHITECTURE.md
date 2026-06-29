# Hot API Architecture

## Goal

The project is now structured around a provider harness. Providers describe how to fetch and parse one upstream source; the harness owns operational concerns such as cache, fallback, metrics, rate limits, and consistent API responses.

## Request Flow

```text
HTTP request
  -> Koa app
  -> universal provider route
  -> providerRunner
  -> fresh cache
  -> upstream fetch
  -> parser + schema validation
  -> fresh/stale cache + snapshot
  -> response
```

When upstream fetch fails:

```text
upstream failure
  -> stale cache
  -> latest MongoDB snapshot
  -> stable 503 unavailable response
```

## Provider Contract

Each provider lives in `src/providers/<provider-id>.js` and must export:

```js
{
  id: "bilibili",
  title: "哔哩哔哩",
  subtitle: "热门榜",
  ttl: 300,
  staleTtl: 86400,
  fetch: async ({ httpClient, cache, config }) => raw,
  parse: (raw, context) => items
}
```

Provider IDs are public API paths, so changing an ID is a breaking change.

`src/providers/index.js` only aggregates provider modules. Keep parser/fetch changes inside the individual provider file so unrelated sources do not conflict with one another.

## Cache Layers

- Fresh cache: normal hot-path response cache.
- Stale cache: longer-lived fallback cache for upstream failure.
- Snapshot store: MongoDB when configured, in-memory otherwise.

The cache interface is intentionally small:

```js
{
  (getFresh, setFresh, getStale, setStale, del, clear);
}
```

`src/core/cache.js` provides two adapters:

- `memory`: default for local development and single-process deployments.
- `rest`: shared cache over Redis-compatible REST APIs such as Vercel KV or Upstash Redis.

When a REST URL and token are both configured, the cache factory selects the REST adapter automatically. `CACHE_DRIVER=rest` remains useful as operational documentation, but it is not required when platform aliases such as `KV_REST_API_URL` and `KV_REST_API_TOKEN` are present.

REST cache failures are treated as cache misses and failed writes/deletes are swallowed after logging. The provider fallback chain must remain available even when the shared cache provider is degraded.

Cache keys are provider-aware and parameter-aware, for example:

```text
hot:bilibili:default
hot:calendar:06-01
hot:tianqi:310000
```

## Security

- `.env` is ignored by git.
- `/:provider/new` requires `ADMIN_TOKEN`.
- CORS is allow-list based.
- Logs redact tokens, cookies, secrets, and API keys.
- Legacy route files were removed to prevent stale hardcoded secrets from remaining in the code path.

## Tests

- `tests/core`: harness behavior.
- `tests/integration`: route behavior without opening a network port.
- `tests/contracts`: provider catalog and security contracts.
- `tests/providers`: parser golden fixtures using static upstream samples.
- `tests/smoke`: opt-in live upstream checks.

The provider catalog contract also requires one module per provider. This keeps future upstream fixes small and reviewable.

When a third-party response shape changes, update the provider parser together with a sanitized fixture under `tests/fixtures/providers`. This makes parser changes reviewable without depending on live upstream availability.

The fixture suite intentionally covers every public provider ID. If a new provider is added without a golden fixture, the contract fails before the source can ship unprotected.
