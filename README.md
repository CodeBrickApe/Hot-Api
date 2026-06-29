<div align="center">
  <img alt="logo" height="120" src="./public/favicon.svg" width="120"/>
  <h2>CodeBrickApe Hot API</h2>
  <p>一个带缓存、兜底、状态监控和测试护栏的热点聚合 API</p>
</div>

## 能力

- 统一 Provider Harness：所有数据源都经过同一套超时、重试、缓存、兜底和响应规范。
- 兜底链路：fresh cache -> live fetch -> stale cache -> MongoDB snapshot -> 标准 503 空响应。
- 可切换缓存：默认内存缓存，也支持 Vercel KV / Upstash Redis REST 作为多实例共享缓存。
- 安全治理：`.env` 不再入库，`/:provider/new` 需要管理 token，日志会脱敏敏感字段。
- 可观测性：`/health`、`/status`、`/status/:provider` 暴露运行状态、健康状态和基础指标。
- 测试护栏：Vitest 覆盖核心 Harness、路由鉴权、Provider 契约和 parser golden fixtures。

## 接口

```http
GET /all
GET /health
GET /status
GET /status/:provider
GET /:provider
GET /:provider/new
GET /calendar/date?month=06&day=01
```

`/:provider/new` 会强制刷新外部数据源，必须携带管理 token：

```http
Authorization: Bearer <ADMIN_TOKEN>
```

## 数据源

当前内置：

```text
36kr, baidu, bilibili, calendar, douban_new, douyin, douyin_music,
douyin_new, genshin, ithome, juejin, kuaishou, lol, netease, newsqq,
sspai, thepaper, tianqi, tieba, toutiao, weibo, weread, zhihu
```

调用示例：

```http
GET https://example.com/bilibili
```

响应结构：

```json
{
  "code": 200,
  "message": "获取成功",
  "provider": "bilibili",
  "title": "哔哩哔哩",
  "subtitle": "热门榜",
  "from": "server",
  "stale": false,
  "total": 100,
  "updateTime": "2026-06-25T00:00:00.000Z",
  "data": []
}
```

外部 API 不可用且无任何缓存或快照时：

```json
{
  "code": 503,
  "message": "数据源暂不可用",
  "provider": "douyin",
  "title": "抖音",
  "subtitle": "热点榜",
  "from": "unavailable",
  "stale": false,
  "total": 0,
  "updateTime": null,
  "data": [],
  "error": {
    "type": "UPSTREAM_UNAVAILABLE",
    "retryAfter": 300
  }
}
```

## 配置

复制 `.env.example` 并按需配置：

```bash
cp .env.example .env
```

关键变量：

```text
PORT=6688
ALLOWED_DOMAIN=*
ADMIN_TOKEN=replace-with-a-long-random-token
BAIDU_MAP_AK=
MONGODB_URI=
MONGODB_DB=dailyhot
UPSTREAM_TIMEOUT_MS=5000
UPSTREAM_RETRIES=1
DEFAULT_PROVIDER_TTL=300
DEFAULT_PROVIDER_STALE_TTL=86400
CACHE_DRIVER=memory
CACHE_NAMESPACE=dailyhot
CACHE_REST_URL=
CACHE_REST_TOKEN=
```

不配置 `MONGODB_URI` 时会使用内存快照；配置后会写入 `provider_snapshots` 集合。

单实例部署可保持 `CACHE_DRIVER=memory`。Vercel 或多实例部署建议配置共享缓存；只要 REST URL 和 token 完整存在，系统会自动启用共享缓存，`CACHE_DRIVER=rest` 可作为显式声明：

```text
CACHE_DRIVER=rest
CACHE_REST_URL=<Vercel KV or Upstash REST URL>
CACHE_REST_TOKEN=<REST API token>
```

也可以直接使用平台默认变量名：`KV_REST_API_URL` / `KV_REST_API_TOKEN` 或 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`。

## 开发

```bash
pnpm install
pnpm dev
```

## 测试

```bash
pnpm lint
pnpm format:check
pnpm syntax
pnpm test
pnpm test:coverage
pnpm run ci
```

真实外部源 smoke test 默认不打源，避免 CI 被第三方稳定性影响。需要主动巡检时：

```bash
RUN_LIVE_SMOKE=1 pnpm test:smoke
```

每个内置 Provider 都有一份 parser fixture。新增或修复 Provider parser 时，应在 `tests/fixtures/providers` 补一份脱敏后的原始响应样本，并在 `tests/providers/fixtures.test.js` 增加 golden 断言。

## 部署

### Docker

```bash
docker build -t dailyhot-api .
docker run -p 6688:6688 --env-file .env dailyhot-api
```

### Vercel

本项目本地开发支持 Node `22-24`，Docker 和 GitHub Actions 默认使用 Node `24`。在 Vercel 项目环境变量中配置 `.env.example` 里的变量即可。

## 架构

更多设计细节见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。
