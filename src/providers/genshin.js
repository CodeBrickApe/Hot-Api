const { assertData } = require("./_shared");

module.exports = {
  id: "genshin",
  title: "原神",
  subtitle: "最新消息",
  async fetch({ httpClient }) {
    return (
      await httpClient.get(
        "https://content-static.mihoyo.com/content/ysCn/getContentList?pageSize=50&pageNum=1&channelId=10",
      )
    ).data;
  },
  parse(raw) {
    return assertData(raw?.data?.list).map((item) => ({
      id: item.id,
      title: item.title,
      desc: item.summary,
      pic: item.ext?.[0]?.value?.[0]?.url,
      url: `https://ys.mihoyo.com/main/news/detail/${item.id}`,
      mobileUrl: `https://ys.mihoyo.com/main/m/news/detail/${item.id}`,
    }));
  },
};
