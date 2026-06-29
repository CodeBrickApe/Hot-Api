const { ProviderError, assertData, stripHtml } = require("./_shared");

module.exports = {
  id: "calendar",
  title: "历史上的今天",
  subtitle: "指定日期",
  ttl: 86400,
  staleTtl: 30 * 86400,
  resolveParams({ query = {} }) {
    const now = new Date();
    const month = String(query.month || now.getMonth() + 1).padStart(2, "0");
    const day = String(query.day || now.getDate()).padStart(2, "0");
    if (!/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
      throw new ProviderError("参数格式错误", { type: "BAD_REQUEST", status: 400 });
    }
    return { month, day };
  },
  cacheKey({ month, day }) {
    return `hot:calendar:${month}-${day}`;
  },
  async fetch({ httpClient, params }) {
    return (
      await httpClient.get(`https://baike.baidu.com/cms/home/eventsOnHistory/${params.month}.json`)
    ).data;
  },
  parse(raw, { params }) {
    return assertData(raw?.[params.month]?.[params.month + params.day]).map((item) => ({
      year: item.year,
      title: stripHtml(item.title),
      desc: stripHtml(item.desc),
      pic: item.pic_share || item.pic_index,
      avatar: item.pic_calendar,
      type: item.type,
      url: item.link,
      mobileUrl: item.link,
    }));
  },
};
