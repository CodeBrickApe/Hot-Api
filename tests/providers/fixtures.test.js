const fs = require("fs");
const path = require("path");

const providers = require("../../src/providers");

const fixtureDir = path.join(__dirname, "../fixtures/providers");
const readFixture = (filename) => {
  const raw = fs.readFileSync(path.join(fixtureDir, filename), "utf8");
  return filename.endsWith(".json") ? JSON.parse(raw) : raw;
};

const cases = [
  {
    id: "36kr",
    fixture: "36kr.json",
    expected: {
      id: "36kr-1",
      title: "36Kr fixture title",
      hot: 321,
      url: "https://www.36kr.com/p/36kr-1",
    },
  },
  {
    id: "baidu",
    fixture: "baidu.html",
    expected: {
      title: "AI reshapes search",
      hot: 12345,
      url: "https://www.baidu.com/s?wd=AI%20reshapes%20search",
    },
  },
  {
    id: "bilibili",
    fixture: "bilibili.json",
    expected: {
      id: "BV1fixture",
      title: "Fixture video",
      pic: "https://i0.hdslb.com/bfs/archive/fixture.jpg",
      hot: 98765,
      mobileUrl: "https://m.bilibili.com/video/BV1fixture",
    },
  },
  {
    id: "calendar",
    fixture: "calendar.json",
    context: {
      params: {
        month: "06",
        day: "01",
      },
    },
    expected: {
      year: "1926",
      title: "Stable history event",
      desc: "Fixture description",
      mobileUrl: "https://example.com/history",
    },
  },
  {
    id: "douban_new",
    fixture: "douban_new.html",
    expected: {
      title: "[★8.8] FixtureMovie / Original",
      score: "8.8",
      comments: "123",
      mobileUrl: "https://m.douban.com/movie/subject/1292052",
    },
  },
  {
    id: "douyin",
    fixture: "douyin.json",
    expected: {
      title: "Douyin fixture topic",
      hot: 456,
      url: "https://www.douyin.com/hot/sentence-1",
    },
  },
  {
    id: "douyin_music",
    fixture: "douyin_music.json",
    expected: {
      id: "music-1",
      title: "Fixture song",
      artist: "Fixture artist",
      mobileUrl: "https://example.com/song.mp3",
    },
  },
  {
    id: "douyin_new",
    fixture: "douyin_new.json",
    expected: {
      title: "Douyin new fixture topic",
      hot: 789,
      mobileUrl: "https://www.douyin.com/hot/sentence-new",
    },
  },
  {
    id: "genshin",
    fixture: "genshin.json",
    expected: {
      id: "genshin-1",
      title: "Genshin fixture news",
      mobileUrl: "https://ys.mihoyo.com/main/m/news/detail/genshin-1",
    },
  },
  {
    id: "ithome",
    fixture: "ithome.html",
    expected: {
      title: "IT Home fixture",
      type: "Day Rank",
      hot: 12,
      url: "https://www.ithome.com/0/123/456.htm",
    },
  },
  {
    id: "juejin",
    fixture: "juejin.json",
    expected: {
      id: "juejin-1",
      title: "Juejin fixture article",
      hot: 42,
      mobileUrl: "https://juejin.cn/post/juejin-1",
    },
  },
  {
    id: "kuaishou",
    fixture: "kuaishou.html",
    expected: {
      title: "Kuaishou fixture video",
      hot: "999",
      mobileUrl: "https://www.kuaishou.com/short-video/KS123",
    },
  },
  {
    id: "lol",
    fixture: "lol.txt",
    expected: {
      title: "LOL fixture notice",
      hot: 101,
      pic: "https://game.gtimg.cn/fixture.jpg",
    },
  },
  {
    id: "netease",
    fixture: "netease.json",
    expected: {
      id: "NETEASE1",
      title: "Netease fixture news",
      owner: "Fixture source",
      url: "https://www.163.com/dy/article/NETEASE1.html",
    },
  },
  {
    id: "newsqq",
    fixture: "newsqq.json",
    expected: {
      id: "NEWSQQ1",
      title: "Tencent fixture news",
      hot: 1234,
      mobileUrl: "https://view.inews.qq.com/a/NEWSQQ1",
    },
  },
  {
    id: "sspai",
    fixture: "sspai.json",
    expected: {
      id: 1001,
      title: "Sspai fixture article",
      hot: 88,
      mobileUrl: "https://sspai.com/post/1001",
    },
  },
  {
    id: "thepaper",
    fixture: "thepaper.json",
    expected: {
      id: "paper-1",
      title: "The Paper fixture news",
      hot: 77,
      mobileUrl: "https://m.thepaper.cn/newsDetail_forward_paper-1",
    },
  },
  {
    id: "tianqi",
    fixture: "tianqi.json",
    expected: {
      status: 0,
      district_id: "222405",
    },
  },
  {
    id: "tieba",
    fixture: "tieba.json",
    expected: {
      id: "tieba-1",
      title: "Tieba fixture topic",
      hot: 234,
      mobileUrl: "https://tieba.baidu.com/hottopic/tieba-1",
    },
  },
  {
    id: "toutiao",
    fixture: "toutiao.json",
    expected: {
      id: 123,
      title: "Toutiao fixture topic",
      hot: 345,
      mobileUrl:
        "https://api.toutiaoapi.com/feoffline/amos_land/new/html/main/index.html?topic_id=123str",
    },
  },
  {
    id: "weibo",
    fixture: "weibo.json",
    expected: {
      title: "Fixture Topic",
      desc: "#Fixture Topic#",
      hot: 123456,
      url: "https://s.weibo.com/weibo?q=%23Fixture%20Topic%23&t=31&band_rank=1&Refer=top",
    },
  },
  {
    id: "weread",
    fixture: "weread.json",
    expected: {
      id: "123456789",
      title: "Weread fixture book",
      pic: "https://cdn.weread.qq.com/t9_fixture.jpg",
      hot: 999,
      url: expect.stringContaining("https://weread.qq.com/web/bookDetail/"),
    },
  },
  {
    id: "zhihu",
    fixture: "zhihu.html",
    expected: {
      title: "Zhihu fixture question",
      desc: "Zhihu fixture excerpt",
      hot: 120000,
      mobileUrl: "https://www.zhihu.com/question/1",
    },
  },
];

describe("provider parser golden fixtures", () => {
  test("keeps one parser fixture for every public provider", () => {
    const fixtureIds = cases.map((item) => item.id).sort();
    const providerIds = providers.map((provider) => provider.id).sort();

    expect(fixtureIds).toEqual(providerIds);
  });

  test.each(cases)(
    "parses $id fixture into the public item shape",
    ({ id, fixture, context, expected }) => {
      const provider = providers.find((item) => item.id === id);
      const items = provider.parse(readFixture(fixture), context || {});

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject(expected);
    },
  );
});
