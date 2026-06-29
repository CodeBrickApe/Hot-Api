const { Readable, Writable } = require("stream");

const { createApp } = require("../../src/app");

const silentLogger = {
  warn() {},
  error() {},
};

const provider = {
  id: "example",
  title: "示例",
  subtitle: "热榜",
  ttl: 60,
  staleTtl: 3600,
  async fetch() {
    return { items: [{ title: "live item", url: "https://example.com/live" }] };
  },
  parse(raw) {
    return raw.items;
  },
};

describe("hot routes", () => {
  const inject = async (app, { method = "GET", url, headers = {} }) => {
    const req = new Readable({
      read() {
        this.push(null);
      },
    });
    req.method = method;
    req.url = url;
    req.headers = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    );
    req.socket = { remoteAddress: "127.0.0.1", encrypted: false };
    req.connection = req.socket;

    const chunks = [];
    let finished = false;
    const responseHeaders = {};
    const res = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    res.statusCode = 404;
    res.setHeader = (name, value) => {
      responseHeaders[name.toLowerCase()] = value;
    };
    res.getHeader = (name) => responseHeaders[name.toLowerCase()];
    res.getHeaders = () => responseHeaders;
    res.removeHeader = (name) => {
      delete responseHeaders[name.toLowerCase()];
    };
    res.writeHead = (statusCode, reasonOrHeaders, maybeHeaders) => {
      res.statusCode = statusCode;
      const head = typeof reasonOrHeaders === "object" ? reasonOrHeaders : maybeHeaders;
      Object.entries(head || {}).forEach(([name, value]) => res.setHeader(name, value));
    };
    Object.defineProperty(res, "headersSent", {
      get() {
        return finished;
      },
    });

    const done = new Promise((resolve, reject) => {
      res.on("finish", resolve);
      res.on("error", reject);
    });
    const originalEnd = res.end.bind(res);
    res.end = (chunk, encoding, callback) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      finished = true;
      return originalEnd(null, null, callback);
    };

    app.callback()(req, res);
    await done;

    const text = Buffer.concat(chunks).toString("utf8");
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    return {
      status: res.statusCode,
      headers: responseHeaders,
      text,
      body,
    };
  };

  test("serves the landing page as static html", async () => {
    const app = createApp({ providers: [provider] });

    const response = await inject(app, {
      url: "/",
      headers: {
        Accept: "text/html",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("CodeBrickApe Hot API");
  });

  test("returns structured json for missing api routes", async () => {
    const app = createApp({ providers: [provider] });

    const response = await inject(app, {
      url: "/missing-provider",
      headers: {
        Accept: "application/json",
      },
    });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      code: 404,
      message: "接口不存在",
    });
  });

  test("returns provider data through the universal provider route", async () => {
    const app = createApp({ providers: [provider] });

    const response = await inject(app, { url: "/example" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code: 200,
      provider: "example",
      title: "示例",
      subtitle: "热榜",
      from: "server",
      stale: false,
      total: 1,
    });
    expect(response.body.data[0].title).toBe("live item");
  });

  test("uses the configured shared cache adapter when no cache is injected", async () => {
    let fetchCount = 0;
    let restCalls = 0;
    const remoteCache = new Map();
    const fetchImpl = async (url, options) => {
      restCalls++;
      const [command, key, value] = JSON.parse(options.body);
      if (command === "GET") {
        return {
          ok: true,
          status: 200,
          async json() {
            return { result: remoteCache.get(key) || null };
          },
        };
      }
      if (command === "SET") {
        remoteCache.set(key, value);
      }
      if (command === "DEL") {
        remoteCache.delete(key);
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { result: "OK" };
        },
      };
    };
    const app = createApp({
      providers: [
        {
          ...provider,
          async fetch() {
            fetchCount++;
            return { items: [{ title: `live item ${fetchCount}` }] };
          },
        },
      ],
      config: {
        cacheDriver: "rest",
        cacheRestUrl: "https://redis.example.com",
        cacheRestToken: "secret-token",
        cacheNamespace: "hot-api-test",
        fetchImpl,
      },
    });

    const first = await inject(app, { url: "/example" });
    const second = await inject(app, { url: "/example" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(fetchCount).toBe(1);
    expect(restCalls).toBeGreaterThan(0);
    expect(second.body.from).toBe("cache");
    expect(second.body.data[0].title).toBe("live item 1");
  });

  test("protects forced refresh from anonymous callers", async () => {
    const app = createApp({
      providers: [provider],
      config: { adminToken: "secret-token" },
    });

    const response = await inject(app, { url: "/example/new" });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: 401,
      message: "需要管理权限",
    });
  });

  test("allows forced refresh with the configured admin token", async () => {
    const app = createApp({
      providers: [provider],
      config: { adminToken: "secret-token" },
    });

    const response = await inject(app, {
      url: "/example/new",
      headers: {
        Authorization: "Bearer secret-token",
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.from).toBe("server");
  });

  test("serves calendar date requests from provider cache", async () => {
    let fetchCount = 0;
    const calendarProvider = {
      id: "calendar",
      title: "历史上的今天",
      subtitle: "指定日期",
      ttl: 60,
      staleTtl: 3600,
      resolveParams({ query }) {
        return {
          month: query.month,
          day: query.day,
        };
      },
      cacheKey({ month, day }) {
        return `hot:calendar:${month}-${day}`;
      },
      async fetch() {
        fetchCount++;
        return { items: [{ title: `calendar item ${fetchCount}` }] };
      },
      parse(raw) {
        return raw.items;
      },
    };
    const app = createApp({ providers: [calendarProvider] });

    const first = await inject(app, { url: "/calendar/date?month=06&day=01" });
    const second = await inject(app, { url: "/calendar/date?month=06&day=01" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(fetchCount).toBe(1);
    expect(second.body.from).toBe("cache");
  });

  test("exposes provider health state after repeated upstream failures", async () => {
    const failingProvider = {
      id: "example",
      title: "示例",
      subtitle: "热榜",
      circuitBreakerThreshold: 2,
      async fetch() {
        throw new Error("upstream unavailable");
      },
      parse(raw) {
        return raw.items;
      },
    };
    const app = createApp({ providers: [failingProvider], logger: silentLogger });

    await inject(app, { url: "/example" });
    await inject(app, { url: "/example" });
    const status = await inject(app, { url: "/status/example" });

    expect(status.status).toBe(200);
    expect(status.body.provider.health).toBe("circuit_open");
  });
});
