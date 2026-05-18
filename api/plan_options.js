export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS' || req.method === 'GET') {
    res.status(200).end();
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
    
    const { start_point, destination, days, travelers } = body;
    const apiKey = process.env.DEEPSEEK_API_KEY; 
    if (!apiKey) return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });

    // 💥 极度硬核的财务与时空精算提示词
    const prompt = `你是一个骨灰级的跨国自驾规划专家与资深行程精算师。
    当前需求：出发地【${start_point}】，目的地【${destination}】，总天数【${days}】天，出行人数【${travelers}】人。
    
    请精算并设计【2种】具有本质差异的宏观长途大路线方案（例如方案一主打全自驾大循环，方案二主打双城高铁+飞岛）。
    你必须【仅仅】返回一个标准的 JSON 对象，绝对不要包含任何前言、后缀解释或 \`\`\`json 标记。
    
    格式必须百分之百精确如下：
    {
      "summary": "${start_point}至${destination}沙盘对比",
      "options": [
        {
          "option_id": 1,
          "option_name": "方案一：伊比利亚半岛全自驾+亚速尔飞岛精算版",
          "logic_desc": "核心底层逻辑概括。",
          "total_group_cost": "￥28000",
          "cost_per_person": "￥14000",
          "flights": [
            {
              "segment": "国际往返主干线 / 境内跨海航段",
              "route": "${start_point} (TFU) ↔ 马德里 (MAD)",
              "cost_per_person": "￥6500",
              "flight_time": "去程: 14:20-20:15(+1) / 回程: 11:30-06:00",
              "duration": "约12-15小时(含中转)",
              "note": "建议考虑国航直飞或中东航司中转"
            }
          ],
          "car_rentals": [
            {
              "region": "车辆自驾范围（如：西葡陆路跨境段）",
              "pickup_location": "马德里巴拉哈斯机场 T4",
              "dropoff_location": "里斯本机场 T1 (涉及跨国异地还车)",
              "total_car_cost": "￥4500",
              "drive_segments": [
                {
                  "from_to": "马德里 ↔ 托莱多 ↔ 里斯本",
                  "distance": "约650公里",
                  "drive_duration": "纯驾车约6.5小时",
                  "days_range": "Day 1 - Day 3"
                }
              ],
              "alert": "必须向车行购买跨境险（Cross-border fee, 约50欧）。葡萄牙电子高速收费需在前台绑卡租赁Via Verde设备。"
            }
          ],
          "accommodation": [
            {
              "city": "停留城市",
              "nights": 3,
              "avg_price_per_night": "￥900",
              "total_cost": "￥2700"
            }
          ],
          "macro_route": {
            "center_lat": 39.5, 
            "center_lng": -8.0,
            "zoom_level": 5,
            "anchors": [
              {"name": "马德里", "lat": 40.4168, "lng": -3.7038, "role": "枢纽港/自驾起点"},
              {"name": "里斯本", "lat": 38.7223, "lng": -9.1393, "role": "自驾终点/飞岛始发"},
              {"name": "蓬塔德尔加达", "lat": 37.7412, "lng": -25.6756, "role": "亚速尔圣米格尔目的地"}
            ],
            "segments": [
              {
                "days_label": "Day 1-3",
                "mode": "drive",
                "title": "西葡陆路自驾",
                "coords": [[40.4168, -3.7038], [38.7223, -9.1393]]
              },
              {
                "days_label": "Day 4-8",
                "mode": "flight",
                "title": "跨海飞行往返",
                "coords": [[38.7223, -9.1393], [37.7412, -25.6756]]
              }
            ]
          }
        }
      ]
    }
    
    【精算师特殊红线指令】：
    1. flights 里面的 flight_time 和 duration 绝对不能留空，必须根据历史常识给出具体的推荐起降时间段或班次特征！
    2. car_rentals 内部的 drive_segments 必须细化，把从哪个城市到哪个城市、预估多少公里、开车要开几个小时，全部清清楚楚地算出来！
    3. 地图 macro_route 内的 anchors 数量要极简化（只留大轴心城市，控制在3-4个以内），绝对不要返回密密麻麻的细碎小镇，防止前端地图重叠溃烂！`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: `DeepSeek 报错: ${errorData}` });
    }

    const data = await response.json();
    let resultText = data.choices[0].message.content.trim();

    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return res.status(200).json(JSON.parse(resultText.trim()));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "服务器内部错误：" + error.message });
  }
}