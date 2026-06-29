require("dotenv").config();

const { createApp } = require("./src/app");
const { loadConfig } = require("./src/config/env");

const app = createApp();
const handler = app.callback();

if (require.main === module) {
  const config = loadConfig();
  app.listen(config.port, () => {
    console.info(`成功在 ${config.port} 端口上运行`);
  });
}

module.exports = handler;
module.exports.app = app;
