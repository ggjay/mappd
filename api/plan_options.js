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
    if (!apiKey) return res.status(200).json({ error: "API KEY Missing" });

    const prompt = `针对用户前往 ${destination} 的行程设计2种宏观规划骨架。总天数 ${days} 天，人数 ${travelers} 人，出发地 ${start_point}。
    你必须仅仅返回一个标准的纯净 JSON 对象，严禁包含任何 \`\`\`json 格式代码标记。
    
    【核心对齐律】
    1. timeline_flows 数组中的步骤卡片数量，必须与 macro_route.segments 数组中的线段数量【严格 1:1 呈镜像顺序对齐】！
    2. 如果是回程段，segments 里的 is_return 必须标为 true。
    3. 国际大交通段（例如成都到马德里），在 segments 中可以将起点和终点坐标设为相同（如 [[40.4168, -3.7038], [40.4168, -3.7038]]），前端会自动忽略其连线，使其只在文字卡片中沉淀。

    格式规范如下：
    {
      "summary": "大路线时序沙盘演练",
      "options": [
        {
          "option_id": 1,
          "option_name": "方案一：伊比利亚纵贯线自驾 + 亚速尔群岛跨海大闭环",
          "logic_desc": "长途交通同国进出精算省钱方案。",
          "total_group_cost": "￥26000",
          "cost_per_person": "￥13000",
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight",
              "title": "洲际国际大交通航线",
              "detail_title": "${start_point} ✈️ 马德里",
              "time_window": "参考时段: 14:20 - 20:15",
              "duration_desc": "12.5小时",
              "cost_info": "机票总额已含",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "抵达后直接入住巴拉哈斯机场附近酒店休息。"
            },
            {
              "days_range": "Day 2 - Day 4",
              "type": "drive",
              "title": "跨境长途走廊自驾",
              "detail_title": "马德里取车 🚗 里斯本还车",
              "time_window": "取车: Day 2 09:30",
              "duration_desc": "累计约 7.5小时",
              "cost_info": "预计车费共 ￥1800",
              "meta_json": {
                "pickup": "马德里机场 T4",
                "dropoff": "里斯本机场 T1",
                "distance": "约 680 公里",
                "drive_hours": "纯驾车约 6.5 小时"
              },
              "note": "前台主动申办并租赁 Via Verde 设备。"
            },
            {
              "days_range": "Day 5 - Day 7",
              "type": "flight",
              "title": "跨海海岛切入航线 (去程)",
              "detail_title": "里斯本 ✈️ 蓬塔德尔加达",
              "time_window": "去程班次: 08:00 - 09:15",
              "duration_desc": "航程 2h15m",
              "cost_info": "单程约 ￥750",
              "meta_json": {
                "pickup": "蓬塔德尔加达机场柜台",
                "dropoff": "蓬塔德尔加达机场还车",
                "distance": "岛上环线自驾 220 公里",
                "drive_hours": "累计约 4.5 小时"
              },
              "note": "群岛地形多雾多山路，尽早锁定自动挡车型。"
            },
            {
              "days_range": "Day 8 - Day 9",
              "type": "flight",
              "title": "海岛归航返回半岛 (回程)",
              "detail_title": "蓬塔德尔加达 ✈️ 里斯本",
              "time_window": "回程班次: 18:30 - 21:45",
              "duration_desc": "航程 2h15m",
              "cost_info": "单程约 ￥750",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "返回里斯本，准备切回国际枢纽大闭环。"
            },
            {
              "days_range": "Day 10",
              "type": "flight",
              "title": "半岛中转与洲际回程闭环",
              "detail_title": "里斯本 ✈️ 马德里 ✈️ ${start_point}",
              "time_window": "Day 10 12:15 起飞",
              "duration_desc": "总航程约 14.5小时",
              "cost_info": "已包含在往返国际总套票内",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "从里斯本至马德里的航段建议预留至少 3 小时中转防延误。"
            }
          ],
          "accommodation_summary": [
            {"city": "马德里", "nights": 2, "avg_price": "￥900", "total": "￥1800"},
            {"city": "里斯本", "nights": 4, "avg_price": "￥1100", "total": "￥4400"},
            {"city": "亚速尔群岛", "nights": 3, "avg_price": "￥800", "total": "￥2400"}
          ],
          "macro_route": {
            "center_lat": 39.5, "center_lng": -14.0, "zoom_level": 5,
            "anchors": [
              {"name": "马德里", "latlng": [40.4168, -3.7038], "role": "起始自驾点"},
              {"name": "里斯本", "latlng": [38.7223, -9.1393], "role": "还车中转走廊"},
              {"name": "蓬塔德尔加达", "latlng": [37.7412, -25.6756], "role": "亚速尔度假岛"}
            ],
            "segments": [
              { "mode": "flight", "is_return": false, "coords": [[40.4168, -3.7038], [40.4168, -3.7038]] },
              { "mode": "drive", "is_return": false, "coords": [[40.4168, -3.7038], [38.7223, -9.1393]] },
              { "mode": "flight", "is_return": false, "coords": [[38.7223, -9.1393], [37.7412, -25.6756]] },
              { "mode": "flight", "is_return": true, "coords": [[37.7412, -25.6756], [38.7223, -9.1393]] },
              { "mode": "flight", "is_return": true, "coords": [[38.7223, -9.1393], [40.4168, -3.7038]] }
            ]
          }
        }
      ]
    }
    确保时序无空缺漏洞。`;

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