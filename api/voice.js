/**
 * 咕噜存钱 AI 语音记账 Serverless API 路由
 * 
 * 作用：接收前端上传的录音文件 (Blob/webm)，通过 OpenAI Whisper 进行语音识别 (STT)，
 *      再结合 GPT 模型智能分析提取消费要素（分类、金额、备注），完成自动化记账流水生成。
 * 
 * 部署提示：该路由可以直接部署于 Vercel / Cloud Run 等云函数平台。
 * 环境依赖：npm install openai dotenv express-fileupload
 */

import dotenv from 'dotenv';
dotenv.config();

// Vercel Serverless Function 默认导出函数形式
export default async (req, res) => {
  // 仅支持 POST 请求用于上传音频
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不支持，请使用 POST 上传音频' });
  }

  // --- 1. 鉴权逻辑 ( simulated Auth & Pro Status check ) ---
  const authHeader = req.headers.authorization;
  const isProHeader = req.headers['x-user-pro-status'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '身份校验未通过，缺少有效的 Authorization Bearer Token' });
  }

  const token = authHeader.split(' ')[1];
  
  // 检查是否为 Pro 会员
  if (isProHeader !== 'true' && token !== 'mock-jwt-token-pro-456') {
    return res.status(403).json({ error: '权限被拦截：此智能语音功能仅限 👑 Pro 尊贵会员使用' });
  }

  // --- 2. 接收前端上传的音频 Base64 数据 ---
  try {
    const { audio } = req.body || {};
    
    if (!audio) {
      return res.status(400).json({ error: '请求体中缺少 Base64 编码的音频数据 (audio)' });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('环境变量 GEMINI_API_KEY 未配置');
      return res.status(500).json({ error: '后端未配置 GEMINI_API_KEY，请检查 Vercel 环境变量配置' });
    }

    const promptText = `You are a multilingual Malaysian expense/income transaction parser.
The user may speak Chinese, English, Malay, or a mixture of these languages.
Your job is to understand the meaning, not just match keywords.

Return strict JSON only.
Do not explain.
Do not include markdown.

Rules for AI:
1. If the user mentions spending, buying, eating, drinking, paying, ordering, subscribing, or purchasing, classify as "expense".
2. If the user mentions receiving money, salary, client payment, income, commission, or freelance payment, classify as "income".
3. If unclear, default to "expense".
4. Extract only the numeric value into amount. (Example: "RM20" -> 20, "20块" -> 20, "20 ringgit" -> 20)
5. Put the actual item/service description into note. (Example: "roti planta 20块，用 Touch 'n Go 支付" -> note: "Roti Planta")
6. Do not put amount words or payment method words into note.
7. If the user says one amount and multiple items, create one transaction and combine the items into note. (Example: "10块钱，吃了汉堡包还有喝了 Ice Lemon Tea" -> amount: 10, note: "汉堡包、Ice Lemon Tea")
8. Only split into multiple transactions when there are clearly multiple separate amounts. (Example: "Nasi Lemak 10块，Ice Lemon Tea 5块" -> Output two items)
9. Detect Touch 'n Go / TNG / e-wallet as payment_method: "TnG".
10. Detect cash / tunai / 现金 as payment_method: "现金".
11. Detect card / bank transfer / DuitNow / online banking as payment_method: "银行卡".
12. If no payment method is mentioned, return payment_method as an empty string "".
13. Use the existing app categories only: 吃饭, 逛街, 网购, 日常用品, 交通, 收入, 自定义.
14. For food, drinks, meals, restaurants, Malaysian food, coffee, tea, and ordering food, use category: "吃饭".
15. For transport, petrol, Grab, toll, parking, train, bus, taxi, use category: "交通".
16. For online shopping, Shopee, Lazada, Taobao, use category: "网购".
17. For salary, client payment, freelance income, and money received, use category: "收入".
18. If category is uncertain, use "自定义".`;

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
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: audio,
                },
              },
              {
                text: promptText,
              },
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
                    category: { type: 'STRING' },
                    payment_method: { type: 'STRING' },
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
      console.error('Gemini API 响应错误:', errText);
      return res.status(geminiResponse.status).json({ error: `Gemini 服务端处理失败: ${errText}` });
    }

    const resData = await geminiResponse.json();
    const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      return res.status(500).json({ error: 'Gemini 未能返回有效的分析文本' });
    }

    const parsed = JSON.parse(aiText);
    
    return res.status(200).json({
      success: true,
      items: parsed.items || [],
      detected_total: parsed.detected_total || null,
      calculated_total: parsed.calculated_total || 0,
      total_matches: parsed.total_matches !== undefined ? parsed.total_matches : true,
      transcript: parsed.transcript || '',
    });

  } catch (error) {
    console.error('AI 记账服务出错:', error);
    return res.status(500).json({ error: `AI 语音记账失败: ${error.message || '未知内部错误'}` });
  }
};
