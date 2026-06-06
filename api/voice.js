import dotenv from 'dotenv';
dotenv.config();

function validateAndCleanNote(note, heardText) {
  const fillers = [
    // Chinese
    '我', '今天', '刚刚', '然后', '还有', '吃了', '吃', '喝了', '喝', '买了', '买', '花了', '花', '用', '支付', '付款', '消费', '了',
    // English
    'i', 'today', 'just', 'and', 'then', 'ate', 'eat', 'drank', 'drink', 'bought', 'buy', 'spent', 'paid', 'using', 'with',
    // Malay
    'saya', 'hari ini', 'tadi', 'dan', 'makan', 'minum', 'beli', 'bayar', 'guna'
  ];

  const paymentWords = [
    'touch n go', 'touch \'n go', 'tng', 'e-wallet', 'ewallet', '电子钱包',
    'cash', 'tunai', '现金',
    'bank transfer', 'online banking', 'duitnow', 'debit card', 'credit card', 'card', 'bank', 'transfer', 'debit', 'credit', '转账', '银行卡'
  ];

  const genericWords = [
    'payment', 'expense', 'income', '吃饭', '逛街', '网购', '日常用品', '交通', '收入', '自定义',
    '买东西', '消费', '支出', '买了的东西', '东西', '买的东西', '买了东西', '收支', '记账', 'food', 'item', 'unknown', 's7',
    'something', 'stuff', 'expenses', 'incomes', 'nothing', 'none', 'null', 'undefined', 'na', 'n/a', 'transaction', 'transactions'
  ];

  const currencyWords = ['ringgit', '块钱', '块', '元', '钱', 'rm', 'RM'];

  const isGenericOrEmpty = (str) => {
    if (!str) return true;
    const cleanStr = str.toLowerCase().trim();
    if (cleanStr.length === 0) return true;
    if (cleanStr.length === 1 && !/[\u4e00-\u9fa5]/.test(cleanStr)) return true;
    if (genericWords.includes(cleanStr)) return true;
    return false;
  };

  const isComponentInHeard = (comp, heard) => {
    const cleanComp = comp.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
    const cleanHeard = heard.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
    if (!cleanComp) return false;
    return cleanHeard.includes(cleanComp);
  };

  const capitalizeWords = (str) => {
    return str.split(' ').map(word => {
      if (/^[a-zA-Z]+$/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
  };

  const hasChinese = (str) => /[\u4e00-\u9fa5]/.test(str);

  const getItemsCount = (str) => {
    if (!str) return 0;
    return str.split(/[,，、和及与&]+/).map(s => s.trim()).filter(s => s.length > 0).length;
  };

  // Helper to rebuild note from transcript
  const rebuildNote = (transcript) => {
    if (!transcript) return '';
    let cleaned = transcript;
    
    // 1. Remove currency and numeric amount words
    cleaned = cleaned.replace(/(?:rm|RM)\s*\d+(?:\.\d+)?/g, '');
    cleaned = cleaned.replace(/\d+(?:\.\d+)?\s*(?:块钱|块|元|ringgit|money|rm|RM)/gi, '');
    cleaned = cleaned.replace(/\d+(?:\.\d+)?/g, '');

    // Remove standalone currency words
    for (const word of currencyWords) {
      const regex = new RegExp(`\\b${word}\\b|${word}`, 'gi');
      cleaned = cleaned.replace(regex, '');
    }

    // 2. Remove payment method words
    for (const word of paymentWords) {
      const regex = new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      cleaned = cleaned.replace(regex, '');
    }

    // 3. Replace separators with '|'
    const separators = ['还有', '和', '与', '及', 'and', 'then', 'dan'];
    let separated = cleaned;
    separated = separated.replace(/[，。、,.?？!！+&()\[\]{}'\"\\/]+/g, '|');
    for (const sep of separators) {
      const isEnglish = /^[a-zA-Z]+$/.test(sep);
      const regexStr = isEnglish ? `\\b${sep}\\b` : sep;
      const regex = new RegExp(regexStr, 'gi');
      separated = separated.replace(regex, '|');
    }

    // 4. Remove filler/action words
    let itemsStr = separated;
    for (const word of fillers) {
      const isEnglish = /^[a-zA-Z]+$/.test(word);
      const regexStr = isEnglish ? `\\b${word}\\b` : word;
      const regex = new RegExp(regexStr, 'gi');
      itemsStr = itemsStr.replace(regex, '');
    }

    // 5. Split by '|', trim, capitalize, and filter empty/generic
    const rawItems = itemsStr.split('|');
    const items = rawItems
      .map(item => {
        const trimmed = item.trim();
        return capitalizeWords(trimmed);
      })
      .filter(item => item.length > 0 && !isGenericOrEmpty(item));

    return items.join('、');
  };

  const rebuiltNote = rebuildNote(heardText);

  // Validate the original note returned by AI
  let isNoteValid = true;
  if (!note || isGenericOrEmpty(note)) {
    isNoteValid = false;
  } else {
    // Check for translation (Chinese characters in note but not in heardText)
    if (hasChinese(note) && !hasChinese(heardText)) {
      isNoteValid = false;
    } else {
      // Check if all parts of the AI note are in the heard text
      const parts = note.split(/[,，、和及与&]+/);
      const validParts = parts.filter(p => p.trim().length > 0);
      if (validParts.length === 0 || !validParts.every(part => isComponentInHeard(part, heardText))) {
        isNoteValid = false;
      }
    }
  }

  // If the AI note is valid, check if it's incomplete compared to rebuilt note
  if (isNoteValid && rebuiltNote) {
    const aiCount = getItemsCount(note);
    const rebuiltCount = getItemsCount(rebuiltNote);
    if (rebuiltCount > aiCount) {
      isNoteValid = false; // prefer rebuilt note if it has more items
    }
  }

  if (isNoteValid) {
    // Reformat/capitalize the valid note parts just to make sure it looks neat
    const parts = note.split(/([,，、和及与&]+)/);
    const formattedParts = parts.map(part => {
      if (/[,，、和及与&]+/.test(part)) return part;
      return capitalizeWords(part.trim());
    });
    return formattedParts.join('').trim();
  }

  return rebuiltNote || (note ? note.trim() : '未指定');
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
4. Do NOT translate or rewrite item names under any circumstances. Keep them in their original language and phrasing spoken by the user (e.g. keep "roti planta" or "Roti Planta", "ice cream" or "Ice Cream", "tayar" or "Tayar", "chicken chop" or "Chicken Chop", "面包" exactly in their original language. Do not translate English/Malay item names into Chinese).
5. The amount field must contain a number only. Do NOT include currency symbols or text like RM, 块, ringgit, etc.
6. The category must be mapped based on semantic meaning to one of the following exact categories:
   - "吃饭": for food, drinks, meals, restaurants, cafes, hawker food, beverages, daily eating/drinking, and dishes from any country (e.g. roti planta, ice cream, chicken chop, nasi lemak, spaghetti, burger).
   - "交通": for petrol, parking, toll, Grab, taxi, train, bus, transport, car travel cost, and travel movement.
   - "网购": for online shopping and e-commerce purchases (e.g., Shopee, Lazada, Taobao).
   - "逛街": for offline shopping, mall purchases, clothes, shoes, and lifestyle shopping.
   - "日常用品": for groceries, household items, toiletries, cleaning products, and basic daily-use items.
   - "收入": for income, salary, client payment, freelance payment, commission, allowance, bonus, and money received.
   - "自定义": when the category is unclear or does not fit the above categories, or for product names, unusual goods, services, tyres (tayar), electronics, movie/game items, etc.
7. The payment_method must be mapped to one of the following exact strings:
   - "TnG": if the user mentions Touch 'n Go, TNG, e-wallet, ewallet, 电子钱包, or similar e-wallet payment.
   - "现金": if the user mentions cash, tunai, or physical money payment.
   - "银行卡": if the user mentions bank transfer, online banking, DuitNow, card, debit, credit, transfer, or 转账.
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
13. If you are unsure about an item name, preserve the closest heard phrase in the note. Do not invent, normalize, or translate it.

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
        item.original_note = item.note || ''; // preserve original Gemini note
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
