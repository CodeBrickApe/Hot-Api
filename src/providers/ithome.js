const { cheerio, mobileUserAgent, assertData } = require("./_shared");

module.exports = {
  id: "ithome",
  title: "IT之家",
  subtitle: "热榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.get("https://m.ithome.com/rankm/", {
        headers: { "User-Agent": mobileUserAgent },
      })
    ).data;
  },
  parse(raw) {
    const $ = cheerio.load(assertData(raw));
    const data = [];
    $(".rank-name").each(function parseRank() {
      const type = $(this).data("rank-type");
      const rankName = $(this).text();
      cheerio
        .load($(this).next(".rank-box").html() || "")(".placeholder")
        .get()
        .forEach((item) => {
          const href = $(item).find("a").attr("href") || "";
          const match = href.match(/[html|live]\/(\d+)\.htm/);
          data.push({
            title: $(item).find(".plc-title").text(),
            img: $(item).find("img").attr("data-original"),
            time: $(item).find(".post-time").text(),
            type: rankName,
            typeName: type,
            hot: Number($(item).find(".review-num").text().replace(/\D/g, "")),
            url: match
              ? `https://www.ithome.com/0/${match[1].slice(0, 3)}/${match[1].slice(3)}.htm`
              : href,
            mobileUrl: href,
          });
        });
    });
    return data;
  },
};
