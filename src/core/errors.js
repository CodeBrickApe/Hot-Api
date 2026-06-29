class ProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ProviderError";
    this.type = options.type || "PROVIDER_ERROR";
    this.status = options.status || 503;
    this.cause = options.cause;
    this.retryAfter = options.retryAfter || 300;
  }
}

const toProviderError = (error) => {
  if (error instanceof ProviderError) return error;

  if (error?.code === "ECONNABORTED" || error?.name === "AbortError") {
    return new ProviderError("上游请求超时", {
      type: "UPSTREAM_TIMEOUT",
      cause: error,
    });
  }

  if (error?.response?.status) {
    return new ProviderError("上游接口不可用", {
      type: "UPSTREAM_BAD_STATUS",
      status: error.response.status >= 500 ? 503 : 502,
      cause: error,
    });
  }

  return new ProviderError("上游接口不可用", {
    type: "UPSTREAM_UNAVAILABLE",
    cause: error,
  });
};

module.exports = {
  ProviderError,
  toProviderError,
};
