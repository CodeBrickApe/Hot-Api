const { ProviderError, assertData } = require("./_shared");

module.exports = {
  id: "tianqi",
  title: "国内天气查询",
  subtitle: "Web API",
  ttl: 1800,
  staleTtl: 86400,
  async resolveParams({ query = {}, request, httpClient, config }) {
    if (query.district_id) return { districtId: String(query.district_id) };
    const fallbackDistrictId = "222405";
    if (!config.baiduMapAk) return { districtId: fallbackDistrictId };

    let ip = request?.ip || request?.ctx?.ip || "127.0.0.1";
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);
    try {
      const response = await httpClient.get("https://api.map.baidu.com/location/ip", {
        params: {
          ip,
          ak: config.baiduMapAk,
          coor: "bd09ll",
        },
      });
      return {
        districtId: String(response.data?.content?.address_detail?.adcode || fallbackDistrictId),
      };
    } catch {
      return { districtId: fallbackDistrictId };
    }
  },
  cacheKey({ districtId }) {
    return `hot:tianqi:${districtId}`;
  },
  async fetch({ httpClient, params, config }) {
    if (!config.baiduMapAk) {
      throw new ProviderError("BAIDU_MAP_AK is not configured", {
        type: "UPSTREAM_CONFIG_MISSING",
      });
    }
    return (
      await httpClient.get("https://api.map.baidu.com/weather/v1/", {
        params: {
          district_id: params.districtId,
          data_type: "all",
          ak: config.baiduMapAk,
        },
      })
    ).data;
  },
  parse(raw) {
    return [assertData(raw, "Weather response missing")];
  },
  skipSchema: true,
};
