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

    // 💥 终极时序流水账提示词：强行锁死天数闭环，必须交代清楚取车、还车、每段纯驾车时间点
    const prompt = `你是一个骨灰级的跨国自驾规划专家与全栈行程精算师。
    当前需求：出发地【${start_point}】，目的地【${destination}】，总天数【${days}】天，出行人数【${travelers}】人。
    
    请精算并设计【2种】具有本质差异的宏观长途路线与交通骨架方案（例如方案一主打半岛全自驾+飞岛，方案二主打跨境高铁+海岛飞签）。
    你必须【仅仅】返回一个标准的 JSON 对象，绝对不要包含任何前言、后缀解释或 \`\`\`json 标记。
    
    格式必须百分之百精确如下：
    {
      "summary": "${start_point}至${destination}沙盘演练",
      "options": [
        {
          "option_id": 1,
          "option_name": "方案一：例如伊比利亚半岛自驾大循环+亚速尔飞岛版",
          "logic_desc": "一句话概括本路线的成本与时间衔接逻辑。",
          "total_group_cost": "￥28000",
          "cost_per_person": "￥14000",
          
          // 💥 时序流核心：从第1天到最后一天，按大交通移动顺序切分，严禁漏掉任何一天！
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight", // flight 或 drive 或 stay
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
              "title": "半岛自驾与跨境移防",
              "detail_title": "马德里取车 🚗 托莱多 🚗 里斯本还车",
              "time_window": "自驾取车时段: Day 2 上午 09:30",
              "duration_desc": "纯驾车累计耗时: 约7.5小时",
              "cost_info": "预计租车总额: ￥1800 (含跨境险)",
              "meta_json": {
                "pickup": "马德里巴拉哈斯机场 T4 柜台",
                "dropoff": "里斯本波尔特拉机场 T1 归还",
                "distance": "总行驶里程约 680 公里",
                "drive_hours": "平均每天驾车 2.5 小时"
              },
              "note": "进入葡萄牙境内需在前台主动激活Via Verde电子高快标签，走专用电子收费车道。"
            },
            {
              "days_range": "Day 5 - Day 8",
              "type": "flight",
              "title": "跨海海岛无缝切入",
              "detail_title": "里斯本 (LIS) ✈️ 蓬塔德尔加达 (PDL) 往返",
              "time_window": "去程班次: 08:00 - 09:30 / 回程班次: 18:30 - 21:55",
              "duration_desc": "单程航程: 2小时15分钟",
              "cost_info": "SATA/TAP航空往返人均: ￥1500",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "由于海岛行李额严格，建议精简托运行李，大件可寄存里斯本机场。"
            },
            {
              "days_range": "Day 9 - Day 10",
              "type": "flight",
              "title": "洲际回程大闭环",
              "detail_title": "马德里 (MAD) ✈️ 成都 (TFU)",
              "time_window": "起飞时段: Day 10 中午 12:15",
              "duration_desc": "耗时: 约14小时",
              "cost_info": "包含在国际往返总套票内",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "从里斯本回马德里建议搭配早班廉航（如瑞安航空，耗时1小时），预留3小时以上的中转行李托运时间。"
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
              {"name": "马德里", "lat": 40.4168, "lng": -3.7038, "role": "起始枢纽"},
              {"name": "里斯本", "lat": 38.7223, "lng": -9.1393, "role": "中转走廊"},
              {"name": "蓬塔德尔加达", "lat": 37.7412, "lng": -25.6756, "role": "海岛节点"}
            ],
            "segments": [
              {"id": "flow-0", "mode": "drive", "coords": [[40.4168, -3.7038], [38.7223, -9.1393]]},
              {"id": "flow-1", "mode": "flight", "coords": [[38.7223, -9.1393], [37.7412, -25.6756]]}
            ]
          }
        }
      ]
    }
    
    【极其变态的严苛审计指令】：
    1. timeline_flows 数组中的天数区间（days_range）相加，必须【百分之百等于】用户输入的总天数 ${days} 天。必须完成从 ${start_point} 出发、境内游玩、海岛跨越、最后回程的完整全生命周期闭环，严禁出现行程中途断流或遗漏天数的情况！
    2. 对于 type 为 drive 的段落，必须在 meta_json 中详细写明取车点（pickup）、还车点（dropoff）、预估公里数（distance）以及纯驾驶耗时（drive_hours）。
    3. 宏观地图坐标只需要返回欧洲境内的中转主轴线，严禁返回任何多余、细碎的非交通节点。`;

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