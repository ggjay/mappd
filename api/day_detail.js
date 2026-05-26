const RESTAURANT_SCHEMA = `{
      "name": "餐厅名",
      "rating": 4.8,
      "review_count": 1200,
      "price_per_person": "￥80",
      "cuisine": "菜系",
      "distance": "距参考点约300m",
      "highlight_dish": "招牌菜",
      "dianping_url": "https://www.dianping.com/search/keyword/城市/餐厅名"
    }`;

const DAY_SCHEMA = `{
    "day": 1,
    "city": "当日主城市",
    "sub_route_summary": "一句话概括当日游览子动线",
    "attractions": [{
      "id": "d1_a1",
      "name": "景点名",
      "latlng": [25.04, 102.73],
      "cover_image": "https://placehold.co/480x280/4A5B4E/ffffff?text=景点",
      "hours": "08:30-18:00",
      "highlights": "2-3句核心亮点",
      "ticket_type": "free 或 paid",
      "price": "免费 或 ￥xx",
      "booking_url": "预约官网URL，免费景点可为空字符串"
    }],
    "meals": {
      "breakfast": {
        "time_label": "早餐",
        "area": "用餐区域",
        "anchor_latlng": [25.04, 102.73],
        "restaurants": [${RESTAURANT_SCHEMA}]
      },
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

    const { plan, days, travelers, destination, start_point } = body;
    const totalDays = Math.min(Math.max(parseInt(days, 10) || 3, 1), 14);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(200).json({ error: 'API KEY Missing', days: [] });

    const nodesStr = (plan?.nodes || []).map(n => `${n.city}(${n.nights}晚)`).join(' → ');

    const prompt = `# 角色
你是 Mappd 分天行程规划师，输出可落地的一日详细攻略 JSON。

# 行程上下文
- 出发城市：${start_point || '未知'}
- 目的地：${destination || '未知'}
- 总天数：${totalDays} 天（必须输出恰好 ${totalDays} 天的 days 数组）
- 人数：${travelers || 2} 人
- 已选方案标题：${plan?.headline || ''}
- 宏观动线：${plan?.route_overview || nodesStr}

# 输出要求
1. 每天安排 2-4 个景点，按合理游览顺序排列；latlng 为真实经纬度
2. 每日 meals 含 breakfast / lunch / dinner，各含恰好 5 家餐厅
3. 餐厅按 rating 从高到低排序，模拟大众点评数据（评分 4.0-5.0，review_count 合理）
4. dianping_url 格式：https://www.dianping.com/search/keyword/{城市编码}/{餐厅名编码} 或合理搜索链接
5. 景点 ticket_type 仅 "free" 或 "paid"；paid 须填 price 和 booking_url
6. cover_image 可用 https://placehold.co/480x280/4A5B4E/ffffff?text=景点名 形式
7. meals 的 anchor_latlng 放在当日景点聚集区附近
8. 美食节点与景点节点经纬度不要完全相同

# 输出格式（仅 JSON，无 Markdown）
{
  "days": [
    ${DAY_SCHEMA}
  ]
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

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content?.trim() || '{}';
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(text);
    let days = Array.isArray(parsed.days) ? parsed.days : [];

    days = days.slice(0, totalDays).map((d, i) => normalizeDay(d, i + 1, destination));

    while (days.length < totalDays) {
      days.push(normalizeDay({ city: destination, attractions: [], meals: {} }, days.length + 1, destination));
    }

    return res.status(200).json({ days });
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
