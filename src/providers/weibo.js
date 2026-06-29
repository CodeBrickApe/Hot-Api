const { assertData } = require("./_shared");

module.exports = {
  id: "weibo",
  title: "微博",
  subtitle: "热搜榜",
  async fetch({ httpClient }) {
    return (await httpClient.get("https://weibo.com/ajax/side/hotSearch")).data;
  },
  parse(raw) {
    return assertData(raw?.data?.realtime).map((item) => {
      const key = item.word_scheme || `#${item.word}`;
      return {
        title: item.word,
        desc: key,
        hot: item.raw_hot,
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
        mobileUrl: `https://s.weibo.com/weibo?q=${encodeURIComponent(
          key,
        )}&t=31&band_rank=1&Refer=top`,
      };
    });
  },
};
