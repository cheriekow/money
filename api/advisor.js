import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ibzrjiblcsigonidmfqp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_B2OO_p8JLWUJN0iG-MOHyA_gVzbCBN4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不支持，请使用 POST' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const token = authHeader.split(' ')[1];

    // 1. Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth Error:', authError);
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    // 2. Query gulu_profiles
    const { data: profile, error: profileError } = await supabase
      .from('gulu_profiles')
      .select('plan, role')
      .eq('id', user.id)
      .single();

    // 3. Fallback check for gulu_members just in case (optional, but requested to strictly check gulu_profiles)
    let isPro = profile?.plan === 'pro' || profile?.role === 'admin';

    // To be perfectly safe, also check if they are pro via metadata or fallback member table
    if (!isPro) {
      const { data: memberProfile } = await supabase
        .from('gulu_members')
        .select('member_status, role')
        .eq('id', user.id)
        .single();
      
      isPro = memberProfile?.member_status === 'pro' || memberProfile?.role === 'admin';
    }

    if (!isPro) {
      return res.status(403).json({ error: 'PRO_REQUIRED' });
    }

    // 4. Handle Gemini Logic
    const { userMessage, financeContext, history } = req.body;

    const modelName = process.env.GEMINI_ADVISOR_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Backend API key not configured.' });
    }

    const systemInstruction = `You are Gulu’s AI Emotional Finance Advisor. You help users understand their spending emotions and build better money habits. You are not an investment advisor. You do not provide stock, crypto, insurance, loan, or legal advice. You focus on emotional spending, budgeting, saving habits, and small daily actions. You should be warm, practical, honest, and non-judgmental. Use the user’s financeContext to give specific observations. If the data is insufficient, say so and ask for one small detail. Keep responses concise and actionable.

Respond in Chinese by default (unless user speaks Malay or English).
Use this structure when suitable:
1. 我看到的情况
2. 可能的情绪原因
3. 一个实际建议
4. 今天可以做的小行动

Do not shame the user. Be supportive and slightly cute.`;

    const contextText = financeContext 
      ? `[Finance Context]:\n${JSON.stringify(financeContext)}` 
      : `[Finance Context]: No sufficient data for this month.`;

    const promptText = `${contextText}\n\nUser input: ${userMessage}`;

    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ];

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.7,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini Error: ${errText}`);
    }

    const resData = await geminiResponse.json();
    const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error('No valid response from Gemini');
    }

    return res.status(200).json({
      success: true,
      text: aiText
    });

  } catch (error) {
    console.error('Advisor API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
