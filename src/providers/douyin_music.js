const { androidHeaders, assertData } = require("./_shared");

module.exports = {
  id: "douyin_music",
  title: "抖音",
  subtitle: "热歌榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.get("https://aweme.snssdk.com/aweme/v1/chart/music/list/", {
        headers: androidHeaders,
        params: {
          device_platform: "android",
          version_name: "13.2.0",
          version_code: "130200",
          aid: "1128",
          chart_id: "6853972723954146568",
          count: "100",
        },
      })
    ).data;
  },
  parse(raw) {
    return assertData(raw?.music_list).map((entry) => {
      const item = entry.music_info;
      return {
        id: item.id,
        title: item.title,
        album: item.album,
        artist: item.author,
        pic: item.cover_large?.url_list?.[0],
        lyric: item.lyric_url,
        url: item.play_url?.uri,
        mobileUrl: item.play_url?.uri,
      };
    });
  },
};
