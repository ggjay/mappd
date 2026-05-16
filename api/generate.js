export default async function handler(req, res) {
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
    const { destination, days } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY; 

    if (!apiKey) {
      return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });
    }

    const prompt = `你是一个专业的旅行规划师。请为前往 ${destination} 进行为期 ${days} 天旅行的用户，制定一份详细的保姆级旅行攻略。
    
    【严格要求】你必须【仅仅】返回一个标准的 JSON 数组，不需要任何包裹。
    格式示例：
    [
      {"day": "第1天", "time": "上午", "spot": "景点A", "description": "避坑指南"},
      {"day": "第1天", "time": "下午", "spot": "景点B", "description": "游玩建议"}
    ]
    不要包含任何 \`\`\`json 这样的 Markdown 标记，不要包含任何前言或后缀解释。`;

    const response = await fetch('[https://api.deepseek.com/v1/chat/completions](https://api.deepseek.com/v1/chat/completions)', {
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
        temperature: 0.3 // 调低随机性，让 AI 严格遵守 JSON 格式
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: `DeepSeek API 报错: ${errorData}` });
    }

    const data = await response.json();
    let resultText = data.choices[0].message.content.trim();

    // ======= 核心强力清洗逻辑：防范 AI 不听话带了 Markdown 标签 =======
    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    resultText = resultText.trim();

    try {
      // 尝试解析清洗后的 JSON
      const jsonParsed = JSON.parse(resultText);
      return res.status(200).json(jsonParsed);
    } catch (parseError) {
      // 如果不幸还是夹带了杂质，尝试用正则把最外层 [ ] 内部的内容捞出来
      const jsonMatch = resultText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        return res.status(200).json(JSON.parse(jsonMatch[0]));
      }
      throw new Error("AI 返回的格式无法被解析为 JSON 数组。原始返回为: " + resultText);
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "处理错误：" + error.message });
  }
}