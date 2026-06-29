const { assertData } = require("./_shared");

module.exports = {
  id: "thepaper",
  title: "澎湃新闻",
  subtitle: "热榜",
  async fetch({ httpClient }) {
    return (await httpClient.get("https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar"))
      .data;
  },
  parse(raw) {
    return assertData(raw?.data?.hotNews).map((item) => ({
      id: item.contId,
      title: item.name,
      pic: item.pic,
      hot: item.praiseTimes,
      time: item.pubTime,
      url: `https://www.thepaper.cn/newsDetail_forward_${item.contId}`,
      mobileUrl: `https://m.thepaper.cn/newsDetail_forward_${item.contId}`,
    }));
  },
};
