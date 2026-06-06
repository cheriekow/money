import React from 'react';
import { supabase } from '../../supabase';
import * as Icons from 'lucide-react';
import { AdminSubmissions } from './AdminSubmissions';
import { AdminSubmissionDetail } from './AdminSubmissionDetail';
import { AdminUsers } from './AdminUsers';

interface AdminDashboardProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
  currentUserId: string;
  onLogoutSuccess: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentPath,
  onNavigate,
  triggerFeedback,
  currentUserId,
  onLogoutSuccess,
}) => {
  
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      triggerFeedback('已安全退出管理员系统！', 'success');
      onLogoutSuccess();
    } catch (err: any) {
      console.error('Logout error:', err);
      triggerFeedback('退出登录失败，请重试！', 'info');
    }
  };

  // Dispatch current view based on path
  const renderSubView = () => {
    // 1. Match detail page /admin/submissions/:id
    const submissionDetailMatch = currentPath.match(/^\/admin\/submissions\/([a-zA-Z0-9-]+)$/);
    if (submissionDetailMatch) {
      const id = submissionDetailMatch[1];
      return (
        <AdminSubmissionDetail
          id={id}
          onBackToList={() => onNavigate('/admin/submissions')}
          triggerFeedback={triggerFeedback}
        />
      );
    }

    // 2. Match users page /admin/users
    if (currentPath === '/admin/users') {
      return (
        <AdminUsers
          currentUserId={currentUserId}
          triggerFeedback={triggerFeedback}
        />
      );
    }

    // 3. Default or Match list page /admin/submissions
    return (
      <AdminSubmissions
        onViewDetail={(id) => onNavigate(`/admin/submissions/${id}`)}
        triggerFeedback={triggerFeedback}
      />
    );
  };

  const isSubmissionsActive = currentPath === '/admin' || currentPath.startsWith('/admin/submissions');
  const isUsersActive = currentPath === '/admin/users';

  return (
    <div className="min-h-screen w-full bg-radial from-neutral-900 via-neutral-950 to-black text-white flex flex-col font-sans select-none antialiased relative">
      
      {/* Top Banner Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--color-accent)] to-amber-300 pointer-events-none z-50" />

      {/* Admin Navbar */}
      <header className="border-b border-white/5 bg-neutral-950/70 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--color-accent)] to-amber-300 flex items-center justify-center shadow-xs">
            <Icons.ShieldCheck className="text-neutral-950" size={18} strokeWidth={2.5} />
          </div>
          <div className="text-left leading-none">
            <span className="text-sm font-extrabold text-neutral-100 tracking-tight">咕噜 Admin Portal</span>
            <span className="text-[9px] font-mono text-[var(--color-accent)] block mt-1 uppercase tracking-widest font-black">Control Panel</span>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('/')}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            title="去往主页"
          >
            <Icons.Globe size={14} />
            <span className="hidden sm:inline">主页</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            title="退出登录"
          >
            <Icons.LogOut size={13} strokeWidth={2.5} />
            <span>退出</span>
          </button>
        </div>
      </header>

      {/* Admin Main Layout */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Navigation Sidebar Card */}
        <aside className="w-full lg:w-60 bg-white/[0.02] border border-white/10 p-5 rounded-[28px] shrink-0 lg:sticky lg:top-24">
          <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider block mb-3 text-left pl-2">管理控制台</span>
          
          <nav className="flex flex-row lg:flex-col gap-2 w-full">
            
            <button
              onClick={() => onNavigate('/admin/submissions')}
              style={{
                color: isSubmissionsActive ? 'var(--color-accent)' : '#a3a3a3',
                backgroundColor: isSubmissionsActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                borderColor: isSubmissionsActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              }}
              className="flex-1 lg:flex-initial px-4 py-3 rounded-2xl border text-xs font-black text-left flex items-center gap-2.5 transition-all cursor-pointer hover:bg-white/[0.02]"
            >
              <Icons.ClipboardList size={16} />
              <span>表单留言管理</span>
            </button>

            <button
              onClick={() => onNavigate('/admin/users')}
              style={{
                color: isUsersActive ? 'var(--color-accent)' : '#a3a3a3',
                backgroundColor: isUsersActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                borderColor: isUsersActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              }}
              className="flex-1 lg:flex-initial px-4 py-3 rounded-2xl border text-xs font-black text-left flex items-center gap-2.5 transition-all cursor-pointer hover:bg-white/[0.02]"
            >
              <Icons.Users size={16} />
              <span>用户权限管理</span>
            </button>

          </nav>
        </aside>

        {/* Dashboard Content Area */}
        <main className="flex-1 w-full bg-white/[0.01] border border-white/5 rounded-[36px] p-6 sm:p-8 min-h-[500px]">
          {renderSubView()}
        </main>

      </div>

    </div>
  );
};
