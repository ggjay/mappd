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
    if (!apiKey) return res.status(500).json({ error: "未配置 API KEY" });

    // ⚡ 极速优化版 Prompt：删掉臃肿引导，确保大模型在 5 秒内快准狠返回
    const prompt = `你是一个跨国自驾总规划师。
    需求：出发地【${start_point}】，目的地【${destination}】，天数【${days}】天，人数【${travelers}】人。
    请仅返回一个标准的 JSON 对象，不要包含 \`\`\`json 等任何格式包装。
    
    格式必须精确如下：
    {
      "summary": "${start_point}至${destination}沙盘",
      "options": [
        {
          "option_id": 1,
          "option_name": "方案一：全半岛自驾大循环+亚速尔飞岛版",
          "logic_desc": "大路线逻辑高度概括。",
          "total_group_cost": "￥26000",
          "cost_per_person": "￥13000",
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight",
              "title": "洲际国际大交通",
              "detail_title": "${start_point} ✈️ 马德里",
              "time_window": "14:20 - 20:15",
              "duration_desc": "12.5小时",
              "cost_info": "人均 ￥4500",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "抵达入住机场酒店。"
            },
            {
              "days_range": "Day 2 - Day 4",
              "type": "drive",
              "title": "跨境自驾与移防",
              "detail_title": "马德里租车 🚗 托莱多 🚗 里斯本还车",
              "time_window": "取车: Day 2 09:30",
              "duration_desc": "驾车约7.5小时",
              "cost_info": "租车总额: ￥1800",
              "meta_json": {
                "pickup": "马德里机场 T4",
                "dropoff": "里斯本机场 T1",
                "distance": "约 680 公里",
                "drive_hours": "每日约 2.5 小时"
              },
              "note": "主动租赁绑卡Via Verde。"
            },
            {
              "days_range": "Day 5 - Day 8",
              "type": "flight",
              "title": "海岛航线与局部自驾",
              "detail_title": "里斯本 ✈️ 亚速尔圣米格尔往返 + 岛上自驾",
              "time_window": "去程08:00 / 回程18:30",
              "duration_desc": "航程2h15m",
              "cost_info": "机票人均￥1500+岛上租车￥1200",
              "meta_json": {
                "pickup": "蓬塔德尔加达机场",
                "dropoff": "蓬塔德尔加达机场",
                "distance": "约 220 公里",
                "drive_hours": "累计约 4.5 小时"
              },
              "note": "提前锁定自动挡。"
            },
            {
              "days_range": "Day 9 - Day 10",
              "type": "flight",
              "title": "洲际回程大闭环",
              "detail_title": "里斯本 ✈️ 马德里 ✈️ ${start_point}",
              "time_window": "Day 10 12:15起飞",
              "duration_desc": "耗时14小时",
              "cost_info": "含在机票总套票内",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "里斯本回马德里转机预留3小时。"
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
              {"name": "马德里", "lat": 40.4168, "lng": -3.7038, "role": "取车起始枢纽"},
              {"name": "里斯本", "lat": 38.7223, "lng": -9.1393, "role": "还车中转走廊"},
              {"name": "蓬塔德尔加达", "lat": 37.7412, "lng": -25.6756, "role": "圣米格尔岛"}
            ],
            "segments": [
              {"id": "flow-0", "mode": "drive", "coords": [[40.4168, -3.7038], [38.7223, -9.1393]]},
              {"id": "flow-1", "mode": "flight", "coords": [[38.7223, -9.1393], [37.7412, -25.6756]]},
              {"id": "flow-2", "mode": "flight", "coords": [[37.7412, -25.6756], [38.7223, -9.1393]]}
            ]
          }
        }
      ]
    }
    
    必须完整严密覆盖 ${days} 天的闭环时序，确保返回的 JSON 数据完全可以被立刻解析。`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1 // 降底发散度，提高生成速度和稳定性
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    let resultText = data.choices[0].message.content.trim();

    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return res.status(200).json(JSON.parse(resultText.trim()));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}