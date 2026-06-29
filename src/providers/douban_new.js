const { cheerio, mobileUserAgent, assertData } = require("./_shared");

module.exports = {
  id: "douban_new",
  title: "豆瓣",
  subtitle: "新片榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.get("https://movie.douban.com/chart/", {
        headers: { "User-Agent": mobileUserAgent },
      })
    ).data;
  },
  parse(raw) {
    const $ = cheerio.load(assertData(raw));
    return $(".article .item")
      .toArray()
      .map((item) => {
        const id = $(item).find("a").attr("href")?.split("/").at(-2) || "";
        const score = $(item).find(".rating_nums").text() || "";
        return {
          title:
            `[★${score}] ` +
            $(item)
              .find("a")
              .text()
              .replace(/\n/g, "")
              .replace(/ /g, "")
              .replace(/\//g, " / ")
              .trim(),
          desc: $(item).find("p").text(),
          score,
          comments: $(item).find("span.pl").text().match(/\d+/)?.[0] || "",
          pic: $(item).find("img").attr("src") || "",
          url: $(item).find("a").attr("href") || "",
          mobileUrl: `https://m.douban.com/movie/subject/${id}`,
        };
      });
  },
};
