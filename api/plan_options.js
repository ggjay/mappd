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

    // 💥 完美动态化 Prompt：移除死死锁定的亚速尔，完全根据用户的 destination 智能生成
    const prompt = `你是一个骨灰级的跨国长途自驾规划专家与全栈行程精算师。
    当前用户定制需求：出发地【${start_point}】，具体目的地群【${destination}】，总行程天数【${days}】天，出行人数【${travelers}】人。
    
    请针对用户的目的地定制设计【2种】具有本质路线逻辑差异的宏观长途交通、住宿与路线骨架方案（必须完全围绕 ${destination} 展开，严禁胡乱拼凑其他无关城市）。
    你必须【仅仅】返回一个标准的纯净 JSON 对象，严禁包含任何 \`\`\`json 格式代码块包装，严禁带有前言和后缀废话。

    【极其严格的 1:1 时序闭环映射红线】：
    1. timeline_flows 数组代表左侧按时间顺序平铺的步骤卡片，必须严密覆盖从 Day 1 到 Day ${days} 的全部天数，绝对不准留白或中途断流！
    2. macro_route.segments 代表右侧地图上的空间几何流线，其【线段数量、前后顺序】必须与 timeline_flows 中的步骤卡片【百分之百完全 1:1 镜像对齐】！
    3. 如果是行程中的“回程”、“倒流”或“归航”航段，segments 中对应线段的 "is_return" 必须设为 true，且 coords 中的起终点坐标要写成反向，从而让地图上的蚂蚁线完美的往返反向流动！
    4. 如果是始发地的洲际大飞机（例如成都飞往欧洲），在 segments 中可以将 coords 的起点与终点设为完全相同的值（例如 [[40.4, -3.7], [40.4, -3.7]]），前端会自动忽略这段原地多余连线。
    5. 所有的地理坐标坐标点，必须全部采用严格的浮点数二维数组，例如：[40.4168, -3.7038]，绝对不准返回字符串或字典对象！

    格式规范如下：
    {
      "summary": "${start_point}至${destination}时序沙盘演练",
      "options": [
        {
          "option_id": 1,
          "option_name": "结合目的地具体生成的方案一名称（如：半岛自驾纵贯线）",
          "logic_desc": "一句话深度概括本路线的成本与时序咬合逻辑。",
          "total_group_cost": "￥28000",
          "cost_per_person": "￥14000",
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight",
              "title": "大交通节点名称",
              "detail_title": "具体始发地 ✈️ 境内主枢纽城市",
              "time_window": "时间段描述",
              "duration_desc": "耗时描述",
              "cost_info": "开销分摊描述",
              "meta_json": { "pickup": "无", "dropoff": "无", "distance": "无", "drive_hours": "无" },
              "note": "时序落地提醒。"
            }
          ],
          "accommodation_summary": [
            {"city": "城市名称", "nights": 2, "avg_price": "￥900", "total": "￥1800"}
          ],
          "macro_route": {
            "center_lat": 39.5, 
            "center_lng": -3.7, 
            "zoom_level": 6,
            "anchors": [
              {"name": "枢纽城市A", "latlng": [40.4168, -3.7038]}
            ],
            "segments": [
              { "mode": "flight", "is_return": false, "coords": [[40.4168, -3.7038], [40.4168, -3.7038]] }
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