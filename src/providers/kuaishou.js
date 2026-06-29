const { assertData, decodeUnicode } = require("./_shared");

module.exports = {
  id: "kuaishou",
  title: "快手",
  subtitle: "热榜",
  async fetch({ httpClient }) {
    return (await httpClient.get("https://www.kuaishou.com/?isHome=1")).data;
  },
  parse(raw) {
    const match = String(raw).match(/window\.__APOLLO_STATE__\s*=\s*(.*?);\s*\(function\s*\(\)/s);
    const state = JSON.parse(assertData(match?.[1])).defaultClient;
    const items = assertData(state['$ROOT_QUERY.visionHotRank({"page":"home"})']?.items);
    return items.map((itemRef) => {
      const item = state[itemRef.id];
      const image = item.poster;
      const id = assertData(image.match(/clientCacheKey=([A-Za-z0-9]+)/s)?.[1]);
      return {
        title: item.name,
        pic: decodeUnicode(image),
        hot: item.hotValue,
        url: `https://www.kuaishou.com/short-video/${id}`,
        mobileUrl: `https://www.kuaishou.com/short-video/${id}`,
      };
    });
  },
};
