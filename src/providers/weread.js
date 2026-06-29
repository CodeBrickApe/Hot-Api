const { getWereadID, assertData } = require("./_shared");

module.exports = {
  id: "weread",
  title: "微信读书",
  subtitle: "飙升榜",
  async fetch({ httpClient }) {
    return (
      await httpClient.get("https://weread.qq.com/web/bookListInCategory/rising?rank=1", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        },
      })
    ).data;
  },
  parse(raw) {
    return assertData(raw?.books).map((item) => {
      const book = item.bookInfo;
      return {
        id: book.bookId,
        title: book.title,
        desc: book.intro,
        pic: book.cover?.replace("s_", "t9_"),
        hot: item.readingCount,
        author: book.author,
        url: `https://weread.qq.com/web/bookDetail/${getWereadID(book.bookId)}`,
        mobileUrl: `https://weread.qq.com/web/bookDetail/${getWereadID(book.bookId)}`,
      };
    });
  },
};
