export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS' || req.method === 'GET') { res.status(200).end(); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
    const { start_point, destination, days, travelers } = body;

    const apiKey = process.env.DEEPSEEK_API_KEY; 
    if (!apiKey) return res.status(200).json({ error: "服务器未配置秘钥" });

    // 严密声明：segments 的数组顺序必须与 timeline_flows 卡片完美 1:1 映射！
    const prompt = `设计前往 ${destination} 的宏观规划。天数 ${days} 天，人数 ${travelers} 人。出发地 ${start_point}。
    你必须仅仅返回一个纯净的标准 JSON 对象，严禁包含任何 \`\`\`json 格式代码块或前后废话。
    
    【核心要求】
    1. timeline_flows 数组里有几个步骤卡片，macro_route.segments 数组里就必须有相同数量、相同顺序的连线对象。
    2. 如果是回程航线，segments 里的 coords 坐标顺序必须颠倒（例如去程是A->B，回程必须写成B->A），以此来纠正地图动画流向。
    3. 同一组起终点的往返航线，为了防止在地图上重叠，请在纬度上微调 0.3 到 0.5 度以拉开两条平行线。

    格式精确规范如下：
    {
      "summary": "大路线时序沙盘对比",
      "options": [
        {
          "option_id": 1,
          "option_name": "半岛自驾纵贯线 + 亚速尔群岛跨海大闭环",
          "logic_desc": "大交通同国往返精算方案，去程与回程无缝咬合。",
          "total_group_cost": "￥26000",
          "cost_per_person": "￥13000",
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight",
              "title": "洲际国际大交通",
              "detail_title": "${start_point} (TFU) ✈️ 马德里 (MAD)",
              "time_window": "参考时段: 14:20 - 20:15",
              "duration_desc": "耗时 12.5小时",
              "cost_info": "人均单程约 ￥4500",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "抵达后入住机场酒店倒时差。"
            },
            {
              "days_range": "Day 2 - Day 4",
              "type": "drive",
              "title": "伊比利亚跨境长途自驾",
              "detail_title": "马德里取车 🚗 里斯本还车",
              "time_window": "自驾取车: Day 2 09:30",
              "duration_desc": "累计驾驶 7.5小时",
              "cost_info": "预计车费共 ￥1800",
              "meta_json": {
                "pickup": "马德里机场 T4 门店",
                "dropoff": "里斯本机场 T1 还车点",
                "distance": "全程约 680 公里",
                "drive_hours": "每日平均行驶 2.5 小时"
              },
              "note": "进入葡萄牙记得柜台开通 Via Verde 电子缴费标签。"
            },
            {
              "days_range": "Day 5 - Day 7",
              "type": "flight",
              "title": "跨海海岛切入航线 (去程)",
              "detail_title": "里斯本 (LIS) ✈️ 蓬塔德尔加达 (PDL)",
              "time_window": "航班去程: 早班 08:00 - 09:15",
              "duration_desc": "单程航程 2h15m",
              "cost_info": "单程机票约 ￥750",
              "meta_json": {
                "pickup": "蓬塔德尔加达机场柜台",
                "dropoff": "蓬塔德尔加达机场还车",
                "distance": "环岛自驾约 220 公里",
                "drive_hours": "累计驾驶约 4.5 小时"
              },
              "note": "海岛多急弯山路，提前预约锁定自动挡车型。"
            },
            {
              "days_range": "Day 8 - Day 9",
              "type": "flight",
              "title": "群岛归航切回半岛 (回程)",
              "detail_title": "蓬塔德尔加达 (PDL) ✈️ 里斯本 (LIS)",
              "time_window": "航班回程: 晚班 18:30 - 21:45",
              "duration_desc": "单程航程 2h15m",
              "cost_info": "单程机票约 ￥750",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "返回半岛后准备衔接后续的回国大交通。"
            },
            {
              "days_range": "Day 10",
              "type": "flight",
              "title": "半岛中转与回程大闭环",
              "detail_title": "里斯本 ✈️ 马德里 ✈️ ${start_point}",
              "time_window": "Day 10 中午 12:15 起飞",
              "duration_desc": "国际航程约 14小时",
              "cost_info": "已包含在总套票内部",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "转机建议预留 3 小时以上防廉航延误。"
            }
          ],
          "accommodation_summary": [
            {"city": "马德里", "nights": 2, "avg_price": "￥900", "total": "￥1800"},
            {"city": "里斯本", "nights": 4, "avg_price": "￥1100", "total": "￥4400"},
            {"city": "亚速尔圣米格尔", "nights": 3, "avg_price": "￥800", "total": "￥2400"}
          ],
          "macro_route": {
            "center_lat": 39.5, "center_lng": -8.0, "zoom_level": 5,
            "anchors": [
              {"name": "马德里", "lat": 40.4168, "lng": -3.7038, "role": "自驾起始港"},
              {"name": "里斯本", "lat": 38.7223, "lng": -9.1393, "role": "还车转机节点"},
              {"name": "蓬塔德尔加达", "lat": 37.7412, "lng": -25.6756, "role": "圣米格尔目的地岛"}
            ],
            "segments": [
              {
                "mode": "flight", 
                "coords": [[40.4168, -3.7038], [40.4168, -3.7038]] 
              },
              {
                "mode": "drive", 
                "coords": [[40.4168, -3.7038], [38.7223, -9.1393]]
              },
              {
                "mode": "flight", 
                "coords": [[38.7223, -9.1393], [37.7412, -25.6756]]
              },
              {
                "mode": "flight", 
                "coords": [[37.7412, -25.6756], [38.4223, -9.1393]]
              },
              {
                "mode": "flight", 
                "coords": [[38.7223, -9.1393], [40.4168, -3.7038]]
              }
            ]
          }
        }
      ]
    }
    必须完整严密覆盖 ${days} 天的闭环时序逻辑。`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.1 })
    });

    const data = await response.json();
    let resultText = data.choices[0].message.content.trim();
    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return res.status(200).json(JSON.parse(resultText.trim()));
  } catch (error) {
    return res.status(200).json({ error: error.message });
  }
}