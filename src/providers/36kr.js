const { assertData } = require("./_shared");

module.exports = {
  id: "36kr",
  title: "36氪",
  subtitle: "热榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.post("https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot", {
        partner_id: "wap",
        param: {
          siteId: 1,
          platformId: 2,
        },
        timestamp: Date.now(),
      })
    ).data;
  },
  parse(raw) {
    return assertData(raw?.data?.hotRankList).map((item) => ({
      id: item.itemId,
      title: item.templateMaterial.widgetTitle,
      pic: item.templateMaterial.widgetImage,
      owner: item.templateMaterial.authorName,
      hot: item.templateMaterial.statRead,
      data: item.templateMaterial,
      url: `https://www.36kr.com/p/${item.itemId}`,
      mobileUrl: `https://www.36kr.com/p/${item.itemId}`,
    }));
  },
};
