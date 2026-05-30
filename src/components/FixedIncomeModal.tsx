import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { CategoryInfo, CategoryType, FixedIncome } from '../types';

const PRESET_COLORS = [
  { name: '粉桃', hex: '#FBCFE8', bg: 'bg-[#FBCFE8]/30' },
  { name: '杏黄', hex: '#FDE68A', bg: 'bg-[#FDE68A]/30' },
  { name: '天蓝', hex: '#BFDBFE', bg: 'bg-[#BFDBFE]/30' },
  { name: '薄荷', hex: '#A7F3D0', bg: 'bg-[#A7F3D0]/30' },
  { name: '蜜桔', hex: '#FED7AA', bg: 'bg-[#FED7AA]/30' },
  { name: '紫罗兰', hex: '#DDD6FE', bg: 'bg-[#DDD6FE]/30' },
];

const PRESET_ICONS = [
  { iconName: 'Heart', label: '健康' },
  { iconName: 'Coffee', label: '咖啡' },
  { iconName: 'Banknote', label: '工资' },
  { iconName: 'TrendingUp', label: '投资' },
  { iconName: 'Gift', label: '礼金' },
  { iconName: 'Briefcase', label: '兼职' },
  { iconName: 'GraduationCap', label: '奖学' },
  { iconName: 'CirclePlus', label: '其他' },
];

interface FixedIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixedIncomes: FixedIncome[];
  onAddRule: (rule: Omit<FixedIncome, 'id'>) => void;
  onEditRule: (id: string, rule: Omit<FixedIncome, 'id'>) => void;
  onDeleteRule: (id: string) => void;
  categories: Record<string, CategoryInfo>;
  onAddCategory?: (cat: CategoryInfo) => void;
  onDeleteCategory?: (catName: string) => void;
  currency: string;
}

