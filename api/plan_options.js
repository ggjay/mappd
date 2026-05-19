export default async function handler(req, res) {
  // 注入全量跨域安全头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS' || req.method === 'GET') { res.status(200).end(); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
    
    // 💥 严密解构前端组件 A 派发过来的全新参数
    const { start_point, destination, days, travelers, hasDrive, hasTrain } = body;

    const apiKey = process.env.DEEPSEEK_API_KEY; 
    if (!apiKey) return res.status(200).json({ error: "API KEY Missing" });

    // 💥 终极精算师提示词：消灭一切硬编码，完全动态针对 ${destination} 泛化推演
    const prompt = `你是一个专门为极致追求掌控感、消灭不确定性的 J人自由行打造的大路线骨架时序精算大模型。
    
    【当下核心输入红线】
    - 出发城市：【${start_point}】
    - 目的地城市群/国家：【${destination}】
    - 总行程天数约束：【${days}】天（必须严格无缝覆盖，不准多一天或少一天！）
    - 旅行人数分摊基数：【${travelers}】人
    - 用户首选偏好倾向标签：自驾偏好=${hasDrive}，轨道交通偏好=${hasTrain}

    请针对目的地【${destination}】定制精算生成【两种】具有强烈对比和决策参考价值的宏观大路线时序方案。
    
    【沙盘对照组推荐策略（极其重要）】：
    - 方案一：必须【百分之百严格顺从】用户的首选倾向标签（例如若自驾偏好为true，则必须出该目的地的纯自驾/租车大循环路线）。
    - 方案二：必须作为【前瞻性对照组方案】。即使解除了自驾，也要在方案二中主动推演包含自驾、跨城通勤等更具时序效率的混合交通组合，给规划者提供无死角利弊对比。

    【1:1 时序闭环映射红线】
    1. timeline_flows 数组中的步骤卡片数量，必须与 macro_route.segments 数组中的几何线段数量【严格 1:1 顺序对齐】。
    2. timeline_flows 里的 days_range 必须严格从 Day 1 递增排满到 Day ${days}，不准跳天，不准留白断流。
    3. 如果是回程、倒流、归航段，segments 中对应线段的 is_return 必须设为 true，且 coords 内部起终点坐标需要和去程反向，以便让蚂蚁线反方向倒流。
    4. 国际大交通段（如从 ${start_point} 飞往洲际目的地），在 segments 中可将 coords 起点终点设为相同坐标（如 [[40.0, -100.0], [40.0, -100.0]]），前端会自动处理文字而不画出冗余连线。
    5. 所有的地理坐标点坐标，必须全部采用严格的 [纬度, 经度] 浮点数二维数组，例如美国纽约 [40.7128, -74.0060]，禁止返回字符串或对象。

    请直接返回一个标准的纯净 JSON 对象，严禁包含任何 \`\`\`json 格式标记，严禁带有前言后缀：
    {
      "summary": "${start_point}至${destination}大路线时序对照演盘",
      "options": [
        {
          "option_id": 1,
          "option_name": "结合 ${destination} 动态生成的方案一名称（如：美西国家公园自驾大环线）",
          "logic_desc": "一句话深度阐明此方案如何闭合用户给出的原始偏好倾向。",
          "total_group_cost": "￥团队总开销",
          "cost_per_person": "￥人均分摊开销",
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight", // flight 或 drive 或 train
              "title": "航段/交通主题名称",
              "detail_title": "${start_point} ✈️ 目标城市机场",
              "time_window": "参考时间窗口（如: 12:00 - 18:30）",
              "duration_desc": "耗时描述",
              "cost_info": "预算分摊说明",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "对J人至关重要的转机/过关防踩坑指南。"
            },
            {
              "days_range": "Day 2 - Day 4",
              "type": "drive",
              "title": "大路线区域级通勤",
              "detail_title": "城市A取车 🚗 途径点 🚗 城市B还车",
              "time_window": "节点交接时段",
              "duration_desc": "累计驾驶耗时",
              "cost_info": "预估车务花销",
              "meta_json": {
                "pickup": "精准推荐的取车门店（如洛杉矶机场店）",
                "dropoff": "精准推荐的还车门店",
                "distance": "全程约 XXX 公里",
                "drive_hours": "每日平均驾驶时长"
              },
              "note": "跨境/跨州车务防坑、电子路税、燃油政策高亮白皮书。"
            }
          ],
          "accommodation_summary": [
            {"city": "留宿城市", "nights": 3, "avg_price": "￥均价", "total": "￥小计"}
          ],
          "macro_route": {
            "center_lat": 目的地的中心纬度浮点数,
            "center_lng": 目的地的中心经度浮点数,
            "zoom_level": 4, // 适合展现该目的地全景的 Leaflet 缩放级别 (通常 4-6)
            "anchors": [
              {"name": "主要枢纽点城市名", "latlng": [纬度浮点数, 经度浮点数]}
            ],
            "segments": [
              { "mode": "flight", "is_return": false, "coords": [[纬度, 经度], [纬度, 经度]] }
            ]
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