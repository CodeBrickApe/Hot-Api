const { mobileUserAgent, assertData } = require("./_shared");

module.exports = {
  id: "zhihu",
  title: "知乎",
  subtitle: "热榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.get("https://www.zhihu.com/hot", {
        headers: { "User-Agent": mobileUserAgent },
      })
    ).data;
  },
  parse(raw) {
    const match = String(raw).match(
      /<script id="js-initialData" type="text\/json">\s*(.*?)\s*<\/script>/s,
    );
    const hotList = JSON.parse(assertData(match?.[1])).initialState.topstory.hotList;
    return hotList.map((item) => ({
      title: item.target.titleArea.text,
      desc: item.target.excerptArea.text,
      pic: item.target.imageArea.url,
      hot: parseInt(item.target.metricsArea.text.replace(/[^\d]/g, ""), 10) * 10000,
      url: item.target.link.url,
      mobileUrl: item.target.link.url,
    }));
  },
};
