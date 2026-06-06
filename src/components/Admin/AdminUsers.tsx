import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import * as Icons from 'lucide-react';

interface Member {
  id: string;
  created_at: string;
  email: string;
  nickname?: string;
  username?: string;
  member_status: 'free' | 'pro';
  avatar?: string;
  isAdmin: boolean;
  is_admin_role?: boolean;
}

interface AdminUsersProps {
  currentUserId: string;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({
  currentUserId,
  triggerFeedback,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Action Loading states
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [togglingProUserId, setTogglingProUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  // Add User Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newMemberStatus, setNewMemberStatus] = useState<'free' | 'pro'>('free');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch gulu_members table
      const { data: membersData, error: membersError } = await supabase
        .from('gulu_members')
        .select('*');

      if (membersError) throw membersError;

      // 2. Fetch admin_users table
      const { data: adminsData, error: adminsError } = await supabase
        .from('admin_users')
        .select('user_id');

      if (adminsError) throw adminsError;

      const adminIds = new Set((adminsData || []).map((admin) => admin.user_id));

      const processedMembers: Member[] = (membersData || []).map((m: any) => ({
        id: m.id,
        created_at: m.created_at || '',
        email: m.email || '',
        nickname: m.nickname || '',
        username: m.username || '',
        member_status: m.member_status || 'free',
        avatar: m.avatar || '🦊',
        isAdmin: adminIds.has(m.id) || !!m.is_admin_role,
        is_admin_role: !!m.is_admin_role,
      }));

      // Sort by creation time (newest first)
      processedMembers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setMembers(processedMembers);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      triggerFeedback('拉取用户列表失败，请确认 RLS 策略或数据库状态！', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch logged in Admin user UUID for self-action guards
  const getAuthUserId = async (): Promise<string> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    return authUser?.id || currentUserId;
  };

  // Toggle Admin status
  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (togglingUserId) return;
    
    const selfId = await getAuthUserId();
    if (userId === selfId && currentIsAdmin) {
      triggerFeedback('操作受阻：您不能撤销您自己的管理员权限！', 'info');
      return;
    }

    setTogglingUserId(userId);
    const newAdminStatus = !currentIsAdmin;

    try {
      // Check if user is virtual (id is a generated random UUID and does not exist in auth.users)
      // Since virtual users cannot be inserted into admin_users, we just update gulu_members.is_admin_role
      const isVirtual = !members.find(m => m.id === userId)?.created_at; 
      
      if (isVirtual) {
        const { error } = await supabase
          .from('gulu_members')
          .update({ is_admin_role: newAdminStatus })
          .eq('id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('toggle_admin_status', {
          target_user_id: userId,
          make_admin: newAdminStatus,
        });

        if (error) throw error;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, isAdmin: newAdminStatus, is_admin_role: newAdminStatus } : m))
      );

