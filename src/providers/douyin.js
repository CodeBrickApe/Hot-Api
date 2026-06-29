const { assertData } = require("./_shared");

module.exports = {
  id: "douyin",
  title: "抖音",
  subtitle: "热点榜",
  async fetch({ httpClient, cache }) {
    const cookieKey = "token:douyin:passport_csrf";
    let cookie = (await cache.getFresh(cookieKey))?.data;
    if (!cookie) {
      const cookieResponse = await httpClient.get(
        "https://www.douyin.com/passport/general/login_guiding_strategy/?aid=6383",
      );
      const match = cookieResponse.headers["set-cookie"]?.[0]?.match(/passport_csrf_token=(.*?);/s);
      cookie = assertData(match?.[1], "Douyin cookie missing");
      await cache.setFresh(cookieKey, { data: cookie, updateTime: new Date().toISOString() }, 1800);
    }
    return (
      await httpClient.get(
        "https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1&round_trip_time=50",
        {
          headers: {
            Cookie: `passport_csrf_token=${cookie}`,
          },
        },
      )
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
