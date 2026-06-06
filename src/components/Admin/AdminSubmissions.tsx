import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import * as Icons from 'lucide-react';

interface Submission {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  topic: string;
  message: string;
  phone?: string;
  company?: string;
  status: 'new' | 'handled';
}

interface AdminSubmissionsProps {
  onViewDetail: (id: string) => void;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
}

export const AdminSubmissions: React.FC<AdminSubmissionsProps> = ({
  onViewDetail,
  triggerFeedback,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setSubmissions(data || []);
    } catch (err: any) {
      console.error('Fetch submissions error:', err);
      triggerFeedback('数据拉取失败：请确保 contact_submissions 表和 RLS 规则配置正确！', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Filter and Search logic on the frontend
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.full_name.toLowerCase().includes(search.toLowerCase()) ||
      sub.email.toLowerCase().includes(search.toLowerCase());
    
    const matchesTopic = filterTopic === 'all' || sub.topic === filterTopic;
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;

    return matchesSearch && matchesTopic && matchesStatus;
  });

  // Extract unique topics for filter select
  const uniqueTopics = Array.from(new Set(submissions.map((s) => s.topic)));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Sync Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 text-left">
        <div>
          <h2 className="text-lg font-black text-neutral-100 flex items-center gap-2">
            <Icons.ClipboardList className="text-[var(--color-accent)]" size={20} />
            表单提交管理列表
          </h2>
          <p className="text-xs text-neutral-400 mt-1">查看和处理前台用户提交的联络与咨询留言记录</p>
        </div>

        <button
          onClick={fetchSubmissions}
          disabled={loading}
          className="self-start sm:self-center px-4 py-2 bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Icons.RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新数据
        </button>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
        
        {/* Search Bar Input */}
        <div className="md:col-span-6 relative text-left">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
            <Icons.Search size={14} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索姓名或邮箱地址..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/60 border border-white/10 focus:border-[var(--color-accent)]/55 focus:ring-1 focus:ring-[var(--color-accent)]/20 outline-hidden rounded-xl text-xs placeholder-neutral-600 text-neutral-150 transition-all"
          />
        </div>

        {/* Topic Filter Selector */}
        <div className="md:col-span-3 text-left">
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 focus:border-[var(--color-accent)]/55 outline-hidden rounded-xl text-xs text-neutral-200 cursor-pointer"
          >
            <option value="all">所有咨询主题</option>
            {uniqueTopics.map((topic) => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        {/* Status Filter Selector */}
        <div className="md:col-span-3 text-left">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 focus:border-[var(--color-accent)]/55 outline-hidden rounded-xl text-xs text-neutral-200 cursor-pointer"
          >
            <option value="all">所有处理状态</option>
            <option value="new">新提交 (new)</option>
            <option value="handled">已处理 (handled)</option>
          </select>
        </div>

      </div>

      {/* Submissions List Container */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Icons.Loader2 className="animate-spin text-[var(--color-accent)]" size={32} />
          <span className="text-xs text-neutral-450 font-medium">安全加密加载数据中...</span>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="py-24 border border-dashed border-white/10 rounded-[28px] bg-white/[0.01] flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-1 text-neutral-400">
            <Icons.FolderOpen size={18} />
          </div>
          <span className="text-xs font-bold text-neutral-300">暂无匹配的表单提交记录</span>
          <p className="text-[10px] text-neutral-500 max-w-xs">请更改搜索词或过滤条件后重试，或者等待用户提交新留言</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/10 rounded-2xl bg-neutral-900/30">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs text-neutral-200">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">提交时间</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">客户姓名</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">电子邮箱</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">咨询主题</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider">状态</th>
                <th className="px-5 py-4 font-black text-[10px] uppercase text-neutral-400 tracking-wider text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSubmissions.map((sub) => (
                <tr 
                  key={sub.id} 
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                  onClick={() => onViewDetail(sub.id)}
                >
                  <td className="px-5 py-4 whitespace-nowrap text-neutral-400 font-mono text-[10px]">
                    {formatDate(sub.created_at)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap font-black text-neutral-150">
                    {sub.full_name}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-neutral-400">
                    {sub.email}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-md font-medium text-[10px] border border-white/5">
                      {sub.topic}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {sub.status === 'new' ? (
                      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-red-500/20">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                        新提交
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-450 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 bg-emerald-450 rounded-full" />
                        已处理
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <span className="text-[10px] font-black text-[var(--color-accent)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transform translate-x-0 transition-all flex items-center justify-center gap-1">
                      查看详情
                      <Icons.ChevronRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
