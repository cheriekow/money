import dotenv from 'dotenv';
dotenv.config();

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不支持，请使用 POST' });
  }

  // --- 1. 鉴权逻辑 ( simulated Auth & Pro Status check ) ---
  const authHeader = req.headers.authorization;
  const isProHeader = req.headers['x-user-pro-status'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '身份校验未通过，缺少有效的 Authorization Bearer Token' });
  }

  const token = authHeader.split(' ')[1];
  
  if (isProHeader !== 'true' && token !== 'mock-jwt-token-pro-456') {
    return res.status(403).json({ error: '权限被拦截：此智能功能仅限 👑 Pro 尊贵会员使用' });
  }

  try {
    let textInput = null;

    // Vercel automatically parses JSON bodies into req.body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    if (body.text) {
      textInput = body.text;
    } else {
      return res.status(400).json({ error: '请求体中缺少 text 数据' });
    }

    const modelName = process.env.GEMINI_VOICE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '后端未配置 GEMINI_API_KEY' });
    }

    const promptText = `You are a multilingual Malaysian AI accounting parser.
The user may speak Chinese, English, Malay, or mixed Malaysian daily speech.
Understand the text meaning directly.
Return strict JSON only.
Do not explain.
Do not include markdown.

Parsing rules:
1. If the user mentions spending, buying, eating, drinking, paying, ordering, subscribing, or purchasing, classify as "expense".
2. If the user mentions receiving money, salary, client payment, income, commission, or freelance payment, classify as "income".
3. If unclear, default to "expense".
4. Extract only the numeric amount.
5. Put the actual item/service/product name into note.
6. Preserve item names as much as possible.
7. Do not translate or rewrite brand names, product names, movie names, game names, or model names.
8. Do not include amount words or payment method words in note.
9. If the user says one amount and multiple items, create one transaction and combine the items into note.
10. Only split into multiple transactions when there are clearly multiple separate amounts.
11. Detect Touch 'n Go / TNG / e-wallet as payment_method: "TnG".
12. Detect cash / tunai / 现金 as payment_method: "现金".
13. Detect card / bank transfer / DuitNow / online banking as payment_method: "银行卡".
14. If no payment method is mentioned, return payment_method as "未指定".
15. Use only existing app categories:
   - 吃饭
   - 逛街
   - 网购
   - 日常用品
   - 交通
   - 收入
   - 自定义
16. If category is uncertain, use "自定义".`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              { text: `User input: ${textInput}` }
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              items: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    type: { type: 'STRING', enum: ['expense', 'income'] },
                    amount: { type: 'NUMBER' },
                    currency: { type: 'STRING' },
                    category: { type: 'STRING', enum: ['吃饭', '逛街', '网购', '日常用品', '交通', '收入', '自定义'] },
                    payment_method: { type: 'STRING', enum: ['现金', 'TnG', '银行卡', '自定义', '未指定'] },
                    transaction_date: { type: 'STRING' },
                    note: { type: 'STRING' },
                    confidence: { type: 'NUMBER' }
                  },
                  required: ['type', 'amount', 'currency', 'category', 'payment_method', 'transaction_date', 'note', 'confidence'],
                },
              },
              detected_total: { type: 'NUMBER', nullable: true },
              calculated_total: { type: 'NUMBER' },
              total_matches: { type: 'BOOLEAN' },
              warnings: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['items', 'calculated_total'],
          },
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini API Error:', errText);
      return res.status(geminiResponse.status).json({ error: `Gemini processing failed: ${errText}` });
    }

    const resData = await geminiResponse.json();
    const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      return res.status(500).json({ error: 'Gemini returned empty response' });
    }

    const parsed = JSON.parse(aiText);
    
    return res.status(200).json({
      success: true,
      items: parsed.items || [],
      detected_total: parsed.detected_total || null,
      calculated_total: parsed.calculated_total || 0,
      total_matches: parsed.total_matches !== undefined ? parsed.total_matches : true,
      transcript: parsed.transcript || textInput || '',
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: `Parsing failed: ${error.message}` });
  }
};
