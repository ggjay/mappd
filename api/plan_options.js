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
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    
    const { start_point, destination, days, travelers } = body;

    const apiKey = process.env.DEEPSEEK_API_KEY; 
    if (!apiKey) {
      return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });
    }

    const prompt = `你是一个跨国旅行总设计师与首席财务精算师。
    当前需求：出发地【${start_point}】，目的地【${destination}】，总天数【${days}】天，出行人数【${travelers}】人。
    
    请精算并设计【2种】具有明显差异化的宏观交通与路线骨架方案。
    你必须【仅仅】返回一个标准的 JSON 对象，绝对不要包含任何前言、后缀解释或 \`\`\`json 标记。
    
    格式必须百分之百精确如下：
    {
      "summary": "${start_point}出发前往${destination}的${days}天${travelers}人宏观规划",
      "options": [
        {
          "option_id": 1,
          "option_name": "方案一：例如性价比同国租还精算版",
          "logic_desc": "核心底层逻辑概括。",
          "total_group_cost": "￥25000",
          "cost_per_person": "￥12500",
          "flights": [
            {
              "segment": "国际往返",
              "route": "${start_point} ↔ 马德里",
              "cost_per_person": "￥6500",
              "note": "中转建议"
            }
          ],
          "car_rentals": [
            {
              "region": "伊比利亚半岛段",
              "route": "马德里取还",
              "days": 4,
              "total_car_cost": "￥1600",
              "alert": "跨境避坑提示。"
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
              {"name": "马德里", "lat": 40.4168, "lng": -3.7038, "role": "枢纽/自驾起点"},
              {"name": "蓬塔德尔加达", "lat": 37.7412, "lng": -25.6756, "role": "亚速尔海岛目的地"}
            ],
            "segments": [
              {
                "days_label": "Day 1-3",
                "mode": "drive",
                "title": "🚗 自驾跨国走廊",
                "coords": [[40.4168, -3.7038], [38.7223, -9.1393]]
              },
              {
                "days_label": "Day 4-7",
                "mode": "flight",
                "title": "✈️ 跨海飞岛航线",
                "coords": [[38.7223, -9.1393], [37.7412, -25.6756]]
              }
            ]
          }
        }
      ]
    }
    
    【极其关键的要求】：
    1. macro_route 内部的 anchors 和 segments 只需要包含欧洲境内的具体旅游移动轨迹（如马德里、里斯本、波尔图、蓬塔德尔加达等）。【不要】把出发地（如成都）的经纬度塞进 segments 或 polyline 里，长途国际大交通由左侧卡片的文字体现即可！
    2. center_lat、center_lng 和 zoom_level 的设置要刚好能完美把伊比利亚半岛和亚速尔群岛完整圈进地图视野中（通常 lat 在38-40左右，lng在-10到-15左右，zoom为4或5）。
    3. 确保 segments 数组中的每一项都包含天数标签（days_label）和出行方式（mode: drive 或 flight）。`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
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
    resultText = resultText.trim();

    return res.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "服务器内部错误：" + error.message });
  }
}