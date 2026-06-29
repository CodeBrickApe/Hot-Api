const axios = require("axios");
const { toProviderError } = require("./errors");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createHttpClient = (options = {}) => {
  const timeout = Number(options.timeout || process.env.UPSTREAM_TIMEOUT_MS || 5000);
  const retries = Number(options.retries || process.env.UPSTREAM_RETRIES || 1);
  const instance = axios.create({
    timeout,
    headers: {
      "User-Agent":
        options.userAgent ||
        process.env.UPSTREAM_USER_AGENT ||
        "CodeBrickApe-Hot-API/2.0 (+https://github.com/CodeBrickApe)",
    },
  });

  const request = async (config) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await instance.request(config);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await wait(150 * 2 ** attempt);
        }
      }
    }
    throw toProviderError(lastError);
  };

  return {
    request,
    get(url, config = {}) {
      return request({ ...config, method: "GET", url });
    },
    post(url, data, config = {}) {
      return request({ ...config, method: "POST", url, data });
    },
  };
};

module.exports = {
  createHttpClient,
};
