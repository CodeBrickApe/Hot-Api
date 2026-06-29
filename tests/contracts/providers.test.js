const fs = require("fs");
const path = require("path");

const providers = require("../../src/providers");

const expectedProviderIds = [
  "36kr",
  "baidu",
  "bilibili",
  "calendar",
  "douban_new",
  "douyin",
  "douyin_music",
  "douyin_new",
  "genshin",
  "ithome",
  "juejin",
  "kuaishou",
  "lol",
  "netease",
  "newsqq",
  "sspai",
  "thepaper",
  "tianqi",
  "tieba",
  "toutiao",
  "weibo",
  "weread",
  "zhihu",
];

describe("provider catalog contract", () => {
  test("registers every public provider exactly once", () => {
    const ids = providers.map((provider) => provider.id).sort();

    expect(ids).toEqual(expectedProviderIds.sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every provider exposes the metadata and functions required by the harness", () => {
    for (const provider of providers) {
      expect(provider.id).toMatch(/^[a-z0-9_]+$/);
      expect(provider.title).toEqual(expect.any(String));
      expect(provider.subtitle).toEqual(expect.any(String));
      expect(provider.fetch).toEqual(expect.any(Function));
      expect(provider.parse).toEqual(expect.any(Function));
    }
  });

  test("keeps each provider in its own module for maintainability", () => {
    for (const provider of providers) {
      const providerFile = path.join(__dirname, `../../src/providers/${provider.id}.js`);

      expect(fs.existsSync(providerFile)).toBe(true);
    }
  });

  test("does not hardcode third-party API secrets in source", () => {
    const source = fs.readFileSync(path.join(__dirname, "../../src/providers/index.js"), "utf8");

    expect(source).not.toContain("IjlQyeDxGb3QGxhcD7Wsik6UISYieSLt");
  });
});
