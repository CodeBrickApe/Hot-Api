const cheerio = require("cheerio");
const getWereadID = require("../../utils/getWereadID");
const { ProviderError } = require("../core/errors");

const mobileUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1";

const androidHeaders = {
  "user-agent": "okhttp3",
};

const assertData = (value, message = "Provider response shape changed") => {
  if (!value) {
    throw new ProviderError(message, { type: "PROVIDER_PARSE_ERROR" });
  }
  return value;
};

const stripHtml = (value = "") => String(value).replace(/<[^>]+>/g, "");

const decodeUnicode = (encodedString) =>
  String(encodedString || "").replace(/\\u([\d\w]{4})/gi, (match, grp) =>
    String.fromCharCode(parseInt(grp, 16)),
  );

module.exports = {
  cheerio,
  getWereadID,
  ProviderError,
  mobileUserAgent,
  androidHeaders,
  assertData,
  stripHtml,
  decodeUnicode,
};
