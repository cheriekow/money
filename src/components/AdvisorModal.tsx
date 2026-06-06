import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Income } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface AdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  incomes?: Income[];
  selectedYearMonth?: string;
  monthlyBudget: number;
  currency: string;
  username: string;
  isProMember: boolean;
  token: string;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
}

export const AdvisorModal: React.FC<AdvisorModalProps> = ({
  isOpen,
  onClose,
  expenses,
  incomes = [],
  selectedYearMonth = '',
  monthlyBudget,
  currency,
  username,
  isProMember,
  token,
  triggerFeedback,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const getFinanceContext = () => {
    if (!selectedYearMonth) return null;
    
    const monthExpenses = expenses.filter(e => e.date.startsWith(selectedYearMonth));
    const monthIncomes = incomes.filter(i => i.date.startsWith(selectedYearMonth));
    
    if (monthExpenses.length === 0 && monthIncomes.length === 0) {
      return null;
    }

    const totalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = monthIncomes.reduce((sum, e) => sum + e.amount, 0);
    const remainingBudget = monthlyBudget - totalExpense;
    
    const expenseCategoryMap: Record<string, number> = {};
    monthExpenses.forEach(e => {
      expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] || 0) + e.amount;
    });
    
    const expenseByCategory = Object.entries(expenseCategoryMap).map(([name, amount]) => ({ name, amount }));
    
    let topExpenseCategory = { name: '无消费', amount: 0 };
    expenseByCategory.forEach(cat => {
      if (cat.amount > topExpenseCategory.amount) {
        topExpenseCategory = cat;
      }
    });

    return {
      selectedMonth: selectedYearMonth,
      currency,
      monthlyBudget,
      totalExpense,
      totalIncome,
      remainingBudget,
      transactionCount: monthExpenses.length + monthIncomes.length,
      topExpenseCategory,
      expenseByCategory,
      recentTransactions: monthExpenses.slice(0, 15).map(e => ({
        type: 'expense',
        amount: e.amount,
        category: e.category,
        note: e.note,
        date: e.date
      }))
    };
  };

  const financeContext = getFinanceContext();

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          text: `喵哈喽！${username || '主人'}🐾~ 我是您的专属 AI 情感理财顾问「咕噜情绪理财师」喵！
在这里您可以向我倾诉任何理财焦虑、剁手后的罪恶感，或者想放弃存钱的心酸。

帮你看见消费背后的情绪，而不只是金额。试着点击下方的快捷话题与我开启对话吧喵呜~ 👇`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    if (!isProMember) {
      triggerFeedback('此为 Pro 会员专属功能，请先升级解锁 👑', 'info');
      return;
    }

    const userMsg: Message = {
      role: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      const recentHistory = messages.slice(-6);

      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userMessage: textToSend,
          financeContext,
          history: recentHistory
        }),
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new Error('Pro会员权限验证失败或未登录');
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `API error (${response.status})`);
      }

      const resData = await response.json();
      const aiText = resData.text || '喵呜…咕噜脑瓜有点短路了，请等一等再试吧🐾~';

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: aiText,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error('Advisor API call failed:', err);
      triggerFeedback(`分析请求失败: ${err.message}`, 'info');
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ 抱歉主人，小咕噜暂时连不上服务器了 (${err.message})，请稍后再试喵~`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTopic = (topicKey: string) => {
    let text = '';
    switch (topicKey) {
      case 'why': text = '💸 为什么我又乱花钱？'; break;
      case 'analyze': text = '🧠 帮我分析本月消费'; break;
      case 'save': text = '🐷 今天怎么省一点？'; break;
      case 'cut': text = '📉 我哪里可以少花？'; break;
      case 'night': text = '🌙 晚上容易乱买怎么办？'; break;
      case 'challenge': text = '🎯 帮我设一个存钱挑战'; break;
      default: return;
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

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
                    咕噜情绪理财师
                    <span className="bg-amber-400 text-black text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-extrabold ml-1">Pro</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="温暖在线中" />
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-bold mt-0.5 font-sans">
                    帮你看见消费背后的情绪，而不只是金额。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {messages.length > 1 && (
                  <button
                    onClick={handleClearHistory}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
                    title="重置会话"
                  >
                    <Icons.RefreshCw size={14} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-400 hover:text-black rounded-full cursor-pointer transition-colors"
                  title="收起"
                >
                  <Icons.X size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Status Line */}
            <div className="bg-neutral-50/80 border-b border-neutral-100 px-4 py-2 flex items-center justify-center">
              {financeContext ? (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5">
                  <Icons.CheckCircle2 size={12} />
                  已读取本月账本摘要
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1.5">
                  <Icons.Info size={12} />
                  这个月还没有足够账本数据，我可以先根据你的问题给你通用建议。
                </span>
              )}
            </div>

            {/* Messages Dialog list */}
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

              {isLoading && (
                <div className="flex justify-start items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-sm shrink-0 shadow-xs select-none animate-bounce">
                    🐱
                  </div>
                  <div className="bg-white border border-neutral-100 shadow-xs px-4 py-3 rounded-[22px] rounded-tl-xs flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400 font-bold mr-1">咕噜正在分析你的消费情绪...</span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input & Chips */}
            <div className="border-t border-neutral-100 p-4 bg-white shrink-0 relative">
              {/* Pro Lock Overlay */}
              {!isProMember && (
                <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-xs flex items-center justify-center flex-col p-4 rounded-b-[36px]">
                  <div className="bg-white border-2 border-amber-300 shadow-xl rounded-2xl p-4 max-w-sm w-full text-center space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Icons.Crown size={24} />
                    </div>
                    <h4 className="text-sm font-black text-neutral-900">升级 Pro，解锁 AI 情感理财顾问</h4>
                    <p className="text-[10px] text-neutral-500 font-bold pb-2">不仅是记账，更是你的专属财务心理教练。为您深入分析消费行为，建立更健康的金钱关系。</p>
                    <button onClick={onClose} className="w-full py-3 bg-neutral-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95">
                      了解 Pro 详情
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none flex-nowrap -mx-4 px-4 select-none">
                {[
                  { k: 'why', t: '💸 为什么我又乱花钱？' },
                  { k: 'analyze', t: '🧠 帮我分析本月消费' },
                  { k: 'save', t: '🐷 今天怎么省一点？' },
                  { k: 'cut', t: '📉 我哪里可以少花？' },
                  { k: 'night', t: '🌙 晚上容易乱买怎么办？' },
                  { k: 'challenge', t: '🎯 帮我设一个存钱挑战' }
                ].map((chip) => (
                  <button
                    key={chip.k}
                    onClick={() => handleQuickTopic(chip.k)}
                    disabled={isLoading || !isProMember}
                    className="bg-neutral-50 hover:bg-neutral-100/70 text-neutral-800 border border-neutral-200/50 rounded-full px-3.5 py-1.5 text-[10px] font-black cursor-pointer transition-colors whitespace-nowrap active:scale-95 disabled:opacity-50 shrink-0 font-sans"
                  >
                    {chip.t}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputVal.trim() && !isLoading && isProMember) {
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
                  disabled={isLoading || !isProMember}
                  className="flex-1 px-4 py-3 rounded-2xl border border-neutral-250 bg-neutral-50/50 text-xs font-bold text-neutral-950 focus:border-black focus:bg-white focus:outline-none transition-all placeholder-neutral-400 shadow-xs disabled:opacity-60 font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isLoading || !isProMember}
                  style={{ backgroundColor: inputVal.trim() && !isLoading && isProMember ? 'var(--color-accent)' : '#f5f5f5' }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all cursor-pointer shrink-0 disabled:cursor-not-allowed select-none active:scale-[0.98] border border-neutral-200/70"
                >
                  <Icons.Send size={15} style={{ color: inputVal.trim() && !isLoading && isProMember ? 'var(--color-accent-text)' : '#a3a3a3' }} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
