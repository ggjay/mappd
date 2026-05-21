 export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS' || req.method === 'GET') { res.status(200).end(); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
    const { start_point, destination, days, travelers, hasDrive, hasTrain } = body;

    const apiKey = process.env.DEEPSEEK_API_KEY; 
    if (!apiKey) return res.status(200).json({ error: "API KEY Missing" });

    // 💥 融入 J人5维精算核心标签的深度 Prompt 提示词
    const prompt = `你是一个专门为极致追求掌控感的 J人自由行打造的大路线骨架时序决策精算大模型。
    输入：出发地【${start_point}】，目的地城市群【${destination}】，总天数【${days}】天，人数【${travelers}】人。
    自驾偏好=${hasDrive}，轨道交通偏好=${hasTrain}。

    请生成【两种】具有强烈对比和决策参考价值的宏观大路线方案。
    - 方案一：顺从偏好。
    - 方案二：前瞻性对照组（即使用户勾选或取消了自驾，也要在方案二中提供自驾或轨道大交通方案作为全无死角利弊对比）。

    【J人硬核卡片要素规范】：
    1. 必须提炼出核心策略标签（如: "预算精算解", "效率天花板", "自驾骨灰推荐", "深度留白首选"）。
    2. 必须精算出三个硬核考核指标：纯玩时间占比、单日最大通勤时耗、供应链确定性百分比。
    3. timeline_flows 和 macro_route.segments 的数量必须【严格 1:1 镜像对齐】，coords 必须全为浮点数 [纬度, 经度] 二维数组。

    直接吐出纯净 JSON 格式：
    {
      "summary": "${start_point}至${destination}大路线时序决策沙盘",
      "options": [
        {
          "option_id": 1,
          "option_name": "结合 ${destination} 提炼的精算方案名称",
          "strategy_tag": "效率天花板 / 预算精算解 / 自驾骨灰推荐", 
          "pure_play_days": "10.5天 / ${days}天",
          "max_commute_hours": "4.5 小时",
          "certainty_rate": "92%",
          "logic_desc": "一句话深度拆解本方案如何闭合不确定性风险。",
          "total_group_cost": "￥团队总花销",
          "cost_per_person": "￥全员人均",
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight",
              "title": "航段大节点",
              "detail_title": "${start_point} ✈️ 目标枢纽城市",
              "time_window": "参考时段",
              "duration_desc": "通勤耗时",
              "note": "过关/中转防踩坑时序警示。"
            }
          ],
          "macro_route": {
            "center_lat": 目的地的中心点纬度浮点数,
            "center_lng": 目的地的中心点经度浮点数,
            "zoom_level": 4, 
            "anchors": [{"name": "主要城市名", "latlng": [纬度, 经度]}],
            "segments": [{ "mode": "flight", "is_return": false, "coords": [[纬度, 经度], [纬度, 经度]] }]
          }
        }
      ]
    }`;

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
