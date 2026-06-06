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
  source_url?: string;
  user_agent?: string;
  status: 'new' | 'handled';
}

interface AdminSubmissionDetailProps {
  id: string;
  onBackToList: () => void;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
}

export const AdminSubmissionDetail: React.FC<AdminSubmissionDetailProps> = ({
  id,
  onBackToList,
  triggerFeedback,
}) => {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      setSubmission(data);
    } catch (err: any) {
      console.error('Fetch submission detail error:', err);
      triggerFeedback('拉取详情数据失败：请确认该提交记录是否存在！', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!submission || updating) return;
    setUpdating(true);
    try {
      const newStatus = submission.status === 'new' ? 'handled' : 'new';
      
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        throw error;
      }

      setSubmission({
        ...submission,
        status: newStatus,
      });

      triggerFeedback(`状态已成功更新为【${newStatus === 'handled' ? '已处理' : '新提交'}】！`, 'success');
    } catch (err: any) {
      console.error('Update status error:', err);
      triggerFeedback(err.message || '更新处理状态失败！', 'info');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3">
        <Icons.Loader2 className="animate-spin text-[var(--color-accent)]" size={32} />
        <span className="text-xs text-neutral-450">载入详情信息中...</span>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="py-24 border border-dashed border-white/10 rounded-[28px] bg-white/[0.01] flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-1 text-neutral-450">
          <Icons.ShieldAlert size={18} />
        </div>
        <span className="text-xs font-bold text-neutral-300">未找到该笔表单记录</span>
        <button
          onClick={onBackToList}
          className="mt-2 px-4 py-2 bg-neutral-900 border border-white/10 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-left">
      
      {/* Navigation and Actions Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <button
          onClick={onBackToList}
          className="text-xs text-neutral-450 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer group"
        >
          <Icons.ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          返回表单列表
        </button>

        <button
          onClick={handleUpdateStatus}
          disabled={updating}
          style={{
            borderColor: submission.status === 'new' ? '#34d399' : '#f87171',
            color: submission.status === 'new' ? '#34d399' : '#f87171',
          }}
          className="px-4 py-2 bg-neutral-900 border hover:bg-white/[0.03] rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {updating ? (
            <>
              <Icons.Loader2 className="animate-spin" size={14} />
              <span>更新状态中...</span>
            </>
          ) : submission.status === 'new' ? (
            <>
              <Icons.CheckCheck size={14} />
              <span>标记为“已处理”</span>
            </>
          ) : (
            <>
              <Icons.RotateCcw size={14} />
              <span>还原为“未处理”</span>
            </>
          )}
        </button>
      </div>

      {/* Main Detail Bento Card Container */}
      <div className="bg-neutral-900/30 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
        
        {/* Topic and Status Title Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <span className="bg-[var(--color-accent)]/15 text-[var(--color-accent)] px-3 py-1 rounded-full font-black text-[10px] tracking-wider uppercase border border-[var(--color-accent)]/20">
              {submission.topic}
            </span>
            <h3 className="text-base sm:text-lg font-black text-neutral-100 mt-2.5">
              来自 {submission.full_name} 的咨询留言
            </h3>
            <span className="text-[10px] text-neutral-500 font-medium block mt-1.5">
              提交时间：{formatDate(submission.created_at)}
            </span>
          </div>

          <div className="self-start sm:self-center">
            {submission.status === 'new' ? (
              <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 px-3 py-1 rounded-full font-bold text-[10px] border border-red-500/20">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                等待处理
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-450 px-3 py-1 rounded-full font-bold text-[10px] border border-emerald-500/20">
                <span className="w-1.5 h-1.5 bg-emerald-450 rounded-full" />
                已完成处理
              </span>
            )}
          </div>
        </div>

        {/* Message Content Body Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
            <Icons.MessageSquareQuote size={12} className="text-[var(--color-accent)]" />
            留言核心内容
          </label>
          <div className="bg-neutral-950/40 border border-white/5 p-5 rounded-2xl text-xs leading-relaxed text-neutral-200 select-text whitespace-pre-wrap font-sans font-medium">
            {submission.message}
          </div>
        </div>

        {/* Contact Info Details Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
              <Icons.Mail size={12} className="text-blue-400" />
              电子邮箱
            </label>
            <div className="text-xs text-neutral-200 font-semibold select-text break-all">
              {submission.email}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
              <Icons.Phone size={12} className="text-blue-400" />
              联系电话
            </label>
            <div className="text-xs text-neutral-200 font-semibold select-text">
              {submission.phone || '未填写'}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
              <Icons.Building size={12} className="text-purple-400" />
              公司名称
            </label>
            <div className="text-xs text-neutral-200 font-semibold select-text">
              {submission.company || '未填写'}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
              <Icons.Link2 size={12} className="text-purple-400" />
              来源网址 (Source URL)
            </label>
            <div className="text-xs text-neutral-200 font-semibold select-text break-all">
              {submission.source_url ? (
                <a 
                  href={submission.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {submission.source_url}
                  <Icons.ExternalLink size={10} />
                </a>
              ) : (
                '未知来源'
              )}
            </div>
          </div>
        </div>

        {/* User-Agent Browser Metadata Section */}
        <div className="space-y-2 pt-4 border-t border-white/5">
          <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
            <Icons.Monitor size={12} />
            访问设备 User Agent (用户浏览器特征)
          </label>
          <div className="bg-neutral-950/20 p-4 rounded-xl text-[10px] text-neutral-500 select-text break-all font-mono font-medium leading-relaxed">
            {submission.user_agent || '未知浏览器请求特征'}
          </div>
        </div>

      </div>

    </div>
  );
};
