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

    // 💥 纯净大盘对照组精算提示词
    const prompt = `你是一个专门为极致追求掌控感的 J人自由行打造的大路线骨架时序决策精算大模型。
    需求输入：出发地【${start_point}】，目的地城市群【${destination}】，总天数【${days}】天，人数【${travelers}】人。
    用户倾向标签：自驾偏好=${hasDrive}，轨道交通偏好=${hasTrain}。

    请针对目的地【${destination}】定制精算生成【两种】具有强烈对比和决策参考价值的宏观大路线时序方案。
    - 方案一：百分之百严格顺从用户的首选偏好倾向。
    - 方案二：作为前瞻性对照组方案（如方案一出了自驾，方案二则必须出高铁公共通勤对比，反之亦然）。

    【1:1 宏观总线对齐暗号】
    1. timeline_flows 数组代表左侧按时间顺序平铺的宏观交通卡片，必须严密覆盖从 Day 1 到 Day ${days} 的跨度，不准漏天。
    2. macro_route.segments 数组中的线段数量，必须与 timeline_flows 中的步骤卡片【数量完全 1:1 呈镜像顺序对齐】！
    3. 如果是回程段，segments 里的 is_return 必须标为 true，且 coords 颠倒方向。
    4. 所有地理坐标全部采用浮点数二维数组，例如：[40.7128, -74.0060]。

    严禁包含任何 \`\`\`json 格式代码包装，直接吐出纯净 JSON：
    {
      "summary": "${start_point}至${destination}大路线时序沙盘演练",
      "options": [
        {
          "option_id": 1,
          "option_name": "围绕 ${destination} 生成的宏观对比方案名称",
          "logic_desc": "一句话概括本方案如何咬合用户的出行倾向利弊。",
          "total_group_cost": "￥团队总额",
          "cost_per_person": "￥全员人均",
          "timeline_flows": [
            {
              "days_range": "Day 1",
              "type": "flight", // flight 或 drive 或 train
              "title": "航段/交通大节点主题",
              "detail_title": "${start_point} ✈️ 目的地枢纽城市",
              "time_window": "参考时间窗波段",
              "duration_desc": "大交通通勤时耗",
              "cost_info": "开销占比说明",
              "note": "对J人至关重要的过关/转机/防踩坑时序指南。"
            },
            {
              "days_range": "Day 2 - Day 5",
              "type": "drive",
              "title": "城际走廊区域级通勤",
              "detail_title": "城市A取车 🚗 城市B还车",
              "time_window": "节点接驳时段",
              "duration_desc": "累计驾驶时长",
              "meta_json": { "pickup": "推荐门店", "dropoff": "推荐门店", "distance": "约 XXX 公里", "drive_hours": "纯驾车时耗" },
              "note": "路税、电子标签、车务防坑指南。"
            }
          ],
          "accommodation_summary": [
            {"city": "城市名称", "nights": 4, "avg_price": "￥均价", "total": "￥小计"}
          ],
          "macro_route": {
            "center_lat": 目的地的中心点纬度,
            "center_lng": 目的地的中心点经度,
            "zoom_level": 5,
            "anchors": [
              {"name": "枢纽城市名", "latlng": [纬度, 经度]}
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