      triggerFeedback(
        `成功将该用户设置为【${newAdminStatus ? '管理员' : '普通用户'}】！`,
        'success'
      );
    } catch (err: any) {
      console.error('Toggle admin error:', err);
      triggerFeedback(err.message || '切换权限失败，请重试！', 'info');
    } finally {
      setTogglingUserId(null);
    }
  };

  // Toggle Pro status
  const handleTogglePro = async (userId: string, currentStatus: 'free' | 'pro') => {
    if (togglingProUserId) return;
    setTogglingProUserId(userId);
    const newStatus = currentStatus === 'pro' ? 'free' : 'pro';

    try {
      const { error } = await supabase
        .from('gulu_members')
        .update({ member_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, member_status: newStatus } : m))
      );

      triggerFeedback(
        `成功将该用户会员状态修改为【${newStatus === 'pro' ? 'Pro 会员' : '普通用户'}】！`,
        'success'
      );
    } catch (err: any) {
      console.error('Toggle Pro status error:', err);
      triggerFeedback(err.message || '更新会员状态失败，请重试！', 'info');
    } finally {
      setTogglingProUserId(null);
    }
  };

  // Delete User from gulu_members and admin_users
  const handleDeleteUser = async (userId: string, email: string) => {
    const selfId = await getAuthUserId();
    if (userId === selfId) {
      triggerFeedback('操作受阻：您不能删除您自己的管理员记录！', 'info');
      return;
    }

    if (!window.confirm(`确定要彻底删除用户【${email}】的个人档案吗？该操作不可撤销。`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      // 1. Delete from gulu_members (RLS Policy allows delete)
      const { error } = await supabase
        .from('gulu_members')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // 2. Delete from admin_users (just in case they are admin, cascade should handle it but we run delete directly too)
      await supabase.from('admin_users').delete().eq('user_id', userId);

      setMembers((prev) => prev.filter((m) => m.id !== userId));
      triggerFeedback(`用户【${email}】的个人档案已彻底删除！`, 'success');
    } catch (err: any) {
      console.error('Delete user error:', err);
      triggerFeedback(err.message || '删除用户失败，请重试！', 'info');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Add Virtual User (方案A)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      triggerFeedback('邮箱地址是必填项哦！', 'info');
      return;
    }

    // Check duplicate email
    if (members.some((m) => m.email.toLowerCase() === newEmail.toLowerCase())) {
      triggerFeedback('该邮箱用户已存在，请勿重复添加！', 'info');
      return;
    }

    setIsAdding(true);
    try {
      // Generate virtual UUID
      const virtualId = crypto.randomUUID();
      const nicknameVal = newNewNickname();

      const newMemberRow = {
        id: virtualId,
        email: newEmail.trim(),
        nickname: nicknameVal,
        member_status: newMemberStatus,
        is_admin_role: newIsAdmin,
      };

      // 1. Insert into gulu_members (RLS Policy allows insert)
      const { error } = await supabase
        .from('gulu_members')
        .insert(newMemberRow);

      if (error) throw error;

      // Update local state list
      const addedMember: Member = {
        id: virtualId,
        created_at: '', // Blank means virtual/not-logged-in yet
        email: newEmail.trim(),
        nickname: nicknameVal,
        username: nicknameVal,
        member_status: newMemberStatus,
        avatar: '🦊',
        isAdmin: newIsAdmin,
        is_admin_role: newIsAdmin,
      };

      setMembers([addedMember, ...members]);
      triggerFeedback('虚拟个人档案创建成功！用户注册后将自动激活绑定。', 'success');
      
      // Reset form
      setNewEmail('');
      setNewNickname('');
      setNewMemberStatus('free');
      setNewIsAdmin(false);
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Add user error:', err);
      triggerFeedback(err.message || '录入虚拟档案失败，请重试！', 'info');
    } finally {
      setIsAdding(false);
    }
  };

  const newNewNickname = () => {
    if (newNickname.trim()) return newNickname.trim();
    return newEmail.split('@')[0] || '预设用户';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '未知';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Filter members by search query
  const filteredMembers = members.filter((m) => {
    const searchLower = search.toLowerCase();
    return (
      m.email.toLowerCase().includes(searchLower) ||
      (m.nickname || '').toLowerCase().includes(searchLower) ||
      (m.username || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 text-left">
        <div>
          <h2 className="text-lg font-black text-neutral-100 flex items-center gap-2">
            <Icons.Users className="text-[var(--color-accent)]" size={20} />
            用户权限管理中心
          </h2>
          <p className="text-xs text-neutral-400 mt-1">创建虚拟用户档案以预授权限，或直接控制现有成员的 Pro 与 Admin 身份</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-[var(--color-accent)] to-amber-300 hover:from-amber-400 hover:to-amber-300 text-neutral-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Icons.UserPlus size={14} strokeWidth={2.5} />
            添加虚拟用户
          </button>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-4 py-2 bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Icons.RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新列表
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative text-left max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
          <Icons.Search size={14} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索昵称、用户名或邮箱地址..."
          className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/60 border border-white/10 focus:border-[var(--color-accent)]/55 focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-hidden rounded-xl text-xs placeholder-neutral-600 text-neutral-150 transition-all"
        />
      </div>

      {/* User Records Table */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Icons.Loader2 className="animate-spin text-[var(--color-accent)]" size={32} />
          <span className="text-xs text-neutral-450 font-medium">拉取用户数据中...</span>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-24 border border-dashed border-white/10 rounded-[28px] bg-white/[0.01] flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-1 text-neutral-450">
            <Icons.Users size={18} />
          </div>
          <span className="text-xs font-bold text-neutral-300">未找到相关注册用户</span>
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/10 rounded-2xl bg-neutral-900/30">
          <table className="w-full min-w-[800px] border-collapse text-left text-xs text-neutral-200">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">用户昵称 / UID</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">电子邮箱</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">注册状态</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">会员状态</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">Admin 权限</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider text-center">快捷操作控制</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.01] transition-colors">
                  
                  {/* User Profile Avatar & Name */}
                  <td className="px-5 py-4 whitespace-nowrap flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0 select-none">
                      {m.avatar || '🦊'}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-neutral-150">{m.nickname || m.username || '预设用户'}</span>
                      <span className="text-[9px] text-neutral-500 font-mono mt-0.5">{m.id}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-5 py-4 whitespace-nowrap text-neutral-405 font-medium">
                    {m.email}
                  </td>

                  {/* Activation Date / Registration Status */}
                  <td className="px-5 py-4 whitespace-nowrap text-neutral-450 font-mono text-[10px]">
                    {m.created_at ? (
                      <span className="text-emerald-450 font-bold">
                        已激活 ({formatDate(m.created_at)})
                      </span>
                    ) : (
                      <span className="text-neutral-500 font-bold flex items-center gap-1">
                        <Icons.Clock size={11} />
                        未注册 (虚拟预设)
                      </span>
                    )}
                  </td>

                  {/* Membership Pro/Free */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {m.member_status === 'pro' ? (
                      <span className="bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-md font-bold text-[9px] border border-amber-400/20">
                        Pro 会员
                      </span>
                    ) : (
                      <span className="bg-neutral-800 text-neutral-450 px-2 py-0.5 rounded-md font-bold text-[9px] border border-white/5">
                        普通用户
                      </span>
                    )}
                  </td>

                  {/* Admin State Indicator */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {m.isAdmin ? (
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full font-black text-[9px] border border-blue-500/20">
                        <Icons.ShieldCheck size={10} />
                        管理员 (Admin)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-neutral-550 px-2.5 py-0.5 rounded-full font-bold text-[9px]">
                        普通会员
                      </span>
                    )}
                  </td>

                  {/* Privilege Toggle Buttons / Remove user */}
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      
                      {/* Toggle Pro Button */}
                      <button
                        onClick={() => handleTogglePro(m.id, m.member_status)}
                        disabled={togglingProUserId === m.id}
                        style={{
                          backgroundColor: m.member_status === 'pro' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(163, 163, 163, 0.1)',
                          borderColor: m.member_status === 'pro' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(163, 163, 163, 0.2)',
                          color: m.member_status === 'pro' ? '#fbbf24' : '#a3a3a3',
                        }}
                        className="px-2.5 py-1.5 border rounded-lg font-black text-[10px] tracking-wide inline-flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        title={m.member_status === 'pro' ? '取消 Pro 资格' : '升级为 Pro 会员'}
                      >
                        {togglingProUserId === m.id ? (
                          <Icons.Loader2 className="animate-spin" size={10} />
                        ) : m.member_status === 'pro' ? (
                          <>
                            <Icons.UserMinus size={10} />
                            <span>撤销 Pro</span>
                          </>
                        ) : (
                          <>
                            <Icons.UserPlus size={10} />
                            <span>设为 Pro</span>
                          </>
                        )}
                      </button>

                      {/* Toggle Admin Button */}
                      <button
                        onClick={() => handleToggleAdmin(m.id, m.isAdmin)}
                        disabled={togglingUserId === m.id}
                        style={{
                          backgroundColor: m.isAdmin ? 'rgba(59, 130, 246, 0.1)' : 'rgba(163, 163, 163, 0.1)',
                          borderColor: m.isAdmin ? 'rgba(59, 130, 246, 0.2)' : 'rgba(163, 163, 163, 0.2)',
                          color: m.isAdmin ? '#60a5fa' : '#a3a3a3',
                        }}
                        className="px-2.5 py-1.5 border rounded-lg font-black text-[10px] tracking-wide inline-flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        title={m.isAdmin ? '撤销管理员权限' : '设为管理员权限'}
                      >
                        {togglingUserId === m.id ? (
                          <Icons.Loader2 className="animate-spin" size={10} />
                        ) : m.isAdmin ? (
                          <>
                            <Icons.ShieldAlert size={10} />
                            <span>撤销 Admin</span>
                          </>
                        ) : (
                          <>
                            <Icons.ShieldAlert size={10} />
                            <span>设为 Admin</span>
                          </>
                        )}
                      </button>

                      {/* Delete User Profile Button */}
                      <button
                        onClick={() => handleDeleteUser(m.id, m.email)}
                        disabled={deletingUserId === m.id}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        title="删除此档案"
                      >
                        {deletingUserId === m.id ? (
                          <Icons.Loader2 className="animate-spin" size={12} />
                        ) : (
                          <Icons.Trash2 size={12} />
                        )}
                      </button>

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD VIRTUAL USER MODAL DIALOG (GLASSMORPHISM CARD) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl relative text-left">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
              <h3 className="text-sm sm:text-base font-black text-neutral-100 flex items-center gap-2">
                <Icons.UserPlus size={18} className="text-[var(--color-accent)]" />
                添加虚拟用户档案
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <Icons.X size={14} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddUser} className="space-y-4">
              
              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-neutral-400 tracking-wider ml-1">
                  电子邮箱 (必填)
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 bg-neutral-950/60 border border-white/10 focus:border-[var(--color-accent)]/55 focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-hidden rounded-xl text-xs text-neutral-150 transition-all"
                />
              </div>

              {/* Nickname Input */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-neutral-400 tracking-wider ml-1">
                  用户昵称 (选填)
                </label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="未填写时自动使用邮箱前缀"
                  className="w-full px-4 py-2.5 bg-neutral-950/60 border border-white/10 focus:border-[var(--color-accent)]/55 focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-hidden rounded-xl text-xs text-neutral-150 transition-all"
                />
              </div>

              {/* Membership Selection Row */}
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-neutral-400 tracking-wider ml-1">
                    会员级别
                  </label>
                  <select
                    value={newMemberStatus}
                    onChange={(e: any) => setNewMemberStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-950/60 border border-white/10 focus:border-[var(--color-accent)]/55 outline-hidden rounded-xl text-xs text-neutral-200 cursor-pointer"
                  >
                    <option value="free">普通用户 (free)</option>
                    <option value="pro">Pro 会员 (pro)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-neutral-400 tracking-wider ml-1">
                    是否为管理员
                  </label>
                  <select
                    value={newIsAdmin ? 'yes' : 'no'}
                    onChange={(e) => setNewIsAdmin(e.target.value === 'yes')}
                    className="w-full px-3 py-2.5 bg-neutral-950/60 border border-white/10 focus:border-[var(--color-accent)]/55 outline-hidden rounded-xl text-xs text-neutral-200 cursor-pointer"
                  >
                    <option value="no">普通会员</option>
                    <option value="yes">系统管理员 (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-[10px] text-neutral-400 leading-normal flex items-start gap-2 select-none mt-2">
                <Icons.Info size={12} className="text-blue-400 shrink-0 mt-0.5" />
                <span>提示：创建的虚拟档案会在用户以后注册此邮箱账号登录时，自动匹配绑定预设的 Pro/Admin 权限及昵称数据。</span>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-white/10 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  取消
                </button>
                
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 bg-gradient-to-r from-[var(--color-accent)] to-amber-300 hover:from-amber-400 hover:to-amber-300 text-neutral-950 rounded-xl text-xs font-black flex items-center gap-1 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? (
                    <>
                      <Icons.Loader2 className="animate-spin" size={13} />
                      <span>正在保存...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Check size={13} strokeWidth={2.5} />
                      <span>录入档案</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
