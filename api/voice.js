import dotenv from 'dotenv';
dotenv.config();

function validateAndCleanNote(note, heardText) {
  const fillers = [
    // Chinese
    '我', '今天', '刚刚', '然后', '还有', '吃了', '吃', '喝了', '喝', '买了', '买', '花了', '花', '用', '支付', '付款', '消费', '了', '的',
    // English
    'i', 'today', 'just', 'and', 'then', 'ate', 'eat', 'drank', 'drink', 'bought', 'buy', 'spent', 'paid', 'using', 'with',
    // Malay
    'saya', 'hari ini', 'tadi', 'dan', 'makan', 'minum', 'beli', 'bayar', 'guna'
  ];

  const paymentWords = [
    'touch n go', 'touch \'n go', 'tng', 'e-wallet', '电子钱包',
    'cash', 'tunai', '现金',
    'bank transfer', 'online banking', 'duitnow', 'debit card', 'credit card', 'card', 'bank', '转账', '银行卡'
  ];

  const genericWords = [
    'payment', 'expense', 'income', '吃饭', '逛街', '网购', '日常用品', '交通', '收入', '自定义',
    '买东西', '消费', '支出', '买了的东西', '东西', '买的东西', '买了东西', '收支', '记账'
  ];

  const isGenericOrEmpty = (str) => {
    if (!str) return true;
    const cleanStr = str.toLowerCase().trim();
    if (cleanStr.length === 0) return true;
    if (genericWords.includes(cleanStr)) return true;
    
    // Check if it consists only of fillers or payments
    const words = cleanStr.split(/[\s,，、]+/);
    const nonFillerWords = words.filter(w => w && !fillers.includes(w) && !paymentWords.includes(w));
    if (nonFillerWords.length === 0) return true;
    
    return false;
  };

  const getCleanWords = (str) => {
    let temp = str.toLowerCase();
    for (const word of [...fillers, ...paymentWords, ...genericWords]) {
      const isEnglish = /^[a-zA-Z]+$/.test(word);
      const regexStr = isEnglish ? `\\b${word}\\b` : word;
      const regex = new RegExp(regexStr, 'gi');
      temp = temp.replace(regex, '');
    }
    return temp.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '');
  };

  const isRelated = (n, h) => {
    const cleanN = getCleanWords(n);
    const cleanH = getCleanWords(h);
    if (!cleanN || !cleanH) return false;
    const nChars = [...cleanN];
    const matches = nChars.filter(char => cleanH.includes(char));
    return matches.length > 0;
  };

  if (note && !isGenericOrEmpty(note) && isRelated(note, heardText)) {
    return note.trim();
  }

  if (!heardText) return note ? note.trim() : '未指定';

  let cleaned = heardText;
  cleaned = cleaned.replace(/(?:rm|RM)\s*\d+(?:\.\d+)?/g, '');
  cleaned = cleaned.replace(/\d+(?:\.\d+)?\s*(?:块钱|块|元|ringgit|money|rm|RM)/gi, '');
  cleaned = cleaned.replace(/\d+(?:\.\d+)?/g, '');

  for (const word of paymentWords) {
    const regex = new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  for (const word of fillers) {
    const isEnglish = /^[a-zA-Z]+$/.test(word);
    const regexStr = isEnglish ? `\\b${word}\\b` : word;
    const regex = new RegExp(regexStr, 'gi');
    cleaned = cleaned.replace(regex, '');
  }

  cleaned = cleaned.replace(/[，。、,.?？!！+&()\[\]{}'\"\\/]+/g, ' ');
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/\s+/g, '、');

  if (!cleaned || isGenericOrEmpty(cleaned)) {
    return note ? note.trim() : '未指定';
  }

  return cleaned;
}

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

    const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day = String(today.getUTCDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;

    const promptText = `You are a dynamic, semantic AI accounting parser for the "咕噜存钱" app.
The user may speak naturally in Chinese, English, Malay, or mixed Malaysian daily speech (Manglish/mixed languages).
Analyze the input text to understand the user's meaning, context, and intent, then return structured JSON accounting data.

CRITICAL INSTRUCTIONS:
1. Understand the user's meaning semantically, not through rigid keyword lists. Do not manually restrict to specific lists of food or item names.
2. Support Chinese, English, Malay, and mixed Malaysian daily speech.
3. The note field must contain the actual, specific item, product, brand, movie, game, course, place, service, food, or drink that the user actually bought, ate, drank, received, or paid for. Remove filler/action words from the note, such as "我", "今天", "买", "吃", "喝", "花", "用", "买了", "吃了", "喝了", "I", "today", "buy", "eat", "drink", "saya", "beli", "makan", as well as any amount/currency/payment method words.
4. Do NOT translate or rewrite item names unless absolutely necessary. Keep them in their original language and phrasing spoken by the user (e.g. keep "宫崎骏的 DVD 机", "Nasi Lemak", "Ice Lemon Tea" exactly as is).
5. The amount field must contain a number only. Do NOT include currency symbols or text like RM, 块, ringgit, etc.
6. The category must be mapped based on semantic meaning to one of the following exact categories:
   - "吃饭": for food, drinks, meals, restaurants, cafes, hawker food, beverages, and daily eating/drinking.
   - "交通": for petrol, parking, toll, Grab, taxi, train, bus, transport, and travel movement.
   - "网购": for online shopping and e-commerce purchases (e.g., Shopee, Lazada, Taobao).
   - "逛街": for offline shopping, mall purchases, clothes, shoes, and lifestyle shopping.
   - "日常用品": for groceries, household items, toiletries, cleaning products, and basic daily-use items.
   - "收入": for income, salary, client payment, freelance payment, commission, allowance, and money received.
   - "自定义": when the category is unclear or does not fit the above categories.
7. The payment_method must be mapped to one of the following exact strings:
   - "TnG": if the user mentions Touch 'n Go, TNG, e-wallet, or similar e-wallet payment.
   - "现金": if the user mentions cash or physical money payment.
   - "银行卡": if the user mentions bank transfer, card, DuitNow, online banking, debit, or credit card.
   - "未指定": if no payment method is mentioned. Do NOT force "现金" if cash is not mentioned.
   - "自定义": if a payment method is mentioned but doesn't fit the above.
8. Income vs Expense decision:
   - If the user is spending, buying, eating, drinking, paying, ordering, subscribing, purchasing, or being charged, classify as "expense".
   - If the user is receiving money, salary, freelance/client payment, commission, bonus, allowance, or income, classify as "income".
   - If unclear, default to "expense".
9. Amount cardinality rules:
   - One amount rule: If the user mentions one amount and multiple items, create one transaction object in "items" and combine the item names into the note.
   - Multiple amount rule: Only create multiple transaction objects in "items" when the user clearly gives multiple separate item-price pairs.
10. The transaction_date must be formatted as "YYYY-MM-DD". Calculate it relative to today's date (${currentDate}) if relative terms like "昨天" or "yesterday" are used. Default to "${currentDate}" if no date is mentioned.
11. If something is uncertain, choose the safest fallback instead of guessing too hard.
12. The heard_text field in the response must contain the original text input provided by the user.

Output strict JSON conforming to the response schema. No markdown formatting, no code blocks (do not wrap in \`\`\`json), and no explanations.`;

    const modelName = process.env.GEMINI_VOICE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '后端未配置 GEMINI_API_KEY' });
    }

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
              heard_text: { type: 'STRING' },
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
              total_matches: { type: 'BOOLEAN', nullable: true },
              warnings: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['heard_text', 'items', 'calculated_total'],
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

    // Backend note safety validation:
    if (parsed.items && Array.isArray(parsed.items)) {
      parsed.items.forEach(item => {
        item.note = validateAndCleanNote(item.note, textInput);
      });
    }
    
    return res.status(200).json({
      success: true,
      heard_text: parsed.heard_text || textInput || '',
      items: parsed.items || [],
      detected_total: parsed.detected_total !== undefined ? parsed.detected_total : null,
      calculated_total: parsed.calculated_total || 0,
      total_matches: parsed.total_matches !== undefined ? parsed.total_matches : true,
      warnings: parsed.warnings || [],
      transcript: parsed.heard_text || textInput || '', // Compatibility for frontend
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: `Parsing failed: ${error.message}` });
  }
};
