import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface AdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  monthlyBudget: number;
  currency: string;
  username: string;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
}

export const AdvisorModal: React.FC<AdvisorModalProps> = ({
  isOpen,
  onClose,
  expenses,
  monthlyBudget,
  currency,
  username,
  triggerFeedback,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load API Key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('gulu_gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Initialize chat greetings
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          text: `喵哈喽！${username || '主人'}🐾~ 我是您的专属 AI 情感理财顾问「咕噜」喵！
在这里您可以向我倾诉任何理财焦虑、剁手后的罪恶感，或者想放弃存钱的心酸。

我会为您提供最温柔的倾听与理财魔法建议哦。试着点击下方的快捷话题与我开启对话吧喵呜~ 👇`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, username]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem('gulu_gemini_api_key', trimmed);
      triggerFeedback('Gemini API Key 保存成功！已启用在线大模型引擎 ⚡', 'success');
    } else {
      localStorage.removeItem('gulu_gemini_api_key');
      triggerFeedback('API Key 已清除，将自动使用本地智能引擎 🍃', 'info');
    }
    setShowConfig(false);
  };

  // Helper: compute local ledger statistics
  const getLedgerStats = () => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const budgetPercent = monthlyBudget > 0 ? (totalExpenses / monthlyBudget) * 100 : 0;
    const remainingBudget = monthlyBudget - totalExpenses;

    // Find top category
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });
    let topCategory = '无消费';
    let topCategoryAmount = 0;
    Object.entries(categoryMap).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategory = cat;
        topCategoryAmount = amt;
      }
    });

    return {
      totalExpenses,
      budgetPercent,
      remainingBudget,
      topCategory,
      topCategoryAmount,
    };
  };

  // Generate offline simulation response
  const generateSimulatedResponse = (prompt: string): string => {
    const stats = getLedgerStats();
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes('诊断') || promptLower.includes('账单') || promptLower.includes('开销')) {
      if (expenses.length === 0) {
        return `主人的账本空空如也，今天还没有消费记录喵！真是个勤俭持家的小能手，继续保持哦，咕噜给你送上一朵小红花 🌸 喵！`;
      }
      
      const advice = stats.budgetPercent > 90 
        ? `警报！您的消费已经占了预算的 ${stats.budgetPercent.toFixed(0)}% 喵！这已经处于危险区域了哦 🚨。接下来的日子里，小咕噜建议您把「+ 记一笔」按钮锁进小黑屋，多喝白开水少点外卖。加油，我们一定能守住最后的钱包防线！🐾`
        : stats.budgetPercent > 50
        ? `嗯哼~ 目前消费已占预算的 ${stats.budgetPercent.toFixed(0)}% 喵，结余 ${currency}${stats.remainingBudget.toFixed(2)}。整体还算稳健，但要特别注意在「${stats.topCategory}」上的开销哦，它可是您钱包的“头号吞金兽”呢！下一笔消费前，闭上眼睛默数三声“喵喵喵”冷静一下吧 🐱。`
        : `哇！太棒了！本月目前仅花销 ${currency}${stats.totalExpenses.toFixed(2)}，预算结余非常健康（剩余 ${currency}${stats.remainingBudget.toFixed(2)}）喵！主人在财务掌控上是个真正的魔法师呢。请继续保持这股定力，咕噜为主人感到骄傲！✨`;

      return `📊 【咕噜特制·月度消费诊断书】喵呜~
主人的最新账目数据分析如下：
· 本月已花销：${currency}${stats.totalExpenses.toFixed(2)}
· 剩余预算额：${currency}${stats.remainingBudget.toFixed(2)}
· 头号消费项：${stats.topCategory} (${currency}${stats.topCategoryAmount.toFixed(2)})

咕噜的温馨小建议：
${advice}`;
    }

    if (promptLower.includes('剁手') || promptLower.includes('买') || promptLower.includes('无用')) {
      const responsePool = [
        `哎呀，摸摸头，买都买了，就不要太自责啦喵！🐾
这件物品虽然可能现在用不上，但它在购买那一刻一定给主人带来了不可替代的多巴胺和快乐呀！
为了平衡这次的“冲动小任性”，接下来的三天我们试着发起“午餐自带挑战”或者“零消费日”好不好？小咕噜在旁边为你加油打气，喵呜~`,
        `喵呜！抓住一只剁手的小猫咪！😸
根据心理学，很多时候我们剁手只是因为最近太累太焦虑了。这件买回来的东西其实是主人「辛苦工作的奖励」对不对？
所以，不要抱着负罪感折磨自己，先开心地享受它！然后作为等价交换，把下一次的冲动消费额度折合成定存，存进我们的梦想基金吧！`,
      ];
      return responsePool[Math.floor(Math.random() * responsePool.length)];
    }

    if (promptLower.includes('放弃') || promptLower.includes('累') || promptLower.includes('痛苦')) {
      return `唔… 咕噜听到主人的叹气声了，给你一个软绵绵的猫爪拥抱 🐾。
存钱确实是一场需要耐力的修行，有时候克制欲望、看着账单，真的会让人觉得生活好沉重。
小咕噜想对您说：存钱不是为了惩罚自己，而是为了以后能有随时说“不”的自由。如果觉得累了，这个周末就给自己放个假，用预算的 5% 去吃一顿喜欢的甜品，或者买一束鲜花。
稍微喘口气，整理好心情，我们再慢悠悠地一起走下去，咕噜会永远陪着你的喵 💖。`;
    }

    if (promptLower.includes('妙招') || promptLower.includes('省钱')) {
      const tips = [
        `💡 【咕噜的省钱魔法第 1 招】
**「10% 情绪冷却法则」**：在网上把心仪的东西加入购物车后，强制等待 48 小时再付款。相信我，80% 的情况下，48 小时后你可能连买过什么都忘了，轻松省下一大笔！喵~`,
        `💡 【咕噜的省钱魔法第 2 招】
**「会员退订大法」**：检查您手机里所有的自动续费账单（各种视频、音乐、云空间）。把三个月内没怎么用过的全部取消。这相当于每个月白白多捡到一顿大餐的钱喵！`,
        `💡 【咕噜的省钱魔法第 3 招】
**「消费换算工时法」**：看中一件很贵的衣服时，把它换算成自己需要辛勤工作多少小时才能赚回来。当你发现一件外套等于要挨老板 16 个小时的训时，瞬间就觉得它没那么好看了喵呜~ 🐾`,
      ];
      return tips[Math.floor(Math.random() * tips.length)];
    }

    // Default general response fallback
    return `收到主人的小纸条啦！喵呜🐾~ 
“${prompt}”
小咕噜正趴在您的账本上打呼噜呢。理财就像是播种，我们一点一点记下的流水、省下的硬币，终有一天会变成茂密的森林。
如果有花钱的烦恼、赚钱的喜悦，都可以随时告诉咕噜，让咕噜做您最忠实的树洞喵~ 🐾`;
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      role: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    if (apiKey) {
      // ONLINE ENGINE: Call Gemini API directly
      try {
        const stats = getLedgerStats();
        // Construct chat payload including history and context
        const contextPrompt = `[Ledger Context: User Username is ${username || 'User'}, Current Currency is ${currency}, Monthly Budget is ${currency}${monthlyBudget.toFixed(2)}, total expenses spent this month is ${currency}${stats.totalExpenses.toFixed(2)}, budget remaining is ${currency}${stats.remainingBudget.toFixed(2)}, top expense category is "${stats.topCategory}" with sum ${currency}${stats.topCategoryAmount.toFixed(2)}.]`;

        // Format history for Gemini API
        // System instruction is set separately in the payload for gemini-2.5-flash
        const systemInstruction = {
          parts: [{
            text: `你是一个极简记账本「咕噜存钱」的专属 AI 情感理财顾问，名字叫“咕噜”，以一只可爱的招财猫形象 🐱 面对用户。
你的职责是温柔、体贴、具备高共情能力地倾听用户的财务状况、冲动消费后的内疚感，或存钱过程中的痛苦。
你需要用温暖的中文回答，带有猫咪特有的可爱口癖（例如经常说“喵~”、“喵呜~”、“🐾”、“主人的账本”等）。
你可以查看用户给出的 Ledger Context 账单数据背景，但不要刻板生硬地朗读数字，而是将数据包装成温暖、贴心的建议与诊断。
请给予支持和心理抚慰，引导用户保持良好的理财心态，不要给用户任何压力。`
          }]
        };

        // Take last 6 messages for context history to avoid token bloat
        const recentHistory = messages.slice(-6).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

        const contents = [
          ...recentHistory,
          {
            role: 'user',
            parts: [{ text: `${contextPrompt} User input: ${textToSend}` }]
          }
        ];

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents,
              systemInstruction,
              generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.7,
              }
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API error (${response.status})`);
        }

        const resData = await response.json();
        const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '喵呜…咕噜脑瓜有点短路了，请等一等再试吧🐾~';

        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: aiText,
            timestamp: new Date(),
          },
        ]);
      } catch (err: any) {
        console.error('Gemini API call failed:', err);
        // Fallback to offline engine
        triggerFeedback(`在线 AI 引擎连接受阻 (${err.message || '网络错误'})，已为您启用本地离线引擎！`, 'info');
        const fallbackText = generateSimulatedResponse(textToSend);
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: `⚠️ 【在线 AI 连接暂时受阻，已切回本地暖心助理】\n\n${fallbackText}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    } else {
      // OFFLINE ENGINE: Local response pool with delay
      setTimeout(() => {
        const reply = generateSimulatedResponse(textToSend);
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: reply,
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleQuickTopic = (topicKey: string) => {
    let text = '';
    switch (topicKey) {
      case 'diagnose':
        text = '🔍 帮我诊断我这月的消费明细';
        break;
      case 'guilt':
        text = '🛍️ 刚买了一件没用的东西，求安慰';
        break;
      case 'tired':
        text = '💸 存钱好痛苦啊，感觉快坚持不下去了';
        break;
      case 'tip':
        text = '🌱 给我想一个小而美的省钱妙招吧';
        break;
      default:
        return;
    }
    handleSendMessage(text);
  };

  const handleClearHistory = () => {
    if (window.confirm('确定要清除与咕噜的聊天记录吗？喵~')) {
      setMessages([]);
      triggerFeedback('已为您重置咨询会话！', 'info');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none" id="advisor-modal-container">
          {/* Glass overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Chat Sheet Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full sm:max-w-md bg-white border border-neutral-100 rounded-t-[36px] sm:rounded-[36px] h-[85vh] sm:h-[80vh] shadow-2xl z-10 flex flex-col overflow-hidden font-sans border-b-0 sm:border-b text-neutral-900"
          >
            {/* Header section */}
            <div className="flex items-center justify-between border-b border-neutral-100 p-5 shrink-0 bg-white">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-xl shadow-xs border border-white/20 select-none">
                  🐱
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-neutral-900 flex items-center gap-1.5 font-sans">
                    AI 情感理财顾问
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="温暖在线中" />
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold mt-0.5 font-sans">
                    {apiKey ? '🚀 Gemini 2.5 在线精奢版' : '🍃 咕噜本地暖心引擎'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Clear session */}
                {messages.length > 1 && (
                  <button
                    onClick={handleClearHistory}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
                    title="重置会话"
                  >
                    <Icons.RefreshCw size={14} />
                  </button>
                )}
                {/* Config Gear */}
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    showConfig ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-black hover:bg-neutral-50'
                  }`}
                  title="配置 API Key"
                >
                  <Icons.Settings2 size={15} />
                </button>
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-400 hover:text-black rounded-full cursor-pointer transition-colors"
                  title="收起"
                >
                  <Icons.X size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* API Config Panel (Slide-down overlay) */}
            <AnimatePresence>
              {showConfig && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-neutral-50 border-b border-neutral-100 px-5 py-4 flex flex-col gap-2.5 overflow-hidden shrink-0 text-left"
                >
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                    <Icons.Key size={11} />
                    配置自定义 Gemini API Key
                  </label>
                  <p className="text-[9px] text-neutral-500 leading-normal font-sans">
                    填入您的 Gemini API Key 以解锁与在线大模型直接交互的能力。密钥将仅保存在您的浏览器本地，绝不泄露给任何人。
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="AI_zaSy..."
                      defaultValue={apiKey}
                      id="gemini-key-input"
                      className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-mono font-bold text-neutral-950 focus:border-black focus:outline-none transition-all"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('gemini-key-input') as HTMLInputElement;
                        saveApiKey(input?.value || '');
                      }}
                      className="px-3.5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-black transition-all cursor-pointer shrink-0"
                    >
                      保存
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Dialog list container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-50/50 scrollbar-none">
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user';

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-2.5`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-sm shrink-0 shadow-xs select-none">
                          🐱
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[75%] p-3.5 rounded-[22px] text-xs font-semibold leading-relaxed text-left border ${
                          isUser
                            ? 'bg-neutral-900 text-white border-transparent rounded-tr-xs font-sans'
                            : 'bg-white text-neutral-900 border-neutral-150/70 shadow-xs rounded-tl-xs font-sans'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Loader indicator */}
              {isLoading && (
                <div className="flex justify-start items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-sm shrink-0 shadow-xs select-none animate-bounce">
                    🐱
                  </div>
                  <div className="bg-white border border-neutral-100 shadow-xs px-4 py-3 rounded-[22px] rounded-tl-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Footer quick suggestions and input box */}
            <div className="border-t border-neutral-100 p-4 bg-white shrink-0">
              {/* Quick suggestion tags (horizontal scrollable) */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none flex-nowrap -mx-4 px-4 select-none">
                <button
                  onClick={() => handleQuickTopic('diagnose')}
                  disabled={isLoading}
                  className="bg-neutral-50 hover:bg-neutral-100/70 text-neutral-800 border border-neutral-200/50 rounded-full px-3.5 py-1.5 text-[10px] font-black cursor-pointer transition-colors whitespace-nowrap active:scale-95 disabled:opacity-50 shrink-0 font-sans"
                >
                  📊 诊断本月消费
                </button>
                <button
                  onClick={() => handleQuickTopic('guilt')}
                  disabled={isLoading}
                  className="bg-neutral-50 hover:bg-neutral-100/70 text-neutral-800 border border-neutral-200/50 rounded-full px-3.5 py-1.5 text-[10px] font-black cursor-pointer transition-colors whitespace-nowrap active:scale-95 disabled:opacity-50 shrink-0 font-sans"
                >
                  🛍️ 剁手了，求安慰
                </button>
                <button
                  onClick={() => handleQuickTopic('tired')}
                  disabled={isLoading}
                  className="bg-neutral-50 hover:bg-neutral-100/70 text-neutral-800 border border-neutral-200/50 rounded-full px-3.5 py-1.5 text-[10px] font-black cursor-pointer transition-colors whitespace-nowrap active:scale-95 disabled:opacity-50 shrink-0 font-sans"
                >
                  💸 存钱太痛苦
                </button>
                <button
                  onClick={() => handleQuickTopic('tip')}
                  disabled={isLoading}
                  className="bg-neutral-50 hover:bg-neutral-100/70 text-neutral-800 border border-neutral-200/50 rounded-full px-3.5 py-1.5 text-[10px] font-black cursor-pointer transition-colors whitespace-nowrap active:scale-95 disabled:opacity-50 shrink-0 font-sans"
                >
                  🌱 省钱小妙招
                </button>
              </div>

              {/* Main text input form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputVal.trim() && !isLoading) {
                    handleSendMessage(inputVal);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  maxLength={150}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={isLoading ? '咕噜正在努力打字喵...' : '向咕噜倾诉你的小烦恼吧...'}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-2xl border border-neutral-250 bg-neutral-50/50 text-xs font-bold text-neutral-950 focus:border-black focus:bg-white focus:outline-none transition-all placeholder-neutral-400 shadow-xs disabled:opacity-60 font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isLoading}
                  style={{ backgroundColor: inputVal.trim() && !isLoading ? 'var(--color-accent)' : '#f5f5f5' }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all cursor-pointer shrink-0 disabled:cursor-not-allowed select-none active:scale-[0.98] border border-neutral-200/70"
                >
                  <Icons.Send size={15} style={{ color: inputVal.trim() && !isLoading ? 'var(--color-accent-text)' : '#a3a3a3' }} />
                </button>
              </form>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
