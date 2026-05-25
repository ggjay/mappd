export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
    if (req.method === 'OPTIONS' || req.method === 'GET') { res.status(200).end(); return; }
  
    try {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
      const { start_point, destination, days, travelers, hasDrive, hasTrain, travel_styles = [] } = body;

      const STYLE_LABELS = {
        nature: '自然风景（山水、国家公园、海岸等自然景观优先）',
        culture: '城市人文（历史街区、博物馆、建筑地标优先）',
        food: '在地美食（特色餐饮、市集、地方风味优先）',
        relaxed: '慢节奏（减少赶场，留足自由活动时间）',
        niche: '小众探索（避开热门打卡，倾向非网红目的地）',
      };
      const styleLabels = (Array.isArray(travel_styles) ? travel_styles : [])
        .filter(s => STYLE_LABELS[s])
        .map(s => STYLE_LABELS[s]);
      const styleConstraint = styleLabels.length > 0
        ? styleLabels.map((s, i) => `  ${i + 1}. ${s}`).join('\n')
        : '  用户未指定风格偏好，按目的地资源与天数自由平衡';

      const apiKey = process.env.DEEPSEEK_API_KEY; 
      if (!apiKey) return res.status(200).json({ error: "API KEY Missing" });
  
      const prompt = `# 角色定义
  你是一个专业旅游路线规划师，专门执行 [Mappd 大路线规划 Skill]。
  
  # 用户画像与场景参数
  - 出发城市：【${start_point}】
  - 目的地大区：【${destination}】
  - 出行天数：【${days}】天
  - 出行人数：【${travelers}】人
  - 偏好快照：自驾倾向=${hasDrive}，公共轨道交通倾向=${hasTrain}
  
  # 旅游风格（软约束，不可违反硬规则）
  用户勾选的风格偏好如下。这些偏好仅用于意图理解与路线取舍倾向，优先级低于地理聚类、天数守恒等硬规则；多个偏好并存时尽量兼顾，冲突时以地理合理性为先。
${styleConstraint}
  
  # 规划规则（硬规则，违反任意一条即无效）
  规则1 · 单向动线
  除出发城市外，路线中任何城市不得出现两次。出发城市可作起终点复用。
  
  规则2 · 地理聚类
  相邻节点必须地理相邻或交通顺路，禁止跳跃排列。地理合理性优先于景点知名度。在 nodes 数组中请给出这些城市真实的中国城市标准经纬度 [纬度, 经度] 浮点数。
  
  规则3 · 天数守恒
  所有 nights 之和 + 长途交通天数（单程>4h 占 0.5天）= 总天数。任意节点最少 1 晚。
  
  规则4 · 取舍说明必填
  planning_logic 必须说明放弃了哪些目的地及原因。禁止只描述去的地方。
  
  规则5 · 风格自动推断
  从人员构成+天数推断密度：≤4天=高密度1-2节点；5-7天=中密度2-3节点；8-12天=3-4节点；≥13天=4-5节点。含小孩/老人节点-1且避高海拔；情侣优先浪漫感；朋友团密度可上浮。
  
  规则6 · 预算标准
  以舒适型标准估算。note 注明"以上为参考估算，实际以预订价格为准"。
  
  # 输出格式
  严格只输出一个符合标准合法的 JSON 对象。绝对不输出任何解释文字、前缀语句、Markdown 代码块标记（如 \`\`\`json ）。
  
  # 必须包含的字段格式规范
  {
    "headline": "20字以内带有策略特色的方案大标题",
    "planning_logic": "2-3句，清晰指明选了什么、放弃了什么、以及为什么放弃的底层逻辑",
    "experience_tags": ["标签1", "标签2", "标签3"],
    "route_overview": "城市A → 城市B → 城市C 格式的链条",
    "nodes": [{ "city": "城市名", "nights": 1, "core_value": "核心价值留宿原因", "latlng": [25.04, 102.73] }],
    "roundtrip": {
      "outbound": { "method": "去程大交通方式说明", "duration": "耗时描述", "price_ref": "参考价格" },
      "return": { "method": "回程大交通方式说明", "duration": "耗时描述", "price_ref": "参考价格" }
    },
    "accommodation": [{ "nights_label": "第X晚", "location": "留宿特定商圈", "type": "推荐类型", "reason": "J人防防意外推荐理由", "price_range": "价格参考" }],
    "segment_transport": [{ "from": "城市A", "to": "城市B", "method": "接驳交通工具", "self_drive_rec": true, "reason": "J人决策取舍原因" }],
    "cost_estimate": { "transport": 1500, "accommodation": 2000, "food": 1000, "attraction": 600, "total_per_person": "5000-6500", "note": "以上为参考估算，实际以预订价格为准" },
    "peak_season_alert": "仅国庆/五一/暑假旺季时输出的避坑提示文案"
  }`;
  
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ 
          model: 'deepseek-chat', 
          messages: [{ role: 'user', content: prompt }], 
          temperature: 0.1,
          response_format: { type: 'json_object' } // 💡 强行锁定 DeepSeek 原生 JSON 输出来防坍塌
        })
      });
  
      const data = await response.json();
      let resultText = data.choices[0].message.content.trim();
      
      // 🧽 暴力强洗：抹除任何可能残存的 Markdown 标记
      if (resultText.startsWith('```')) {
        resultText = resultText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      return res.status(200).json(JSON.parse(resultText.trim()));
    } catch (error) {
      // 容错兜底：防止解析报错导致 Vercel 崩溃
      return res.status(200).json({ 
        headline: "精算链路重置中",
        planning_logic: "触发了数据对齐自校准流程，请重新点击触发按钮。",
        experience_tags: ["自校准"],
        route_overview: "等待中",
        nodes: [], roundtrip: { outbound: {}, return: {} }, accommodation: [], segment_transport: [],
        cost_estimate: { transport: 0, accommodation: 0, food: 0, attraction: 0, total_per_person: "0", note: error.message }
      });
    }
  }