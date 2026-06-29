const { assertData } = require("./_shared");

module.exports = {
  id: "toutiao",
  title: "今日头条",
  subtitle: "热榜",
  async fetch({ httpClient }) {
    return (await httpClient.get("https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc"))
      .data;
  },
  parse(raw) {
    return assertData(raw?.data).map((item) => ({
      id: item.ClusterId,
      title: item.Title,
      pic: item.Image?.url,
      hot: item.HotValue,
      url: `https://www.toutiao.com/trending/${item.ClusterIdStr}/`,
      mobileUrl: `https://api.toutiaoapi.com/feoffline/amos_land/new/html/main/index.html?topic_id=${item.ClusterIdStr}`,
    }));
  },
};
