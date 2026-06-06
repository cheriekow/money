import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';
import { supabase } from '../supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  triggerFeedback,
}) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLoginMode && !username)) {
      triggerFeedback('请填写所有必填字段哦！', 'info');
      return;
    }

    setIsLoading(true);

    if (isLoginMode) {
      // 1. Supabase Sign In
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      // Auto-routing: if login fails because the email is not registered (invalid credentials), attempt signup on the fly
      if (error) {
        if (error.message.includes('Invalid login credentials') || error.status === 400) {
          const defaultUsername = email.split('@')[0];
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: defaultUsername,
                nickname: defaultUsername,
                avatar: '🐱',
                is_pro_member: false,
              }
            }
          });

          if (!signUpError && signUpData.user) {
            // Try creating a profile record
            try {
              await supabase.from('gulu_members').upsert({
                id: signUpData.user.id,
                nickname: defaultUsername,
                member_status: 'free',
              });
            } catch (dbErr) {
              console.warn("DB Profiles table error:", dbErr);
            }

            const loggedUser: User = {
              username: defaultUsername,
              email: signUpData.user.email || email,
              avatar: '🐱',
              isProMember: false,
              token: signUpData.session?.access_token || 'supabase-token-xyz',
            };

            onLoginSuccess(loggedUser);
            triggerFeedback('注册成功，已自动登录！', 'success');
            setIsLoading(false);
            onClose();
            return;
          } else if (signUpError) {
            setIsLoading(false);
            triggerFeedback(`登录失败: ${error.message}`, 'info');
            return;
          }
        }

        setIsLoading(false);
        triggerFeedback(`登录失败: ${error.message}`, 'info');
        return;
      }

      if (data.user) {
        // Fetch profiles table or fallback to metadata
        let isPro = false;
        let fetchedUsername = email.split('@')[0];
        let fetchedAvatar = '🐱';

        try {
          const { data: profile } = await supabase.from('gulu_members').select('*').eq('id', data.user.id).single();
          if (profile) {
            isPro = profile.member_status === 'pro';
            if (profile.nickname) fetchedUsername = profile.nickname;
            else if (profile.username) fetchedUsername = profile.username;
            if (profile.avatar) fetchedAvatar = profile.avatar;
          } else {
            isPro = data.user.user_metadata?.member_status === 'pro' || !!data.user.user_metadata?.is_pro_member;
            if (data.user.user_metadata?.nickname) fetchedUsername = data.user.user_metadata.nickname;
            else if (data.user.user_metadata?.username) fetchedUsername = data.user.user_metadata.username;
            if (data.user.user_metadata?.avatar) fetchedAvatar = data.user.user_metadata.avatar;
          }
        } catch {
          isPro = !!data.user.user_metadata?.is_pro_member;
          if (data.user.user_metadata?.nickname) fetchedUsername = data.user.user_metadata.nickname;
          else if (data.user.user_metadata?.username) fetchedUsername = data.user.user_metadata.username;
          if (data.user.user_metadata?.avatar) fetchedAvatar = data.user.user_metadata.avatar;
        }

        // Apply Hybrid storage logic for username/nickname:
        if (!isPro) {
          // Free user: prioritize localStorage nickname, fallback to metadata/email prefix
          const localNickname = localStorage.getItem('user_nickname');
          if (localNickname) {
            fetchedUsername = localNickname;
          } else {
            fetchedUsername = fetchedUsername || email.split('@')[0];
          }
          const localAvatar = localStorage.getItem('user_avatar');
          if (localAvatar) {
            fetchedAvatar = localAvatar;
          }
        } else {
          // Pro user: Prioritize Supabase cloud data, fallback to email prefix if empty
          fetchedUsername = fetchedUsername || email.split('@')[0];
        }

        const loggedUser: User = {
          username: fetchedUsername,
          email: data.user.email || email,
          avatar: fetchedAvatar,
          isProMember: isPro,
          token: data.session?.access_token || 'supabase-token-xyz',
        };

        onLoginSuccess(loggedUser);
        triggerFeedback('欢迎回来，登录成功！', 'success');
        setIsLoading(false);
        onClose();
      }
    } else {
      // 2. Supabase Sign Up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            nickname: username,
            avatar: '🐱',
            member_status: 'free',
            is_pro_member: false,
          }
        }
      });

      if (error) {
        setIsLoading(false);
        triggerFeedback(`注册失败: ${error.message}`, 'info');
        return;
      }

      if (data.user) {
        // Try creating a profile in DB profiles table
        try {
          await supabase.from('gulu_members').upsert({
            id: data.user.id,
            nickname: username,
            member_status: 'free',
          });
        } catch (dbErr) {
          console.warn("DB Profiles table error (using metadata fallback):", dbErr);
        }

        const loggedUser: User = {
          username: username,
          email: data.user.email || email,
          avatar: '🐱',
          isProMember: false,
          token: data.session?.access_token || 'supabase-token-xyz',
        };

        onLoginSuccess(loggedUser);
        triggerFeedback('注册成功，已自动登录！', 'success');
        setIsLoading(false);
        onClose();
      }
    }
  };

  // Quick Login Options via Supabase register-or-login helper
  const handleQuickLogin = async (role: 'free' | 'pro') => {
    const isPro = role === 'pro';
    const email = isPro ? 'pro_member@gulu.com' : 'free_guest@gulu.com';
    const username = isPro ? '咕噜尊贵Pro' : '极简体验官';
    const avatar = isPro ? '👑' : '🦊';
    const password = 'Password123!';

    setIsLoading(true);

    // Attempt Sign In first
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // If account doesn't exist, sign up on the fly
    if (error && error.message.includes('Invalid login credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            nickname: username,
            avatar,
            member_status: isPro ? 'pro' : 'free',
            is_pro_member: isPro,
          }
        }
      });
      if (signUpError) {
        setIsLoading(false);
        triggerFeedback(`快捷登录失败: ${signUpError.message}`, 'info');
        return;
      }
      data = signUpData;

      // Try creating db profiles record
      try {
        await supabase.from('gulu_members').upsert({
          id: data.user?.id,
          nickname: username,
          member_status: isPro ? 'pro' : 'free',
        });
      } catch (dbErr) {
        console.warn("DB Profiles error on quick sign up:", dbErr);
      }
    } else if (error) {
      setIsLoading(false);
      triggerFeedback(`快捷登录失败: ${error.message}`, 'info');
      return;
    }

    if (data.user) {
      let isProMemberReal = isPro;
      let fetchedUsername = username;
      let fetchedAvatar = avatar;
      try {
        const { data: profile } = await supabase.from('gulu_members').select('*').eq('id', data.user.id).single();
        if (profile) {
          isProMemberReal = profile.member_status === 'pro';
          if (profile.nickname) fetchedUsername = profile.nickname;
          else if (profile.username) fetchedUsername = profile.username;
          if (profile.avatar) fetchedAvatar = profile.avatar;
        } else {
          isProMemberReal = data.user.user_metadata?.member_status === 'pro' || !!data.user.user_metadata?.is_pro_member;
          if (data.user.user_metadata?.nickname) fetchedUsername = data.user.user_metadata.nickname;
          else if (data.user.user_metadata?.username) fetchedUsername = data.user.user_metadata.username;
          if (data.user.user_metadata?.avatar) fetchedAvatar = data.user.user_metadata.avatar;
        }
      } catch {
        isProMemberReal = data.user.user_metadata?.member_status === 'pro' || !!data.user.user_metadata?.is_pro_member;
        if (data.user.user_metadata?.nickname) fetchedUsername = data.user.user_metadata.nickname;
        else if (data.user.user_metadata?.username) fetchedUsername = data.user.user_metadata.username;
        if (data.user.user_metadata?.avatar) fetchedAvatar = data.user.user_metadata.avatar;
      }

      // Apply Hybrid storage logic for username/nickname:
      if (!isProMemberReal) {
        // Free user: prioritize localStorage nickname, fallback to metadata/email prefix
        const localNickname = localStorage.getItem('user_nickname');
        if (localNickname) {
          fetchedUsername = localNickname;
        } else {
          fetchedUsername = fetchedUsername || email.split('@')[0];
        }
        const localAvatar = localStorage.getItem('user_avatar');
        if (localAvatar) {
          fetchedAvatar = localAvatar;
        }
      } else {
        // Pro user: Prioritize Supabase cloud data, fallback to email prefix if empty
        fetchedUsername = fetchedUsername || email.split('@')[0];
      }

      const loggedUser: User = {
        username: fetchedUsername,
        email: data.user.email || email,
        avatar: fetchedAvatar,
        isProMember: isProMemberReal,
        token: data.session?.access_token || 'supabase-token-xyz',
      };

      onLoginSuccess(loggedUser);
      triggerFeedback(`快捷登录：欢迎您，${loggedUser.username}！`, 'success');
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none" id="auth-modal-container">
      {/* Backdrop with Glassmorphism */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
        id="auth-backdrop"
      />

      {/* Auth Modal Card */}
      <motion.div
        initial={{ y: '100%', scale: 1 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 border-black sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-hidden flex flex-col justify-between"
        id="auth-modal-card"
      >
        {/* Mobile Swipe Bar Decorator */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4 block sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-extrabold text-neutral-900 flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-[var(--color-accent)] rounded-full animate-pulse" />
            {isLoginMode ? '欢迎登录咕噜存钱' : '加入咕噜极简记账'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 bg-neutral-250/60 text-neutral-800 hover:bg-neutral-250 rounded-full transition-colors cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-neutral-100 p-1 rounded-xl mb-4 select-none animate-fade-in">
          <button
            type="button"
            onClick={() => setIsLoginMode(true)}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              isLoginMode ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            登录账号
          </button>
          <button
            type="button"
            onClick={() => setIsLoginMode(false)}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              !isLoginMode ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            注册新账号
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3.5">
            {/* Username field (only in signup mode) */}
            {!isLoginMode && (
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">用户昵称</label>
                <div className="flex items-center gap-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-2xl px-3 py-2.5 mt-1">
                  <Icons.User size={14} className="text-neutral-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="给自己起个好听的名字"
                    className="w-full bg-transparent text-xs font-bold text-neutral-900 focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">电子邮箱</label>
              <div className="flex items-center gap-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-2xl px-3 py-2.5 mt-1">
                <Icons.Mail size={14} className="text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gulu@example.com"
                  className="w-full bg-transparent text-xs font-bold text-neutral-900 focus:outline-none"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">安全密码</label>
              <div className="flex items-center justify-between gap-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-2xl px-3 py-2.5 mt-1">
                <div className="flex items-center gap-2 flex-1">
                  <Icons.KeyRound size={14} className="text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入登录密码"
                    className="w-full bg-transparent text-xs font-bold text-neutral-900 focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer flex items-center justify-center"
                >
                  {showPassword ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[var(--color-btn-primary)] hover:bg-black text-[var(--color-btn-primary-text)] py-3.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-md mt-4"
          >
            {isLoading ? (
              <>
                <Icons.Loader2 className="animate-spin text-[var(--color-accent)]" size={16} />
                <span>请稍后，数据处理中...</span>
              </>
            ) : (
              <>
                <Icons.LogIn size={16} />
                <span>{isLoginMode ? '立即登录' : '立即注册'}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-xs font-bold text-neutral-500 hover:text-black transition-colors"
          >
            {isLoginMode ? '还没有账号？点此立即注册 🚀' : '已有账号？点此直接登录 👈'}
          </button>
        </div>


      </motion.div>
    </div>
  );
};
