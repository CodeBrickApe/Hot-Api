const { assertData } = require("./_shared");

module.exports = {
  id: "juejin",
  title: "稀土掘金",
  subtitle: "热榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.get(
        "https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot",
      )
    ).data;
  },
  parse(raw) {
    return assertData(raw?.data).map((item) => ({
      id: item.content?.content_id,
      title: item.content?.title,
      desc: item.content?.brief,
      hot: item.content_counter?.hot_rank,
      url: `https://juejin.cn/post/${item.content?.content_id}`,
      mobileUrl: `https://juejin.cn/post/${item.content?.content_id}`,
    }));
  },
};
