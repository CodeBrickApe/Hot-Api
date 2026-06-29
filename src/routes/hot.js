const Router = require("koa-router");
const { createRateLimiter } = require("../core/rateLimit");

const normalizeToken = (value = "") => value.replace(/^Bearer\s+/i, "").trim();

const isAuthorized = (ctx, adminToken) => {
  const token = normalizeToken(ctx.get("authorization")) || ctx.get("x-admin-token");
  return Boolean(adminToken && token === adminToken);
};

const createHotRouter = ({ providers, runner, metrics, config }) => {
  const router = new Router();
  const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
  const refreshLimiter = createRateLimiter({
    windowMs: config.refreshRateLimitWindowMs,
    max: config.refreshRateLimitMax,
  });

  const runProvider = async (ctx, provider, options = {}) => {
    const result = await runner.run(provider, {
      forceRefresh: Boolean(options.forceRefresh),
      params: ctx.params,
      query: ctx.query,
      request: ctx.request,
      ctx,
    });
    ctx.status = result.status;
    ctx.body = result.body;
  };

  const providerHealth = (provider) =>
    typeof runner.getHealth === "function"
      ? runner.getHealth(provider)
      : {
          health: provider.disabled ? "disabled" : "unknown",
          failureCount: null,
          circuitOpenUntil: null,
          lastErrorType: null,
          lastFailureAt: null,
        };

  router.get("/all", async (ctx) => {
    const data = providers.map((provider) => ({
      name: provider.id,
      provider: provider.id,
      title: provider.title,
      subtitle: provider.subtitle,
      ttl: provider.ttl || config.defaultTtl,
      staleTtl: provider.staleTtl || config.defaultStaleTtl,
      status: providerHealth(provider).health,
      routes: [`/${provider.id}`, `/${provider.id}/new`],
    }));
    ctx.body = {
      code: 200,
      message: "获取成功",
      name: "全部接口",
      subtitle: "除了特殊接口外的全部接口列表",
      total: data.length,
      data,
    };
  });

  router.get("/health", async (ctx) => {
    ctx.body = {
      code: 200,
      message: "ok",
      uptime: process.uptime(),
      providers: providers.length,
    };
  });

  router.get("/status", async (ctx) => {
    ctx.body = {
      code: 200,
      message: "获取成功",
      providers: providers.map((provider) => ({
        id: provider.id,
        title: provider.title,
        subtitle: provider.subtitle,
        disabled: Boolean(provider.disabled),
        ...providerHealth(provider),
      })),
      metrics: metrics.snapshot(),
    };
  });

  router.get("/status/:provider", async (ctx) => {
    const provider = providerMap.get(ctx.params.provider);
    if (!provider) {
      ctx.status = 404;
      ctx.body = { code: 404, message: "接口不存在" };
      return;
    }
    ctx.body = {
      code: 200,
      message: "获取成功",
      provider: {
        id: provider.id,
        title: provider.title,
        subtitle: provider.subtitle,
        disabled: Boolean(provider.disabled),
        ...providerHealth(provider),
      },
      metrics: metrics.snapshot().find((item) => item.providerId === provider.id) || null,
    };
  });

  router.get("/calendar/date", async (ctx) => {
    const provider = providerMap.get("calendar");
    if (!provider) {
      ctx.status = 404;
      ctx.body = { code: 404, message: "接口不存在" };
      return;
    }
    await runProvider(ctx, provider);
  });

  router.get("/:provider", async (ctx) => {
    const provider = providerMap.get(ctx.params.provider);
    if (!provider) {
      ctx.status = 404;
      ctx.body = { code: 404, message: "接口不存在" };
      return;
    }
    await runProvider(ctx, provider);
  });

  router.get("/:provider/new", async (ctx) => {
    const provider = providerMap.get(ctx.params.provider);
    if (!provider) {
      ctx.status = 404;
      ctx.body = { code: 404, message: "接口不存在" };
      return;
    }

    const rate = refreshLimiter(`${ctx.ip}:${provider.id}`);
    if (!rate.allowed) {
      ctx.status = 429;
      ctx.set("Retry-After", String(Math.ceil((rate.resetAt - Date.now()) / 1000)));
      ctx.body = { code: 429, message: "请求过于频繁" };
      return;
    }

    if (!isAuthorized(ctx, config.adminToken)) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: "需要管理权限",
      };
      return;
    }

    await runProvider(ctx, provider, { forceRefresh: true });
  });

  return router;
};

module.exports = {
  createHotRouter,
};
