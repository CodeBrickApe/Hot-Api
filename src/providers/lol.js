const { assertData } = require("./_shared");

module.exports = {
  id: "lol",
  title: "英雄联盟",
  subtitle: "更新公告",
  async fetch({ httpClient }) {
    return (
      await httpClient.get(
        "https://apps.game.qq.com/cmc/zmMcnTargetContentList?r0=jsonp&page=1&num=16&target=24&source=web_pc&r1=jQuery191002324053053181463_1687855508930&_=1687855508933",
      )
    ).data;
  },
  parse(raw) {
    const match = String(raw).match(/jQuery191002324053053181463_1687855508930\((.*?)\)/s);
    return assertData(JSON.parse(assertData(match?.[1]))?.data?.result).map((item) => ({
      title: item.sTitle,
      desc: item.sAuthor,
      pic: `https:${item.sIMG}`,
      hot: Number(item.iTotalPlay),
      url: `https://lol.qq.com/news/detail.shtml?docid=${encodeURIComponent(item.iDocID)}`,
      mobileUrl: `https://lol.qq.com/news/detail.shtml?docid=${encodeURIComponent(item.iDocID)}`,
    }));
  },
};
