import React from 'react';
import * as Icons from 'lucide-react';
import tngQr from '../assets/tng_qr.png';

interface PricingPageProps {
  user: {
    username: string;
    email: string;
    avatar: string;
    isProMember: boolean;
  } | null;
  onBackToApp: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ user, onBackToApp }) => {
  const handleWhatsApp = () => {
    const phone = '601161162855';
    const email = user?.email;
    const text = email
      ? `你好，我刚扫码付款了 VOKE Pro 会员。我的注册邮箱是：${email}。这是我的付款截图，麻烦帮我开通，谢谢！`
      : `你好，我刚付款了 VOKE Pro 会员，麻烦帮我开通，谢谢！`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 flex flex-col font-sans select-none antialiased relative overflow-hidden">
      
      {/* Background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-200/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-xl mx-auto w-full px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center relative z-10">
        
        {/* Back Button */}
        <button
          onClick={onBackToApp}
          className="self-start mb-6 text-xs text-neutral-500 hover:text-neutral-950 flex items-center gap-1.5 transition-colors cursor-pointer group font-extrabold"
        >
          <Icons.ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          返回主页面
        </button>

        {/* Content Card */}
        <div className="bg-white/80 backdrop-blur-md border border-neutral-100 rounded-[36px] p-6 sm:p-10 shadow-2xl flex flex-col text-center gap-6">
          
          {/* Header Title Area */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-850 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
              <Icons.Crown size={12} className="fill-amber-400 text-amber-500" />
              PRO 会员特权升级
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug">
              升级 Pro 会员，解锁全部高级功能
            </h2>
            <p className="text-xs text-neutral-500 font-extrabold tracking-wide flex items-center justify-center gap-1.5 flex-wrap">
              <span>终身买断制</span>
              <span className="text-neutral-300">•</span>
              <span>专属 AI 语音顾问</span>
              <span className="text-neutral-300">•</span>
              <span>全量数据报表</span>
            </p>
          </div>

          {/* Pricing tier & value display */}
          <div className="py-4 border-y border-neutral-100 flex flex-col items-center justify-center gap-1">
            <span className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">终身买断特惠价</span>
            <div className="flex items-baseline gap-1 font-sans">
              <span className="text-lg font-black text-neutral-900 leading-none">RM</span>
              <span className="text-4xl font-black text-neutral-900 leading-none tracking-tight">29.00</span>
            </div>
            <span className="text-[9px] text-neutral-400 font-semibold leading-none line-through">原价 RM 59.00</span>
          </div>

          {/* Touch 'n Go Payment Card */}
          <div className="bg-neutral-50 border border-neutral-150/60 rounded-3xl p-5 flex flex-col items-center gap-4">
            
            {/* TNG QR Code Image */}
            <div className="relative bg-white p-3 rounded-2xl shadow-sm border border-neutral-100 overflow-hidden max-w-[240px] w-full aspect-square flex items-center justify-center">
              <img
                src={tngQr}
                alt="Touch 'n Go DuitNow QR"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            
            <p className="text-[10px] text-neutral-500 font-extrabold max-w-xs leading-normal">
              请使用 Touch 'n Go eWallet 或任何支持 DuitNow 的银行 App 扫码转账付款。
            </p>
          </div>

          {/* Call to Action Button */}
          <div className="space-y-3">
            <button
              onClick={handleWhatsApp}
              className="w-full py-4 bg-[#25D366] hover:bg-[#20ba56] text-white font-black rounded-2xl text-xs tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <Icons.MessageSquareQuote size={16} strokeWidth={2.5} />
              <span>我已付款，前往 WhatsApp 发送截图</span>
            </button>
            
            <div className="text-[9px] text-neutral-450 font-semibold max-w-xs mx-auto leading-normal">
              点击后会自动加载您的注册邮箱并拉起 WhatsApp 对话，请将付款凭证截图发送给管理员，我们会在收到截图后第一时间为您激活账户权限。
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
};
