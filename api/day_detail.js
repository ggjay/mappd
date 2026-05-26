export const config = { maxDuration: 60 };

const RESTAURANT_SCHEMA = `{
      "name": "餐厅名", "rating": 4.8, "review_count": 1200, "price_per_person": "￥80",
      "cuisine": "菜系", "distance": "距参考点约300m", "highlight_dish": "招牌菜",
      "dianping_url": "https://www.dianping.com/search/keyword/城市/餐厅名"
    }`;

const DAY_SCHEMA = `{
    "day": 1,
    "city": "当日主城市",
    "sub_route_summary": "一句话概括当日游览子动线",
    "attractions": [{
      "id": "d1_a1", "name": "景点名", "latlng": [25.04, 102.73],
      "cover_image": "https://placehold.co/480x280/4A5B4E/ffffff?text=景点",
      "hours": "08:30-18:00", "highlights": "核心亮点", "ticket_type": "free",
      "price": "免费", "booking_url": ""
    }],
    "meals": {
      "breakfast": { "time_label": "早餐", "area": "区域", "anchor_latlng": [25.04, 102.73], "restaurants": [${RESTAURANT_SCHEMA}] },
      "lunch": { "time_label": "午餐", "area": "", "anchor_latlng": [25.05, 102.74], "restaurants": [] },
      "dinner": { "time_label": "晚餐", "area": "", "anchor_latlng": [25.06, 102.75], "restaurants": [] }
    }
  }`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS' || req.method === 'GET') { res.status(200).end(); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }

    const { plan, days, day: singleDay, travelers, destination, start_point } = body;
    const totalDays = Math.min(Math.max(parseInt(days, 10) || 3, 1), 14);
    const targetDay = singleDay ? Math.min(Math.max(parseInt(singleDay, 10), 1), totalDays) : null;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ days: [], error: '未配置 DEEPSEEK_API_KEY，请在 Vercel 环境变量中添加' });
    }

    const nodesStr = (plan?.nodes || []).map(n => `${n.city}(${n.nights}晚)`).join(' → ');

    const dayScope = targetDay
      ? `只生成第 ${targetDay} 天（共 ${totalDays} 天行程中的第 ${targetDay} 天）`
      : `生成第 1 到第 ${totalDays} 天，days 数组长度必须等于 ${totalDays}`;

    const prompt = `# 角色
你是 Mappd 分天行程规划师，输出 JSON。

# 行程上下文
- 出发城市：${start_point || '未知'}
- 目的地：${destination || '未知'}
- 总天数：${totalDays} 天
- 人数：${travelers || 2} 人
- 方案：${plan?.headline || ''}
- 宏观动线：${plan?.route_overview || nodesStr}

# 任务
${dayScope}

# 输出要求
1. 当天 2-3 个景点，真实 latlng
2. meals 含 breakfast/lunch/dinner，每餐 5 家餐厅，rating 降序，模拟大众点评
3. ticket_type 仅 free 或 paid

# 输出（仅 JSON）
{
  "days": [${DAY_SCHEMA}${targetDay ? '' : ` ...共${totalDays}项`}]
}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.25,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({ days: [], error: `DeepSeek 请求失败: ${response.status}` , detail: errText.slice(0, 200) });
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      return res.status(200).json({ days: [], error: 'AI 未返回内容', detail: JSON.stringify(data).slice(0, 200) });
    }

    let text = data.choices[0].message.content.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(text);
    let daysList = Array.isArray(parsed.days) ? parsed.days : (parsed.day ? [parsed] : []);

    daysList = daysList.map((d, i) => normalizeDay(d, targetDay || d.day || i + 1, destination));

    if (targetDay && daysList.length === 0) {
      daysList = [normalizeDay({ city: destination }, targetDay, destination)];
    }

    return res.status(200).json({ days: daysList });
  } catch (error) {
    return res.status(200).json({ days: [], error: error.message });
  }
}

function normalizeDay(raw, dayNum, destination) {
  const day = { ...raw, day: raw.day || dayNum };
  day.city = day.city || destination || '';
  day.sub_route_summary = day.sub_route_summary || `第${dayNum}天游览`;
  day.attractions = (Array.isArray(day.attractions) ? day.attractions : []).map((a, i) => ({
    id: a.id || `d${dayNum}_a${i + 1}`,
    name: a.name || '景点',
    latlng: Array.isArray(a.latlng) ? a.latlng : (a.lat != null ? [a.lat, a.lng] : [25.04, 102.73]),
    cover_image: a.cover_image || `https://placehold.co/480x280/4A5B4E/ffffff?text=${encodeURIComponent(a.name || '景点')}`,
    hours: a.hours || '全天',
    highlights: a.highlights || '',
    ticket_type: a.ticket_type === 'paid' ? 'paid' : 'free',
    price: a.price || (a.ticket_type === 'paid' ? '￥待定' : '免费'),
    booking_url: a.booking_url || '',
  }));

  ['breakfast', 'lunch', 'dinner'].forEach(slot => {
    if (!day.meals) day.meals = {};
    day.meals[slot] = normalizeMealSlot(day.meals[slot], slot, day.attractions[0]?.latlng);
  });

  return day;
}

function normalizeMealSlot(slot, key, fallbackLatlng) {
  const labels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
  const s = slot || {};
  let restaurants = Array.isArray(s.restaurants) ? s.restaurants : [];
  restaurants = restaurants.map((r, i) => ({
    name: r.name || `餐厅${i + 1}`,
    rating: parseFloat(r.rating) || 4.5,
    review_count: r.review_count || 500,
    price_per_person: r.price_per_person || '￥—',
    cuisine: r.cuisine || '本地菜',
    distance: r.distance || '',
    highlight_dish: r.highlight_dish || '',
    dianping_url: r.dianping_url || `https://www.dianping.com/search/keyword/${encodeURIComponent(r.name || '美食')}`,
  }));
  restaurants.sort((a, b) => b.rating - a.rating);
  restaurants = restaurants.slice(0, 5);

  return {
    time_label: s.time_label || labels[key],
    area: s.area || '',
    anchor_latlng: s.anchor_latlng || fallbackLatlng || [25.04, 102.73],
    restaurants,
  };
}
