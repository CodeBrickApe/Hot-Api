const { assertData } = require("./_shared");

module.exports = {
  id: "baidu",
  title: "百度",
  subtitle: "热搜榜",
  async fetch({ httpClient }) {
    return (await httpClient.get("https://top.baidu.com/board?tab=realtime")).data;
  },
  parse(raw) {
    const match = String(raw).match(/<!--s-data:(.*?)-->/s);
    const content = JSON.parse(assertData(match?.[1])).cards[0].content;
    return content.map((item) => ({
      title: item.query,
      desc: item.desc,
      pic: item.img,
      hot: Number(item.hotScore),
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(item.query)}`,
      mobileUrl: item.url,
    }));
  },
};
