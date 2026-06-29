const { androidHeaders, assertData } = require("./_shared");

module.exports = {
  id: "douyin_new",
  title: "抖音",
  subtitle: "热点榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.get("https://aweme.snssdk.com/aweme/v1/hot/search/list/", {
        headers: androidHeaders,
        params: {
          device_platform: "android",
          version_name: "13.2.0",
          version_code: "130200",
          aid: "1128",
        },
      })
    ).data;
  },
  parse(raw) {
    return assertData(raw?.data?.word_list).map((item) => ({
      title: item.word,
      pic: item.word_cover?.url_list?.[0],
      hot: Number(item.hot_value),
      url: `https://www.douyin.com/hot/${encodeURIComponent(item.sentence_id)}`,
      mobileUrl: `https://www.douyin.com/hot/${encodeURIComponent(item.sentence_id)}`,
    }));
  },
};
