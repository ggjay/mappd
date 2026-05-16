export default async function handler(req, res) {
  // 1. 允许所有跨域请求和方法
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 关键：管你是 OPTIONS、GET 还是 POST，只要是预检或者探测，通通直接放行给 200
  if (req.method === 'OPTIONS' || req.method === 'GET') {
    res.status(200).end();
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {}
    }
    
    const destination = body?.destination || "目的地";
    const days = body?.days || 3;

    const apiKey = process.env.DEEPSEEK_API_KEY; 
    if (!apiKey) {
      return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });
    }

    const prompt = `你是一个专业的旅行规划师。请为前往 ${destination} 进行为期 ${days} 天旅行的用户，制定一份详细的保姆级旅行攻略。
    你必须仅仅返回一个标准的 JSON 数组，不要包含任何前言、后缀解释或 \`\`\`json 标记。
    格式必须精确如下：
    [
      {"day": 1, "time": "上午", "spot": "景点A", "description": "避坑指南", "category":"文化寺庙", "lat": 35.0116, "lng": 135.7681, "type":"culture", "must": true, "duration":"2小时", "sources":4, "tips":"小技巧"}
    ]`;

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
    return res.status(500).json({ error: "服务器内部错误：" + error.message });
  }
}