export const FixedIncomeModal: React.FC<FixedIncomeModalProps> = ({
  isOpen,
  onClose,
  fixedIncomes,
  onAddRule,
  onEditRule,
  onDeleteRule,
  categories,
  onAddCategory,
  onDeleteCategory,
  currency,
}) => {
  const [panel, setPanel] = useState<'list' | 'form'>('list');
  const [editingRule, setEditingRule] = useState<FixedIncome | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryType>('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [autoInclude, setAutoInclude] = useState(true);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0].iconName);

  useEffect(() => {
    if (isOpen) {
      setPanel('list');
      setEditingRule(null);
      setErrorMsg('');
      setIsDeleteMode(false);
      setIsAddingCustomCat(false);
      setCustomCatName('');
      setSelectedColor(PRESET_COLORS[0]);
      setSelectedIcon(PRESET_ICONS[0].iconName);
    }
  }, [isOpen]);

  const openForm = (rule?: FixedIncome) => {
    if (rule) {
      setEditingRule(rule);
      setName(rule.name);
      setAmount(rule.amount.toString());
      setCategory(rule.category);
      setDayOfMonth(rule.dayOfMonth);
      setAutoInclude(rule.autoInclude);
      setNote(rule.note || '');
    } else {
      setEditingRule(null);
      setName('');
      setAmount('');
      setCategory(Object.keys(categories)[0] || '');
      setDayOfMonth(new Date().getDate());
      setAutoInclude(true);
      setNote('');
    }
    setErrorMsg('');
    setIsDeleteMode(false);
    setIsAddingCustomCat(false);
    setPanel('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsedAmount = parseFloat(amount);
    if (!name.trim()) { setErrorMsg('请输入固定收入名称'); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setErrorMsg('请输入正确的金额（大于 0）'); return; }
    if (!category) { setErrorMsg('请选择收入类别'); return; }

    const rule = {
      name: name.trim(),
      amount: parsedAmount,
      category,
      dayOfMonth,
      autoInclude,
      note: note.trim() || undefined,
    };

    if (editingRule) {
      onEditRule(editingRule.id, rule);
    } else {
      onAddRule(rule);
    }
    setPanel('list');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 border-emerald-500 sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-y-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col gap-4"
      >
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto block sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {panel === 'form' && (
              <button type="button" onClick={() => setPanel('list')} className="p-1.5 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-full cursor-pointer">
                <Icons.ChevronLeft size={16} />
              </button>
            )}
            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-emerald-400 rounded-full" />
              {panel === 'list' ? '固定收入管理' : editingRule ? '编辑固定收入' : '新增固定收入'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 bg-neutral-200/60 hover:bg-neutral-200 rounded-full cursor-pointer">
            <Icons.X size={18} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ── LIST PANEL ── */}
          {panel === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => openForm()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white text-xs font-extrabold hover:bg-emerald-600 transition-colors cursor-pointer shadow-sm"
              >
                <Icons.Plus size={14} strokeWidth={3} />
                新增固定收入规则
              </button>

              {fixedIncomes.length === 0 ? (
                <div className="text-center py-10 text-neutral-400">
                  <Icons.TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-bold">暂无固定收入规则</p>
                  <p className="text-[10px] mt-1">点击上方按钮新增</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {fixedIncomes.map((rule) => {
                    const catInfo = categories[rule.category];
                    const IconComp = catInfo ? (Icons as any)[catInfo.iconName] || Icons.HelpCircle : Icons.HelpCircle;
                    return (
                      <div key={rule.id} className="flex items-center gap-3 p-3.5 bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-2xl">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${catInfo?.bgColor || 'bg-emerald-100'}`}>
                          <IconComp size={16} className="text-neutral-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-[var(--color-text)] truncate">{rule.name}</p>
                          <p className="text-[10px] text-[var(--color-text-secondary)]">
                            每月 {rule.dayOfMonth} 号 · {rule.category}
                            {rule.autoInclude && <span className="ml-1 text-emerald-500">· 自动计入</span>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-emerald-600">+{currency}{rule.amount.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openForm(rule)} className="p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full cursor-pointer text-neutral-600">
                            <Icons.Pencil size={12} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`确定删除"${rule.name}"吗？`)) onDeleteRule(rule.id); }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 rounded-full cursor-pointer text-red-500"
                          >
                            <Icons.Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── FORM PANEL ── */}
          {panel === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase ml-1">规则名称</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><Icons.Tag size={15} /></div>
                    <input
                      type="text"
                      placeholder="如: 每月工资、房租收入..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 font-bold focus:border-emerald-500 focus:outline-none focus:ring-0 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase ml-1">固定金额 ({currency})</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-emerald-600 pointer-events-none text-sm">{currency}</div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 font-bold focus:border-emerald-500 focus:outline-none focus:ring-0 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Category picker */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between ml-1 mb-1">
                    <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase">选择分类</label>
                    {onDeleteCategory && (
                      <button
                        type="button"
                        onClick={() => { setIsDeleteMode(!isDeleteMode); setErrorMsg(''); }}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all border cursor-pointer flex items-center gap-1 ${
                          isDeleteMode
                            ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-xs'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50'
                        }`}
                      >
                        {isDeleteMode ? <><Icons.Check size={10} strokeWidth={3} /><span>完成管理</span></> : <><Icons.Settings size={10} /><span>管理分类</span></>}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto p-0.5">
                    {Object.keys(categories).map((catName) => {
                      const catInfo = categories[catName];
                      const IconComponent = (Icons as any)[catInfo.iconName] || Icons.HelpCircle;
                      const isSelected = category === catName;
                      return (
                        <div key={catName} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (isDeleteMode) {
                                if (Object.keys(categories).length <= 1) { setErrorMsg('必须保留至少一个类别！'); return; }
                                if (confirm(`确定要删除分类"${catName}"吗？`)) {
                                  onDeleteCategory?.(catName);
                                  if (category === catName) setCategory(Object.keys(categories).filter(k => k !== catName)[0] || '');
                                }
                              } else { setCategory(catName); }
                            }}
                            className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 transition-all cursor-pointer ${
                              isDeleteMode
                                ? 'border-red-300 hover:border-red-500 bg-red-50/20 text-red-900'
                                : isSelected
                                ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-350'
                            }`}
                          >
                            <div className={`p-1 rounded-xl mb-1 shrink-0 transition-colors ${isDeleteMode ? 'bg-red-100 text-red-600' : isSelected ? 'bg-white/20' : catInfo.bgColor}`}>
                              {isDeleteMode ? <Icons.Trash2 size={12} className="stroke-[2.5px] text-red-600 animate-pulse" /> : <IconComponent size={12} className="stroke-[2.5px]" />}
                            </div>
                            <span className={`text-[9px] font-extrabold tracking-tight truncate w-full text-center px-0.5 ${isDeleteMode ? 'text-red-700' : ''}`}>{catName}</span>
                          </button>
                          {isDeleteMode && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white text-[7px] font-bold pointer-events-none shadow-sm">✕</div>
                          )}
                        </div>
                      );
                    })}
                    {/* Add Custom */}
                    {!isDeleteMode && onAddCategory && (
                      <button
                        type="button"
                        onClick={() => { setIsAddingCustomCat(!isAddingCustomCat); setErrorMsg(''); }}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                          isAddingCustomCat ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-neutral-300 bg-white/40 text-neutral-500 hover:border-neutral-400'
                        }`}
                      >
                        <div className="p-1 rounded-xl mb-1 bg-neutral-200/50"><Icons.Plus size={12} className="stroke-[2.5px]" /></div>
                        <span className="text-[9px] font-bold tracking-tight">自定义</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Category Drawer */}
                <AnimatePresence>
                  {isAddingCustomCat && onAddCategory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white/80 border-2 border-neutral-300 rounded-[24px] p-4 space-y-3 shadow-sm overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                        <span>✨ 添加自定义分类</span>
                        <button type="button" onClick={() => setIsAddingCustomCat(false)} className="text-neutral-400 hover:text-black p-0.5 cursor-pointer"><Icons.X size={14} /></button>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">类别名称</label>
                        <input type="text" maxLength={6} placeholder="如: 工资、奖金、分红..." value={customCatName} onChange={(e) => setCustomCatName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-xs font-bold text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-0" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">选取颜色</label>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_COLORS.map((col) => (
                            <button key={col.hex} type="button" onClick={() => setSelectedColor(col)}
                              className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${selectedColor.hex === col.hex ? 'border-black scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                              style={{ backgroundColor: col.hex }} title={col.name} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">选取图标</label>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {PRESET_ICONS.map((ic) => {
                            const IconComp = (Icons as any)[ic.iconName] || Icons.Tag;
                            const isSel = selectedIcon === ic.iconName;
                            return (
                              <button key={ic.iconName} type="button" onClick={() => setSelectedIcon(ic.iconName)}
                                className={`flex flex-col items-center shrink-0 p-1.5 rounded-xl border-2 transition-all cursor-pointer ${isSel ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-350'}`}>
                                <IconComp size={14} className="stroke-[2.5px]" />
                                <span className="text-[8px] font-bold mt-0.5">{ic.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button type="button" onClick={() => {
                        const trimmed = customCatName.trim();
                        if (!trimmed) { setErrorMsg('请输入分类名称'); return; }
                        if (trimmed.length > 6) { setErrorMsg('分类名不能超过 6 个字'); return; }
                        if (categories[trimmed]) { setErrorMsg('该分类名称已存在'); return; }
                        onAddCategory({ name: trimmed, color: selectedColor.hex, bgColor: selectedColor.bg, circleColor: selectedColor.hex, iconName: selectedIcon });
                        setCategory(trimmed);
                        setCustomCatName('');
                        setIsAddingCustomCat(false);
                      }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5">
                        <Icons.Check size={13} strokeWidth={3} />
                        创建并使用此分类
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Day of Month */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase ml-1">每月到账日期</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><Icons.Calendar size={15} /></div>
                    <select value={dayOfMonth} onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-0 transition-all text-xs font-bold appearance-none cursor-pointer">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>每月 {d} 号</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500"><Icons.ChevronDown size={14} /></div>
                  </div>
                </div>

                {/* Auto Include Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-[var(--color-input-bg)] border border-[var(--color-card-border)] rounded-2xl select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Icons.RefreshCcw size={14} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-extrabold text-[var(--color-text)]">自动计入当月收入</p>
                      <p className="text-[9px] text-[var(--color-text-secondary)]">激活后，当月各处统计数据将自动汇总此收入</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setAutoInclude(!autoInclude)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer duration-200 shrink-0 ${autoInclude ? 'bg-emerald-500 border border-transparent' : 'bg-neutral-200/50 border border-neutral-300'}`}>
                    <motion.div layout className="bg-white w-4 h-4 rounded-full shadow-sm" animate={{ x: autoInclude ? 18 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </button>
                </div>

                {/* Note */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase ml-1">备注 (选填)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><Icons.FileText size={15} /></div>
                    <input type="text" placeholder="如: 税后到手工资..." value={note} onChange={(e) => setNote(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 font-bold focus:border-emerald-500 focus:outline-none focus:ring-0 transition-all text-xs" />
                  </div>
                </div>

                {/* Error */}
                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-200">⚠️ {errorMsg}</div>
                )}

                {/* Submit */}
                <button type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-full font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]">
                  <Icons.Check size={16} strokeWidth={3} />
                  {editingRule ? '保存修改' : '新增固定收入'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
