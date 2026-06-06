import React, { useState } from 'react';
import { supabase } from '../../supabase';
import * as Icons from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (session: any) => void;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
  onBackToApp: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  triggerFeedback,
  onBackToApp,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      triggerFeedback('请填写所有必填字段哦！', 'info');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Sign in via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // 2. Double check if this user exists in admin_users table (frontend guard check)
        const { data: adminCheck, error: checkError } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', data.session.user.id)
          .maybeSingle();

        if (checkError) {
          await supabase.auth.signOut();
          throw new Error('权限数据查询失败，请检查数据库配置！');
        }

        if (!adminCheck) {
          // Force sign out since user is authenticated but not an Admin
          await supabase.auth.signOut();
          triggerFeedback('登录失败：您不具备管理员访问权限！', 'info');
          setIsLoading(false);
          return;
        }

        // Login success!
        triggerFeedback('管理员登录成功，欢迎进入管理系统！', 'success');
        onLoginSuccess(data.session);
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      triggerFeedback(err.message || '登录失败，请检查账号密码！', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-neutral-900 via-neutral-950 to-black text-white p-4 select-none relative overflow-hidden font-sans">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--color-accent)]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[36px] p-8 sm:p-10 shadow-2xl relative z-10 select-none flex flex-col justify-between">
        
        {/* Back Button */}
        <button
          onClick={onBackToApp}
          className="self-start mb-6 text-xs text-neutral-450 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer group"
        >
          <Icons.ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          返回前台网站
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-[var(--color-accent)] to-amber-300 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-[var(--color-accent)]/20 mb-4 animate-fade-in">
            <Icons.ShieldCheck className="text-neutral-950" size={28} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-100">
            管理员后台系统
          </h2>
          <p className="text-xs text-neutral-450 mt-1.5 leading-normal">
            请输入管理员邮箱与密码以登录系统
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5 ml-2">
              <Icons.Mail size={12} className="text-[var(--color-accent)]" />
              管理员邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-5 py-3.5 bg-neutral-900/60 border border-white/10 focus:border-[var(--color-accent)]/55 focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-hidden rounded-2xl text-xs font-medium placeholder-neutral-600 transition-all text-neutral-150"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5 ml-2">
              <Icons.Lock size={12} className="text-[var(--color-accent)]" />
              登录密码
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full pl-5 pr-12 py-3.5 bg-neutral-900/60 border border-white/10 focus:border-[var(--color-accent)]/55 focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-hidden rounded-2xl text-xs font-medium placeholder-neutral-600 transition-all text-neutral-150"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer select-none"
              >
                {showPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 bg-gradient-to-r from-[var(--color-accent)] to-amber-300 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black rounded-2xl text-xs tracking-wide flex items-center justify-center gap-2 border-none shadow-md shadow-[var(--color-accent)]/15 transition-all select-none relative overflow-hidden ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98] cursor-pointer'
            }`}
          >
            {isLoading ? (
              <>
                <Icons.Loader2 className="animate-spin" size={16} />
                <span>安全连接验证中...</span>
              </>
            ) : (
              <>
                <Icons.Lock size={14} strokeWidth={2.5} />
                <span>立即登录后台</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-8">
          <span className="text-[10px] text-neutral-500 font-semibold tracking-wider uppercase flex items-center justify-center gap-1.5 leading-normal">
            <Icons.ShieldAlert size={12} />
            双重行级安全限制保障 (RLS-Guard)
          </span>
        </div>

      </div>
    </div>
  );
};
