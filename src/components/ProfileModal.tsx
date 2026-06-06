import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { supabase } from '../supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser: (updatedUser: User) => void;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
}

const PRESET_AVATARS = ['🦊', '🐨', '🐼', '🐯', '🦁', '🐱', '🐶', '🐹', '🐰', '🐸', '🦄', '🦖'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  triggerFeedback,
}) => {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');
  const [customAvatar, setCustomAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with current user
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username);
      setSelectedAvatar(PRESET_AVATARS.includes(user.avatar) ? user.avatar : '');
      setCustomAvatar(PRESET_AVATARS.includes(user.avatar) ? '' : user.avatar);
    }
  }, [isOpen, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalUsername = username.trim();
    if (!finalUsername) {
      triggerFeedback('昵称不能为空哦！', 'info');
      return;
    }

    const finalAvatar = customAvatar.trim() || selectedAvatar || '🦊';

    setIsSaving(true);

    try {
      if (!user.isProMember) {
        // Free user: Save nickname & avatar locally and skip Supabase
        localStorage.setItem('user_nickname', finalUsername);
        localStorage.setItem('user_avatar', finalAvatar);
        
        const updatedUser: User = {
          ...user,
          username: finalUsername,
          avatar: finalAvatar,
        };
        onUpdateUser(updatedUser);
        triggerFeedback('个人资料成功更新（已存至本地）！', 'success');
        onClose();
      } else {
        // Pro user: Sync to Supabase
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          triggerFeedback('未找到登录会话，请重新登录！', 'info');
          setIsSaving(false);
          return;
        }

        // Update nickname in Supabase gulu_members table
        const { error: dbError } = await supabase
          .from('gulu_members')
          .update({ nickname: finalUsername })
          .eq('id', authUser.id);

        if (dbError) {
          console.warn("Update failed, attempting upsert:", dbError);
          const { error: upsertError } = await supabase
            .from('gulu_members')
            .upsert({ id: authUser.id, nickname: finalUsername, member_status: 'pro' });
          
          if (upsertError) {
            throw upsertError;
          }
        }

        // Also update Supabase auth metadata
        await supabase.auth.updateUser({
          data: {
            username: finalUsername,
            nickname: finalUsername,
            avatar: finalAvatar,
          }
        });

        // Update local React state
        const updatedUser: User = {
          ...user,
          username: finalUsername,
          avatar: finalAvatar,
        };

        onUpdateUser(updatedUser);
        triggerFeedback('个人资料成功更新（已同步云端）！', 'success');
        onClose();
      }
    } catch (err: any) {
      console.error("Save profile error:", err);
      triggerFeedback(`保存失败: ${err.message || err}`, 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const selectPreset = (avatar: string) => {
    setSelectedAvatar(avatar);
    setCustomAvatar('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none" id="profile-modal-container">
          {/* Glass backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full sm:max-w-md bg-white border border-neutral-100 rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-8 shadow-2xl z-10 flex flex-col gap-6 text-neutral-900 overflow-hidden font-sans border-b-0 sm:border-b"
          >
            {/* Header section */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3 text-left">
              <div>
                <h3 className="text-base font-black tracking-tight text-neutral-900 flex items-center gap-2">
                  <Icons.UserPen size={18} className="text-[var(--color-accent)]" />
                  修改个人信息
                </h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">定制您专属的记账昵称与个性头像</p>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="p-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-400 hover:text-black rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="关闭"
              >
                <Icons.X size={15} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-5 text-left">
              {/* Nickname Input field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                  <Icons.Signature size={12} />
                  您的个性昵称
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入您的新昵称..."
                  disabled={isSaving}
                  className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 bg-[var(--color-input-bg)] text-xs font-bold text-neutral-950 focus:border-black focus:bg-white focus:outline-none transition-all placeholder-neutral-400 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Curated Avatar Grid select */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                  <Icons.Smile size={12} />
                  选择预设头像
                </label>
                
                <div className="grid grid-cols-6 gap-2 bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100">
                  {PRESET_AVATARS.map((avatar) => {
                    const isPicked = selectedAvatar === avatar && !customAvatar;
                    return (
                      <button
                        key={avatar}
                        type="button"
                        disabled={isSaving}
                        onClick={() => selectPreset(avatar)}
                        className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all cursor-pointer select-none border-2 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isPicked
                            ? 'border-black bg-white shadow-sm scale-110 font-bold'
                            : 'border-transparent hover:bg-white/70 hover:scale-105'
                        }`}
                      >
                        {avatar}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Avatar field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                  <Icons.Keyboard size={12} />
                  或者输入自定义表情
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 border border-neutral-200 bg-[var(--color-input-bg)] rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                    <span className="text-lg leading-none">{customAvatar.trim() || '❓'}</span>
                  </div>
                  <input
                    type="text"
                    maxLength={2}
                    value={customAvatar}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomAvatar(val);
                      if (val.trim()) {
                        setSelectedAvatar('');
                      }
                    }}
                    placeholder="在此输入单个 Emoji 表情，如 🐼..."
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-neutral-200 bg-[var(--color-input-bg)] text-xs font-bold text-neutral-950 focus:border-black focus:bg-white focus:outline-none transition-all placeholder-neutral-400 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

               {/* Buttons Actions */}
              <div className="flex items-center gap-3 mt-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="flex-1 py-3 border border-neutral-250 bg-white hover:bg-neutral-50 rounded-2xl text-xs font-black transition-all active:scale-[0.98] cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ backgroundColor: 'var(--color-accent)' }}
                  className="flex-1 py-3 text-white rounded-2xl text-xs font-black transition-all hover:opacity-95 active:scale-[0.98] cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Icons.Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent-text)' }} />
                      <span style={{ color: 'var(--color-accent-text)' }}>保存中...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Check size={14} strokeWidth={3} style={{ color: 'var(--color-accent-text)' }} />
                      <span style={{ color: 'var(--color-accent-text)' }}>保存资料</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
