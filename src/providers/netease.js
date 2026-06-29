const { assertData } = require("./_shared");

module.exports = {
  id: "netease",
  title: "网易新闻",
  subtitle: "热点榜",
  async fetch({ httpClient }) {
    return (await httpClient.get("https://m.163.com/fe/api/hot/news/flow")).data;
  },
  parse(raw) {
    return assertData(raw?.data?.list).map((item) => ({
      id: item.skipID,
      title: item.title,
      desc: item._keyword,
      pic: item.imgsrc,
      owner: item.source,
      url: `https://www.163.com/dy/article/${item.skipID}.html`,
      mobileUrl: item.url,
    }));
  },
};
