const { assertData } = require("./_shared");

module.exports = {
  id: "tieba",
  title: "百度贴吧",
  subtitle: "热议榜",
  async fetch({ httpClient }) {
    return (await httpClient.get("https://tieba.baidu.com/hottopic/browse/topicList")).data;
  },
  parse(raw) {
    return assertData(raw?.data?.bang_topic?.topic_list).map((item) => ({
      id: item.topic_id,
      title: item.topic_name,
      desc: item.topic_desc,
      pic: item.topic_pic,
      hot: item.discuss_num,
      url: item.topic_url,
      mobileUrl: item.topic_url,
    }));
  },
};
