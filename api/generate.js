export default async function handler(req, res) {
  // 1. 允许跨域请求（CORS）
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. 安全地解析请求体（防范前端传参格式不同导致 500）
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // 如果是普通字符串则忽略
      }
    }
    
    const destination = body?.destination || "目的地";
    const days = body?.days || 3;

    const apiKey = process.env.DEEPSEEK_API_KEY; 
    if (!apiKey) {
      return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });
    }

    // 3. 让 DeepSeek 100% 听话的 Prompt
    const prompt = `你是一个专业的旅行规划师。请为前往 ${destination} 进行为期 ${days} 天旅行的用户，制定一份详细的保姆级旅行攻略。
    
    你必须仅仅返回一个标准的 JSON 数组，不要包含任何前言、后缀解释或 \`\`\`json 标记。
    格式必须精确如下：
    [
      {"day": "第1天", "time": "上午", "spot": "景点A", "description": "避坑指南"},
      {"day": "第1天", "time": "下午", "spot": "景点B", "description": "游玩建议"}
    ]`;

    // 4. 请求 DeepSeek 官方接口
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: `DeepSeek 接口报错: ${errorData}` });
    }

    const data = await response.json();
    let resultText = data.choices[0].message.content.trim();

    // 5. 强力剥离 Markdown 标签
    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    resultText = resultText.trim();

    // 6. 安全解析并返回
    try {
      const jsonParsed = JSON.parse(resultText);
      return res.status(200).json(jsonParsed);
    } catch (parseError) {
      const jsonMatch = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        return res.status(200).json(JSON.parse(jsonMatch[0]));
      }
      return res.status(200).json([
        { "day": "第1天", "time": "全天", "spot": destination, "description": "AI返回格式有误，原始数据: " + resultText.substring(0, 50) }
      ]);
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "服务器内部错误：" + error.message });
  }
}