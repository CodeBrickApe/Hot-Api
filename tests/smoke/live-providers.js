const { createApp } = require("../../src/app");

const providers = require("../../src/providers");

const enabledProviders = providers
  .filter((provider) => !provider.disabled)
  .map((provider) => provider.id);

console.log(
  JSON.stringify(
    {
      status: "configured",
      message:
        "Live provider smoke tests are intentionally opt-in. Set RUN_LIVE_SMOKE=1 to hit upstream sources.",
      providers: enabledProviders,
    },
    null,
    2,
  ),
);

if (process.env.RUN_LIVE_SMOKE !== "1") {
  process.exit(0);
}

const app = createApp();
const callback = app.callback();

const invoke = (path) =>
  new Promise((resolve, reject) => {
    const http = require("http");
    const server = http.createServer(callback);
    server.listen(0, "127.0.0.1", async () => {
      const port = server.address().port;
      http
        .get(`http://127.0.0.1:${port}${path}`, (response) => {
          response.resume();
          response.on("end", () => {
            server.close(() => resolve(response.statusCode));
          });
        })
        .on("error", (error) => {
          server.close(() => reject(error));
        });
    });
  });

(async () => {
  const failures = [];
  for (const providerId of enabledProviders) {
    const status = await invoke(`/${providerId}`);
    if (status >= 500) failures.push({ providerId, status });
  }
  if (failures.length) {
    console.error(JSON.stringify({ failures }, null, 2));
    process.exit(1);
  }
})();
