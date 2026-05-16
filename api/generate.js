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
    const { destination, days } = req.body;

    // 2. 这里的名字完美对应你刚刚在 Vercel 填的 DEEPSEEK_API_KEY
    const apiKey = process.env.DEEPSEEK_API_KEY; 

    if (!apiKey) {
      return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });
    }

    // 3. 构建发给 DeepSeek 的 Prompt
    const prompt = `你是一个专业的旅行规划师。请为前往 ${destination} 进行为期 ${days} 天旅行的用户，制定一份详细的保姆级旅行攻略。
    请以精简的 JSON 数组格式返回，不要包含任何多余的 Markdown 格式标记（如 \`\`\`json）。
    每项需包含：day(天数), time(时间段，如上午/下午/晚上), spot(景点名称), description(简短描述/避坑指南)。`;

    // 4. 请求 DeepSeek 官方接口
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // 使用 DeepSeek 的标准对话模型
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: `DeepSeek API 报错: ${errorData}` });
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;

    // 5. 将 AI 返回的文本解析并吐给前端
    return res.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "服务器内部处理错误：" + error.message });
  }
}