const { assertData } = require("./_shared");

module.exports = {
  id: "sspai",
  title: "少数派",
  subtitle: "热榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.get("https://sspai.com/api/v1/article/tag/page/get?limit=40&tag=热门文章")
    ).data;
  },
  parse(raw) {
    return assertData(raw?.data).map((item) => ({
      id: item.id,
      title: item.title,
      desc: item.summary,
      pic: `https://cdn.sspai.com/${item.banner}`,
      owner: item.author,
      hot: item.like_count,
      url: `https://sspai.com/post/${item.id}`,
      mobileUrl: `https://sspai.com/post/${item.itemId || item.id}`,
    }));
  },
};
