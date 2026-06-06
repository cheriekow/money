import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
  currency: string;
  isProMember: boolean;
  onNavigateToPricing: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onUpgradeSuccess,
  triggerFeedback,
  currency,
  isProMember,
  onNavigateToPricing,
}) => {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    if (isProMember) {
      return;
    }
    onClose();
    onNavigateToPricing();
  };

  return (
    <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none" id="pricing-modal-container">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={upgradeSuccess ? undefined : onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        id="pricing-backdrop"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ y: '100%', scale: 1 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 border-black sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-y-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col justify-between"
        id="pricing-modal-card"
      >
        {/* Top bar for mobile */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4 block sm:hidden" />

        {upgradeSuccess ? (
          /* Celebratory success state */
          <div className="text-center py-6 space-y-4 animate-scale-up">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto border-2 border-amber-300 shadow-md">
              <span className="text-3xl animate-bounce">👑</span>
            </div>
            <h3 className="text-xl font-black text-neutral-900 tracking-tight">恭喜您，尊贵的 Pro 会员！</h3>
            <p className="text-xs text-neutral-600 leading-relaxed px-4">
              您已成功解锁了 **咕噜 AI 智能语音记账** 与 **智能分类解析** 专属功能。让我们即刻开启前所未有的全智能记账之旅吧！
            </p>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[10px] text-amber-800 font-extrabold max-w-xs mx-auto">
              🎉 永久尊享权益已绑定到您的体验账号！
            </div>
            <button
              onClick={onClose}
              className="w-full bg-neutral-900 hover:bg-black text-white py-3.5 rounded-full font-black text-xs transition-all active:scale-[0.98] cursor-pointer shadow-md"
            >
              即刻开启智能语音记账
            </button>
          </div>
        ) : (
          /* Normal pricing card list state */
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-extrabold text-neutral-900 flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-amber-300 rounded-full animate-ping" />
                订阅咕噜 Pro 尊享计划
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 bg-neutral-200/60 text-neutral-800 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {/* Sub-header slogan */}
            <p className="text-xs text-neutral-500 leading-normal mb-1">
              升级为 **Pro 语音智能版**，让复杂的记账工作简化成一句随口说出的话，更有 AI 为您细致分析开销。
            </p>

            {/* Two Tier Cards Stack */}
            <div className="space-y-3.5">
              
              {/* Tier 1: Free Card */}
              <div className="p-4 bg-white/70 border border-neutral-200 rounded-2xl flex items-start justify-between relative overflow-hidden transition-all hover:border-neutral-350">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">FREE PLAN</span>
                  <h4 className="text-sm font-extrabold text-neutral-800 mt-1">基础免费版</h4>
                  <p className="text-[9px] text-neutral-500">满足最基本的单次流水记账需求</p>
                  <ul className="text-[10px] text-neutral-600 font-bold space-y-1 mt-2.5">
                    <li className="flex items-center gap-1.5"><Icons.Check size={11} className="text-neutral-400 shrink-0" /> 极简支出与收入记账</li>
                    <li className="flex items-center gap-1.5"><Icons.Check size={11} className="text-neutral-400 shrink-0" /> 月度消费汇总与结余限额</li>
                    <li className="flex items-center gap-1.5"><Icons.Check size={11} className="text-neutral-400 shrink-0" /> 本地安全备份与 JSON 导出</li>
                  </ul>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-black text-neutral-900 font-sans tracking-tight">{currency}0</div>
                  <span className="text-[8px] font-black text-neutral-400 block leading-none">永久免费</span>
                </div>
              </div>

              {/* Tier 2: Pro Card */}
              <div className="p-4 bg-gradient-to-br from-amber-50/70 to-amber-100/30 border-2 border-amber-300 rounded-[22px] flex items-start justify-between relative overflow-hidden transition-all hover:shadow-xs">
                {/* Popular Badge */}
                <div className="absolute top-0 right-0 bg-amber-400 text-neutral-900 text-[8px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl shadow-xs select-none">
                  推荐解锁
                </div>

                <div className="space-y-1 text-left">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none flex items-center gap-1">
                    👑 PRO PLAN
                  </span>
                  <h4 className="text-sm font-black text-neutral-900 mt-1">Pro 语音智能版</h4>
                  <p className="text-[9px] text-neutral-500">专为追求极致效率与高级体验的用户打造</p>
                  
                  <ul className="text-[10px] text-neutral-800 font-extrabold space-y-1.5 mt-2.5">
                    <li className="flex items-center gap-1.5">
                      <Icons.Check size={11} className="text-amber-600 shrink-0" /> 
                      <span>🎤 <strong>AI 语音口语化自动记账</strong></span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Icons.Check size={11} className="text-amber-600 shrink-0" /> 
                      <span>🧠 GPT 智能备注识别与自动匹配分类</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Icons.Check size={11} className="text-amber-600 shrink-0" /> 
                      <span>👑 尊贵会员金色专属头像角标 & 零广告</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Icons.Check size={11} className="text-amber-600 shrink-0" /> 
                      <span>💬 专属 AI 情感理财顾问，温暖倾听</span>
                    </li>
                  </ul>
                </div>

                <div className="text-right shrink-0 pr-1 mt-4">
                  <div className="text-lg font-black text-amber-800 font-sans tracking-tight leading-none">{currency}29</div>
                  <span className="text-[9px] font-black text-amber-700/80 block mt-1 leading-none">/ 单月</span>
                  <span className="text-[8px] font-medium text-neutral-400 block mt-0.5 leading-none line-through">{currency}39</span>
                </div>
              </div>

            </div>

            {/* Action Checkout Footer */}
            <div className="space-y-2 mt-4">
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={paymentLoading || isProMember}
                className={`w-full py-3.5 rounded-full font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md border-b-2 ${
                  isProMember
                    ? 'bg-neutral-200 text-neutral-400 border-neutral-300 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-500 text-neutral-900 border-amber-500 cursor-pointer'
                }`}
              >
                {paymentLoading ? (
                  <>
                    <Icons.Loader2 className="animate-spin text-neutral-900" size={15} />
                    <span>Stripe 安全支付处理中...</span>
                  </>
                ) : isProMember ? (
                  <>
                    <Icons.ShieldCheck size={15} strokeWidth={2.5} />
                    <span>已激活 Pro 智能版会员</span>
                  </>
                ) : (
                  <>
                    <Icons.Lock size={15} strokeWidth={2.5} />
                    <span>立即安全升级 Pro 智能版</span>
                  </>
                )}
              </button>
              
              <div className="text-center">
                <span className="text-[8px] text-neutral-400 font-semibold leading-normal font-sans">
                  通过 Stripe 国际信用卡通道加密支付 · 随时取消自动续费 · 7天无理由退款保障
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
