const Router = require("koa-router");
const tianqiRouter = new Router();
const axios = require("axios");
const { get, set } = require("../utils/cacheData");

// 接口信息
const routerInfo = { name: "tianqi", title: "国内天气查询", subtitle: "WebAPi" };

// 缓存键名
const cacheKey = "tianqiData";

// 调用时间
let updateTime = new Date().toISOString();



// 国内天气查询
tianqiRouter.get("/tianqi", async (ctx) => {
  try {
    let ip = ctx.request.ip

    if (ip.substr(0, 7) == "::ffff:") {
      ip = ip.substr(7)
    }
    let district_id = 222405;
    // const ipResponse = await axios.get(`http://api.map.baidu.com/location/ip?ip=${ip}&ak=IjlQyeDxGb3QGxhcD7Wsik6UISYieSLt&coor=bd09ll`);
    const ipResponse = await axios.get(`http://api.map.baidu.com/location/ip?ip=${'221.2.80.253' || ip}&ak=IjlQyeDxGb3QGxhcD7Wsik6UISYieSLt&coor=bd09ll`);
    console.log('testMessage', ipResponse.data.content.address_detail.adcode);
    if (ipResponse.data.content.address_detail.adcode) {
      district_id = ipResponse.data.content.address_detail.adcode
    }



    // 从缓存中获取数据
    let data = await get(cacheKey);
    const from = data ? "cache" : "server";
    if (!data) {
      // 如果缓存中不存在数据
      console.log("从服务端重新获取国内天气");
      // 从服务器拉取数据
      const response = await axios.get(`https://api.map.baidu.com/weather/v1/?district_id=${district_id}&data_type=all&ak=IjlQyeDxGb3QGxhcD7Wsik6UISYieSLt`);
      data = response.data
      updateTime = new Date().toISOString();
      if (!data) {
        ctx.body = {
          code: 500,
          ...routerInfo,
          message: "获取失败",
        };
        return false;
      }
      // 将数据写入缓存
      await set(cacheKey, data);
    }
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      from,
      total: data.length,
      updateTime,
      data,
    };
  } catch (error) {
    console.error(error);
    ctx.body = {
      code: 500,
      message: "获取失败",
    };
  }
});



tianqiRouter.info = routerInfo;
module.exports = tianqiRouter;
