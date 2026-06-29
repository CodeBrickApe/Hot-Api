const fs = require("fs");
const path = require("path");
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const cors = require("koa2-cors");
const serve = require("koa-static");

const { loadConfig } = require("./config/env");
const { createCache } = require("./core/cache");
const { createHttpClient } = require("./core/httpClient");
const { logger } = require("./core/logger");
const { createMetrics } = require("./core/metrics");
const { createProviderRunner } = require("./core/providerRunner");
const { createHotRouter } = require("./routes/hot");
const { createMongoSnapshotStore } = require("./storage/mongo");
const { createMemorySnapshotStore } = require("./storage/snapshots");
const defaultProviders = require("./providers");

const publicDir = path.join(__dirname, "..", "public");
const renderHtml = (ctx, filename) => {
  ctx.type = "html";
  ctx.body = fs.readFileSync(path.join(publicDir, filename), "utf8");
};

const isAllowedOrigin = (origin, allowedDomains) => {
  if (!origin || allowedDomains.includes("*")) return true;
  return allowedDomains.includes(origin);
};

const createApp = (options = {}) => {
  const config = { ...loadConfig(options.config), ...(options.config || {}) };
  const providers = options.providers || defaultProviders;
  const appLogger = options.logger || logger;
  const cache = options.cache || createCache({ ...config, logger: appLogger });
  const snapshotStore =
    options.snapshotStore ||
    createMongoSnapshotStore({ uri: config.mongodbUri, dbName: config.mongodbDb }) ||
    createMemorySnapshotStore();
  const metrics = options.metrics || createMetrics();
  const httpClient =
    options.httpClient ||
    createHttpClient({
      timeout: config.upstreamTimeoutMs,
      retries: config.upstreamRetries,
    });
  const runner =
    options.runner ||
    createProviderRunner({
      cache,
      snapshotStore,
      httpClient,
      metrics,
      logger: appLogger,
      config,
    });

  const app = new Koa();
  app.proxy = true;
  app.context.state = {
    cache,
    snapshotStore,
    metrics,
    providers,
  };

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      appLogger.error?.(
        {
          errorType: error.name,
          message: error.message,
        },
        "unhandled request error",
      );
      ctx.status = error.status || 500;
      ctx.body = {
        code: ctx.status,
        message: ctx.status >= 500 ? "服务暂不可用" : error.message,
      };
    }
  });

  app.use(
    cors({
      origin: (ctx) => {
        const origin = ctx.get("origin");
        return isAllowedOrigin(origin, config.allowedDomains) ? origin || "*" : "";
      },
      credentials: false,
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "X-Admin-Token"],
    }),
  );

  app.use(async (ctx, next) => {
    const origin = ctx.get("origin");
    if (!isAllowedOrigin(origin, config.allowedDomains)) {
      ctx.status = 403;
      ctx.body = { code: 403, message: "请通过正确的域名访问" };
      return;
    }
    await next();
  });

  app.use(async (ctx, next) => {
    ctx.set("X-Content-Type-Options", "nosniff");
    ctx.set("Referrer-Policy", "no-referrer");
    ctx.set("X-Frame-Options", "DENY");
    await next();
  });

  app.use(async (ctx, next) => {
    if (ctx.path === "/") {
      renderHtml(ctx, "index.html");
      return;
    }
    await next();
  });

  app.use(bodyParser());
  app.use(serve(publicDir));

  const router = createHotRouter({ providers, runner, metrics, config });
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.use(async (ctx) => {
    ctx.status = 404;
    if (ctx.accepts("html") && fs.existsSync(path.join(publicDir, "404.html"))) {
      renderHtml(ctx, "404.html");
      return;
    }
    ctx.body = { code: 404, message: "接口不存在" };
  });

  return app;
};

module.exports = {
  createApp,
};
