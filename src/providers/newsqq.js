const { assertData } = require("./_shared");

module.exports = {
  id: "newsqq",
  title: "腾讯新闻",
  subtitle: "热点榜",
  async fetch({ httpClient }) {
    return (await httpClient.get("https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=50"))
      .data;
  },
  parse(raw) {
    return assertData(raw?.idlist?.[0]?.newslist)
      .slice(1)
      .map((item) => ({
        id: item.id,
        title: item.title,
        desc: item.abstract,
        descSm: item.nlpAbstract,
        hot: item.readCount,
        pic: item.miniProShareImage,
        url: `https://new.qq.com/rain/a/${item.id}`,
        mobileUrl: `https://view.inews.qq.com/a/${item.id}`,
      }));
  },
};
