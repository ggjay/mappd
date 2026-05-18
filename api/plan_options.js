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

    const prompt = `设计前往 ${destination} 的宏观规划。天数 ${days} 天，人数 ${travelers} 人。出发地 ${start_point}。
    你必须仅仅返回一个纯净的标准 JSON 对象，严禁包含任何 \`\`\`json 格式代码块或前后废话。
    格式精确规范如下：
    {
      "summary": "成都至西葡群岛沙盘对比",
      "options": [
        {
          "option_id": 1,
          "option_name": "伊比利亚半岛全自驾+亚速尔群岛跳岛版",
          "logic_desc": "大交通同国往返精算省钱方案。",
          "total_group_cost": "￥26000",
          "cost_per_person": "￥13000",
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight",
              "title": "洲际国际大交通航线",
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
              "detail_title": "马德里取车 🚗 托莱多 🚗 里斯本还车",
              "time_window": "自驾取车: Day 2 09:30",
              "duration_desc": "累计驾驶 7.5小时",
              "cost_info": "预计车费共 ￥1800",
              "meta_json": {
                "pickup": "马德里机场 T4 门店",
                "dropoff": "里斯本机场 T1 还车点",
                "distance": "全程约 680 公里",
                "drive_hours": "每日平均行驶 2.5 小时"
              },
              "note": "进入葡萄牙记得柜台开通 Via Verde 标签。"
            },
            {
              "days_range": "Day 5 - Day 8",
              "type": "flight",
              "title": "跨海海岛无缝切入与环岛自驾",
              "detail_title": "里斯本 (LIS) ✈️ 蓬塔德尔加达 (PDL) 往返 + 岛上租车",
              "time_window": "去程 08:00 / 回程 18:30",
              "duration_desc": "单程航程 2h15m",
              "cost_info": "机票往返￥1500 + 岛上自驾车费￥1200",
              "meta_json": {
                "pickup": "蓬塔德尔加达机场柜台",
                "dropoff": "蓬塔德尔加达机场还车",
                "distance": "环岛自驾约 220 公里",
                "drive_hours": "累计驾驶约 4.5 小时"
              },
              "note": "海岛多急弯山路，提前预约锁定自动挡车型。"
            },
            {
              "days_range": "Day 9 - Day 10",
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
              {"mode": "drive", "coords": [[40.4168, -3.7038], [38.7223, -9.1393]]},
              {"mode": "flight", "coords": [[38.7223, -9.1393], [37.7412, -25.6756]]}
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