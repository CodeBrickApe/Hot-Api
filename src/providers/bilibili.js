const { assertData } = require("./_shared");

module.exports = {
  id: "bilibili",
  title: "哔哩哔哩",
  subtitle: "热门榜",
  ttl: 300,
  staleTtl: 86400,
  async fetch({ httpClient }) {
    return (await httpClient.get("https://api.bilibili.com/x/web-interface/ranking/v2")).data;
  },
  parse(raw) {
    return assertData(raw?.data?.list).map((item) => ({
      id: item.bvid,
      title: item.title,
      desc: item.desc,
      pic: item.pic?.replace(/http:/, "https:"),
      owner: item.owner,
      data: item.stat,
      hot: item.stat?.view,
      url: item.short_link_v2 || `https://b23.tv/${item.bvid}`,
      mobileUrl: `https://m.bilibili.com/video/${item.bvid}`,
    }));
  },
};
