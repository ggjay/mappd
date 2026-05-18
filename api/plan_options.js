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

    // 💥 专为大路线资产清算打造的精细化提示词
    const prompt = `你是一个天花板级别的跨国旅行总设计师与首席财务精算师。
    当前用户需求：出发地是【${start_point}】，目的地是【${destination}】，总天数【${days}】天，出行人数【${travelers}】人。
    
    请你针对这个长途复杂行程，精算并设计【2种】具有明显差异化的宏观长途交通、住宿和路线骨架方案。
    
    你必须【仅仅】返回一个标准的 JSON 对象，绝对不要包含任何前言、后缀解释或 \`\`\`json 标记。
    
    格式必须百分之百精确如下：
    {
      "summary": "${start_point}出发前往${destination}的${days}天${travelers}人宏观规划方案对比",
      "options": [
        {
          "option_id": 1,
          "option_name": "方案一：例如性价比同国租还精算版",
          "logic_desc": "一句话概括这个路线在省钱或省时上的核心底层逻辑。",
          "total_group_cost": "整个团队的总预算预估数字（如：￥25000）",
          "cost_per_person": "人均预估数字（如：￥12500）",
          "flights": [
            {
              "segment": "航段描述，如：国际往返/跳岛飞行",
              "route": "机场或城市缩写连线，如：${start_point} ↔ 马德里",
              "cost_per_person": "￥6500",
              "note": "中转或航司选择建议"
            }
          ],
          "car_rentals": [
            {
              "region": "自驾区域，如：伊比利亚半岛段/亚速尔群岛段",
              "route": "马德里取还",
              "days": 4,
              "total_car_cost": "￥1600",
              "alert": "核心交通避坑指南，比如跨境险、特殊过路费规则等。"
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
            "center_lat": 40.4168, 
            "center_lng": -3.7038,
            "zoom_level": 4,
            "anchors": [
              {"name": "${start_point}", "lat": 30.5728, "lng": 104.0668, "role": "出发地"},
              {"name": "主城市A", "lat": 40.4168, "lng": -3.7038, "role": "中转枢纽/自驾点"}
            ],
            "polyline": [
              [30.5728, 104.0668],
              [40.4168, -3.7038]
            ]
          }
        }
      ]
    }
    
    请严格按照以上 JSON 结构生成，确保 macro_route.polyline 的数组顺序能够按照交通工具的移动流向闭环（如包含回程）。确保 lat 和 lng 是真实的城市中心数字经纬度。`;

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
      return res.status(response.status).json({ error: `DeepSeek 接口报错: ${errorData}` });
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
    return res.status(500).json({ error: "后端处理错误：" + error.message });
  }
}