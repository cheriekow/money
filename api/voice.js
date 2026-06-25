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

  // Trust AI note item count, no longer aggressively overriding with rebuilt note.

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
  console.log('[DEBUG Backend] request_received at /api/voice');
  if (req.method !== 'POST') {
    console.log('[DEBUG Backend] error_stage: Method Not Allowed');
    return res.status(405).json({ error: '方法不支持，请使用 POST' });
  }

  // --- 1. 鉴权逻辑 ( simulated Auth & Pro Status check ) ---
  const authHeader = req.headers.authorization;
  const isProHeader = req.headers['x-user-pro-status'];
  
  console.log('[DEBUG Backend] has_auth_header:', !!authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[DEBUG Backend] error_stage: Missing or Invalid Auth Header');
    return res.status(401).json({ error: '身份校验未通过，缺少有效的 Authorization Bearer Token' });
  }

  const token = authHeader.split(' ')[1];
  
  console.log('[DEBUG Backend] auth_verified: true (token present)');
  console.log('[DEBUG Backend] user_plan:', isProHeader === 'true' ? 'Pro' : 'Free/Guest');

  if (isProHeader !== 'true' && token !== 'mock-jwt-token-pro-456') {
    console.log('[DEBUG Backend] error_stage: Unauthorized Plan');
    return res.status(403).json({ error: '权限被拦截：此智能功能仅限 👑 Pro 尊贵会员使用' });
  }

  try {
    let textInput = null;
    let audioBase64 = null;
    let mimeType = null;
    let mode = 'text';

    // Vercel automatically parses JSON bodies into req.body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    if (body.mode === 'audio') {
      mode = 'audio';
      audioBase64 = body.audioBase64;
      mimeType = body.mimeType;

      console.log('[DEBUG Backend] mode: audio');
      console.log('[DEBUG Backend] has_audioBase64:', !!audioBase64);
      console.log('[DEBUG Backend] audio_base64_length:', audioBase64 ? audioBase64.length : 0);
      console.log('[DEBUG Backend] mimeType:', mimeType);

      if (!audioBase64 || !mimeType) {
        console.log('[DEBUG Backend] error_stage: Missing audioBase64 or mimeType');
        return res.status(400).json({ error: '音频数据不完整' });
      }
    } else {
      mode = 'text';
      console.log('[DEBUG Backend] mode: text');
      console.log('[DEBUG Backend] has_audioBase64: false');
      console.log('[DEBUG Backend] audio_base64_length: 0');
      console.log('[DEBUG Backend] mimeType: null');

      if (body.text) {
        textInput = body.text;
      } else {
        console.log('[DEBUG Backend] error_stage: Missing textInput data');
        return res.status(400).json({ error: '请求体中缺少 text 数据' });
      }
    }

    const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day = String(today.getUTCDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;

    const promptText = `You are a dynamic, semantic AI accounting parser for the "咕噜存钱" app.
The user may speak naturally in Chinese, English, Malay, or mixed Malaysian daily speech (Manglish/mixed languages).
Analyze the input audio or text to understand the user's meaning, context, and intent, then return structured JSON accounting data.

CRITICAL INSTRUCTIONS:
1. Directly understand the audio input which contains Chinese, English, Malay, and mixed Malaysian daily speech. 
2. The note field MUST contain the actual, specific item, product, brand, movie, game, course, place, service, food, or drink that the user actually bought, ate, drank, received, or paid for. Remove filler/action words from the note, such as "我", "今天", "买", "吃", "喝", "花", "用", "买了", "吃了", "喝了". The note should preserve the original spoken language as much as possible.
3. Do NOT translate or rewrite item names under any circumstances. Keep them in their original language and phrasing exactly as spoken. For example, keep "Nasi Lemak", "Ice Lemon Tea", "Roti Planta", "Chicken Chop", "Tayar", "宫崎骏的 DVD 机" exactly in their original language. Do not translate English/Malay item names into Chinese.
4. The amount field must contain a number only. Do NOT include currency symbols.
5. The category must be mapped based on semantic meaning to one of the following exact categories:
   - "吃饭" (for food, drinks, meals, restaurants, cafes, hawker food, beverages, daily eating/drinking, dishes like nasi lemak, ice lemon tea, roti planta, chicken chop, etc.)
   - "交通" (for petrol, parking, toll, Grab, taxi, train, bus, transport, car travel cost, tayar/tyre, etc.)
   - "网购" (for online shopping and e-commerce)
   - "逛街" (for offline shopping, clothes, shoes, lifestyle, movies, entertainment, cinema, karaoke, fun activities, 看电影, 电影, 娱乐, 唱K)
   - "日常用品" (for groceries, household items, toiletries)
   - "收入" (for income, salary, bonus, money received)
   - "自定义" (when category is unclear, unusual goods, electronics, game items, etc.)
6. The payment_method must be mapped to one of the following exact strings:
   - "TnG" (for Touch 'n Go, TNG, e-wallet, 电子钱包)
   - "现金" (for cash, tunai)
   - "银行卡" (for bank transfer, online banking, DuitNow, card, debit, credit)
   - "未指定" (if no payment method mentioned)
   - "自定义"
7. Income vs Expense decision: If spending, buying, classifying as "expense". If receiving salary/bonus, "income". Default to "expense".
8. The transaction_date must be formatted as "YYYY-MM-DD". Calculate relative to today (${currentDate}) if relative terms used. Default to "${currentDate}".
9. The heard_text field must contain an accurate transcript of what the user actually said in the audio.
10. If you are unsure about an item name, preserve the closest heard phrase in the note. Do not invent, normalize, or translate it.
11. One amount vs multiple amount: If user gives one amount and multiple items, create ONE transaction and combine item names into the note. Only split into multiple transactions when user clearly gives multiple separate item-price pairs.

Output strict JSON conforming to the response schema. No markdown formatting, no code blocks (do not wrap in \`\`\`json), and no explanations.`;

    const baseModelName = process.env.GEMINI_VOICE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const retryModelName = process.env.GEMINI_RETRY_MODEL || 'gemini-2.5-pro';
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log('[DEBUG Backend] gemini_base_model_used:', baseModelName);
    console.log('[DEBUG Backend] has_gemini_key:', !!apiKey);

    if (!apiKey) {
      console.log('[DEBUG Backend] error_stage: Missing GEMINI_API_KEY');
      return res.status(500).json({ error: '后端未配置 GEMINI_API_KEY' });
    }

    const geminiPayloadContents = [];
    if (mode === 'audio') {
      geminiPayloadContents.push({
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          }
        ]
      });
    } else {
      geminiPayloadContents.push({
        parts: [
          { text: promptText },
          { text: `User input: ${textInput}` }
        ]
      });
    }

    const runGemini = async (modelName) => {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiPayloadContents,
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

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API ${response.status} - ${errText}`);
      }

      const resData = await response.json();
      const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiText) {
        throw new Error('Empty text from Gemini');
      }

      return JSON.parse(aiText);
    };

    let parsed;
    try {
      try {
        parsed = await runGemini(baseModelName);
      } catch (err) {
        console.warn(`[DEBUG Backend] primary model (${baseModelName}) failed, trying fallback:`, err.message);
        try {
          parsed = await runGemini(retryModelName);
        } catch (err2) {
          console.warn(`[DEBUG Backend] secondary model (${retryModelName}) failed, trying tertiary gemini-1.5-flash:`, err2.message);
          parsed = await runGemini('gemini-1.5-flash');
        }
      }
      
      const needsRetry = 
        !parsed.items || 
        parsed.items.length === 0 || 
        parsed.items.some(item => 
          item.amount === undefined || 
          item.amount === null || 
          !item.note || 
          item.note.trim() === '' || 
          ['unknown', 'something', 'stuff', 'none', 'null'].includes(item.note.toLowerCase().trim()) ||
          (item.confidence && item.confidence < 0.75)
        ) ||
        (parsed.warnings && parsed.warnings.length > 0);

      if (needsRetry) {
        console.log('[DEBUG Backend] retry triggered for data quality, calling model:', retryModelName);
        parsed = await runGemini(retryModelName);
      }
    } catch (e) {
      console.error('Gemini processing failed:', e);
      return res.status(500).json({ error: `Gemini processing failed: ${e.message}` });
    }
    
    console.log('[DEBUG Backend] parsed_json:', parsed);

    // Backend note safety validation:
    // Only perform this if we have a text input. For audio, we trust Gemini's transcript and note extraction more.
    if (mode === 'text' && parsed.items && Array.isArray(parsed.items)) {
      parsed.items.forEach(item => {
        item.original_note = item.note || ''; // preserve original Gemini note
        item.note = validateAndCleanNote(item.note, textInput);
        
        // Post-processing: Force category correction for stubborn AI mappings
        const noteLower = item.note.toLowerCase();
        if (noteLower.includes('电影') || noteLower.includes('movie') || noteLower.includes('唱k') || noteLower.includes('karaoke') || noteLower.includes('娱乐')) {
          item.category = '逛街';
        }
      });
    } else if (mode === 'audio' && parsed.items && Array.isArray(parsed.items)) {
      parsed.items.forEach(item => {
        item.original_note = item.note || '';
        // Note: For audio mode, we DO NOT run validateAndCleanNote against a textInput
        // because we don't have textInput! The `heard_text` generated by Gemini is our textInput.
        item.note = validateAndCleanNote(item.note, parsed.heard_text || '');
        
        // Post-processing: Force category correction for stubborn AI mappings
        const noteLower = item.note.toLowerCase();
        if (noteLower.includes('电影') || noteLower.includes('movie') || noteLower.includes('唱k') || noteLower.includes('karaoke') || noteLower.includes('娱乐')) {
          item.category = '逛街';
        }
      });
    }
    
    const finalResponse = {
      success: true,
      heard_text: parsed.heard_text || textInput || '录音已解析',
      items: parsed.items || [],
      detected_total: parsed.detected_total !== undefined ? parsed.detected_total : null,
      calculated_total: parsed.calculated_total || 0,
      total_matches: parsed.total_matches !== undefined ? parsed.total_matches : true,
      warnings: parsed.warnings || [],
      transcript: parsed.heard_text || textInput || '录音已解析', // Compatibility for frontend
    };

    console.log('[DEBUG Backend] final_response_to_frontend:', finalResponse);

    return res.status(200).json(finalResponse);

  } catch (error) {
    console.error('API Error:', error);
    console.log('[DEBUG Backend] error_stage: API Catch Block ->', error.message);
    return res.status(500).json({ error: `Parsing failed: ${error.message}` });
  }
};
