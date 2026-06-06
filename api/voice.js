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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('环境变量 GEMINI_API_KEY 未配置');
      return res.status(500).json({ error: '后端未配置 GEMINI_API_KEY，请检查 Vercel 环境变量配置' });
    }

    const promptText = `你是一个智能记账助手的语音解析模块。请听取用户的语音内容（可能包含多笔账目），精确提取出以下记账要素并严格按照 JSON 格式返回。
如果语音中提到“总共”等汇总金额，请与计算所得的总金额进行对比。

要求返回的 JSON 必须符合以下结构：
{
  "items": [
    {
      "type": "expense" 或者 "income",
      "amount": 数值型,
      "category": "提取的分类或动作名称",
      "payment_method": "提取的支付方式，如 TnG, 现金, 银行卡等，若无则留空",
      "transaction_date": "提取的日期，如今天、昨天，或对应的相对日期描述",
      "note": "提取的简短备注，请去除任何类似“AI语音:”的前缀"
    }
  ],
  "detected_total": 语音中提到的总金额（数值型，如果有），否则为 null,
  "calculated_total": 所有 items 中 amount 的计算总和（数值型）,
  "total_matches": detected_total 和 calculated_total 是否一致（如果 detected_total 为 null，则为 true）,
  "transcript": "语音的完整转文字内容"
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

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
                    category: { type: 'STRING' },
                    payment_method: { type: 'STRING' },
                    transaction_date: { type: 'STRING' },
                    note: { type: 'STRING' },
                  },
                  required: ['type', 'amount', 'category', 'payment_method', 'transaction_date', 'note'],
                },
              },
              detected_total: { type: 'NUMBER', nullable: true },
              calculated_total: { type: 'NUMBER' },
              total_matches: { type: 'BOOLEAN' },
              transcript: { type: 'STRING' },
            },
            required: ['items', 'calculated_total', 'total_matches', 'transcript'],
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
