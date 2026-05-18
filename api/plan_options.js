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
    if (!apiKey) return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });

    // 💥 史诗级提示词：逼迫大模型必须把 10 天的自驾里程、去程还车、海岛内自驾、甚至最后回程全部连成铁链
    const prompt = `你是一个骨灰级的跨国自驾规划专家与全栈行程精算师。
    当前需求：出发地【${start_point}】，目的地【${destination}】，总天数【${days}】天，出行人数【${travelers}】人。
    
    请精算并设计【2种】具有本质差异的宏观长途交通、住宿和路线骨架方案。
    你必须【仅仅】返回一个标准的 JSON 对象，绝对不要包含任何前言、后缀解释或 \`\`\`json 标记。
    
    格式必须百分之百精确如下：
    {
      "summary": "${start_point}至${destination}沙盘演练",
      "options": [
        {
          "option_id": 1,
          "option_name": "方案一：例如半岛租车跨境大循环+亚速尔群岛飞岛自驾版",
          "logic_desc": "一句话概括本路线的成本与时间衔接逻辑。",
          "total_group_cost": "￥28000",
          "cost_per_person": "￥14000",
          
          // 💥 时序流：从第 1 天到最后一天，按大交通移动顺序切分，【必须包含全部 ${days} 天，严禁留空白】！
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight",
              "title": "洲际国际大交通（成都出发）",
              "detail_title": "成都 (TFU) ✈️ 马德里 (MAD)",
              "time_window": "参考时段: 14:20 - 20:15",
              "duration_desc": "耗时: 约12.5小时",
              "cost_info": "人均单程约 ￥4500 (含税)",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "建议抵达后直接入住巴拉哈斯机场附近酒店，倒时差恢复精力。"
            },
            {
              "days_range": "Day 2 - Day 4",
              "type": "drive",
              "title": "伊比利亚半岛跨境自驾",
              "detail_title": "马德里取车 🚗 托莱多 🚗 里斯本还车",
              "time_window": "自驾取车时段: Day 2 上午 09:30",
              "duration_desc": "纯驾车累计耗时: 约7.5小时",
              "cost_info": "预计租车总额: ￥1800 (含跨境险)",
              "meta_json": {
                "pickup": "马德里巴拉哈斯机场 T4 柜台",
                "dropoff": "里斯本波尔特拉机场 T1 归还",
                "distance": "总行驶里程约 680 公里",
                "drive_hours": "纯驾车约 6.5 小时"
              },
              "note": "进入葡萄牙境内需在前台主动激活Via Verde电子高快标签，走专用电子收费车道。"
            },
            {
              "days_range": "Day 5 - Day 8",
              "type": "flight",
              "title": "跨海飞行往返与海岛局部自驾",
              "detail_title": "里斯本 (LIS) ✈️ 蓬塔德尔加达 (PDL) 往返 + 岛上自驾",
              "time_window": "去程班次: 08:00 - 09:30 / 回程班次: 18:30 - 21:55",
              "duration_desc": "单程航程: 2小时15分钟",
              "cost_info": "SATA航空往返人均 ￥1500 + 岛上3天租车 ￥1200",
              "meta_json": {
                "pickup": "亚速尔蓬塔德尔加达机场取车",
                "dropoff": "亚速尔蓬塔德尔加达机场还车",
                "distance": "环岛总行驶里程约 220 公里",
                "drive_hours": "累计驾车约 4.5 小时"
              },
              "note": "亚速尔圣米格尔岛多盘山急弯和雨雾，务必提早锁定自动挡车型。"
            },
            {
              "days_range": "Day 9 - Day 10",
              "type": "flight",
              "title": "半岛中转与洲际回程大闭环",
              "detail_title": "里斯本 (LIS) ✈️ 马德里 (MAD) ✈️ 成都 (TFU)",
              "time_window": "里斯本飞马德里: 06:00-08:15 / 马德里飞成都: 12:15 起飞",
              "duration_desc": "耗时: 约15.5小时",
              "cost_info": "包含在国际往返总套票及中转廉航内",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "从里斯本回马德里转机预留3小时以上，以防廉航延误耽误国际大交通回国。"
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
              {"name": "马德里", "lat": 40.4168, "lng": -3.7038, "role": "起始枢纽/一期自驾点"},
              {"name": "里斯本", "lat": 38.7223, "lng": -9.1393, "role": "中转走廊/还车转机点"},
              {"name": "蓬塔德尔加达", "lat": 37.7412, "lng": -25.6756, "role": "亚速尔圣米格尔海岛目的地"}
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
    
    【极其严苛的审计红线】：
    1. timeline_flows 必须严密覆盖从 Day 1 到 Day ${days} 的每一天！自驾不能只写前几天，后面的海岛自驾（取还车、耗时、里程）和回程中转大闭环必须无缝写出来！
    2. 对于 type 为 drive 的段落，必须在 meta_json 中写明取车点（pickup）、还车点（dropoff）、预估公里数（distance）以及纯驾驶耗时（drive_hours）。
    3. 宏观地图只保留主要枢纽路线，严禁返回无关细碎小节点。`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
    });

    if (!response.ok) { const errorData = await response.text(); return res.status(response.status).json({ error: `DeepSeek 报错: ${errorData}` }); }
    const data = await response.json();
    let resultText = data.choices[0].message.content.trim();
    if (resultText.startsWith('```')) { resultText = resultText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, ''); }
    return res.status(200).json(JSON.parse(resultText.trim()));
  } catch (error) {
    console.error(error); return res.status(500).json({ error: "后端逻辑崩溃：" + error.message });
  }
}