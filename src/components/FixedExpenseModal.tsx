import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { CategoryInfo, CategoryType, FixedExpense } from '../types';

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
  { iconName: 'Gamepad2', label: '游玩' },
  { iconName: 'Sparkles', label: '护肤' },
  { iconName: 'Gift', label: '礼物' },
  { iconName: 'Clapperboard', label: '电影' },
  { iconName: 'GraduationCap', label: '成长' },
  { iconName: 'ShoppingBag', label: '网购' },
];

interface FixedExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixedExpenses: FixedExpense[];
  onAddRule: (rule: Omit<FixedExpense, 'id'>) => void;
  onEditRule: (id: string, rule: Omit<FixedExpense, 'id'>) => void;
  onDeleteRule: (id: string) => void;
  categories: Record<string, CategoryInfo>;
  onAddCategory?: (cat: CategoryInfo) => void;
  onDeleteCategory?: (catName: string) => void;
  currency: string;
}

export const FixedExpenseModal: React.FC<FixedExpenseModalProps> = ({
  isOpen,
  onClose,
  fixedExpenses,
  onAddRule,
  onEditRule,
  onDeleteRule,
  categories,
  onAddCategory,
  onDeleteCategory,
  currency,
}) => {
  // Modal Panels state: 'list' | 'form'
  const [panel, setPanel] = useState<'list' | 'form'>('list');
  const [editingRule, setEditingRule] = useState<FixedExpense | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryType>('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [autoInclude, setAutoInclude] = useState(true);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // Custom category creation state
  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0].iconName);

  // Reset when modal opens/closes
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

  if (!isOpen) return null;

  // Initialize form fields for adding
  const handleOpenAddForm = () => {
    setName('');
    setAmount('');
    const firstCat = Object.keys(categories)[0] || '';
    setCategory(firstCat);
    setDayOfMonth(1);
    setAutoInclude(true);
    setNote('');
    setErrorMsg('');
    setEditingRule(null);
    setPanel('form');
  };

  // Initialize form fields for editing
  const handleOpenEditForm = (rule: FixedExpense) => {
    setName(rule.name);
    setAmount(rule.amount.toString());
    setCategory(rule.category);
    setDayOfMonth(rule.dayOfMonth);
    setAutoInclude(rule.autoInclude);
    setNote(rule.note || '');
    setErrorMsg('');
    setEditingRule(rule);
    setPanel('form');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('请输入固定开销名称');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('请输入合法的开销金额（大于 0）');
      return;
    }

    if (!category) {
      setErrorMsg('请选择一个消费分类');
      return;
    }

    const dayNum = parseInt(dayOfMonth.toString(), 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setErrorMsg('生效日期必须在 1 号至 31 号之间');
      return;
    }

    const payload = {
      name: trimmedName,
      amount: parsedAmount,
      category,
      dayOfMonth: dayNum,
      autoInclude,
      note: note.trim() || undefined,
    };

    if (editingRule) {
      onEditRule(editingRule.id, payload);
    } else {
      onAddRule(payload);
    }

    setPanel('list');
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-hidden">
      {/* Background click back-off */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 border-[var(--color-active-border)] sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-hidden flex flex-col justify-between max-h-[92vh] sm:max-h-[90vh]"
      >
        {/* Top drag bar decorator */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4 block sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 shrink-0 select-none">
          <h3 className="text-lg font-black text-[var(--color-text)] flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-[var(--color-btn-primary)] rounded-full animate-pulse" />
            {panel === 'list' ? '固定开销管理中心' : editingRule ? '编辑固定开销' : '新增固定开销规则'}
          </h3>
          <button
            type="button"
            onClick={panel === 'form' ? () => setPanel('list') : onClose}
            className="p-1.5 bg-neutral-200/60 text-neutral-800 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
          >
            {panel === 'form' ? <Icons.ArrowLeft size={16} /> : <Icons.X size={16} />}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-4 min-h-0">
          <AnimatePresence mode="wait">
            {panel === 'list' ? (
              <motion.div
                key="list-panel"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-input-bg)] border border-[var(--color-card-border)] p-3 rounded-2xl">
                  💡 <b>关于固定开销</b>：设置规则后，如果开启“自动计入当月账单”，系统将在每月指定的生效日期自动将其纳入总支出与统计，省去繁琐录入。
                </p>

                {/* Add new rule card */}
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="w-full py-3.5 px-4 bg-[var(--color-card)] hover:bg-[var(--color-input-bg)] text-[var(--color-btn-primary)] border-2 border-dashed border-[var(--color-active-border)]/45 hover:border-[var(--color-btn-primary)] rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Icons.Plus size={14} strokeWidth={3} />
                  新增每月固定开销规则
                </button>

                {/* Rules List */}
                <div className="space-y-2.5">
                  {fixedExpenses.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-3xl">
                      <Icons.CalendarClock className="mx-auto text-neutral-350 mb-2.5" size={32} />
                      <p className="text-xs font-bold text-neutral-400">暂无固定开销规则</p>
                      <p className="text-[9px] text-neutral-400 mt-1">点击上方按钮，开启省心记账！</p>
                    </div>
                  ) : (
                    fixedExpenses.map((rule) => {
                      const catInfo = categories[rule.category] || { name: rule.category, color: '#CCCCCC', bgColor: 'bg-neutral-200/30', iconName: 'Tag' };
                      const IconComponent = (Icons as any)[catInfo.iconName] || Icons.Tag;

                      return (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-3.5 bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-2xl hover:shadow-xs transition-all relative overflow-hidden group"
                        >
                          {/* Accent left colored bar */}
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: catInfo.color }} />

                          {/* Rule Meta */}
                          <div className="flex items-center space-x-3 flex-1 min-w-0 pl-1">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-neutral-100"
                              style={{ backgroundColor: catInfo.color, color: '#1a1a1a' }}
                            >
                              <IconComponent size={14} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-[var(--color-text)] truncate">{rule.name}</span>
                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  rule.autoInclude 
                                    ? 'bg-green-50 text-green-600 border border-green-200' 
                                    : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                                }`}>
                                  {rule.autoInclude ? '自动计入' : '仅保存'}
                                </span>
                              </div>
                              <p className="text-[9px] text-[var(--color-text-secondary)] mt-1 font-medium font-sans">
                                每月 <b>{rule.dayOfMonth} 号</b> 生效 · 分类：{rule.category}
                              </p>
                            </div>
                          </div>

                          {/* Value & Actions */}
                          <div className="flex items-center space-x-2 shrink-0 font-sans">
                            <span className="text-xs font-mono font-black text-[var(--color-text)]">
                              {currency}{rule.amount.toFixed(1)}
                            </span>
                            
                            {/* Action group */}
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditForm(rule)}
                                title="编辑规则"
                                className="p-1.5 bg-neutral-100 text-neutral-600 hover:text-[var(--color-text)] hover:bg-neutral-200 rounded-full transition-colors cursor-pointer active:scale-90"
                              >
                                <Icons.Edit2 size={10} strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`确定要删除固定开销规则“${rule.name}”吗？`)) {
                                    onDeleteRule(rule.id);
                                  }
                                }}
                                title="删除规则"
                                className="p-1.5 bg-neutral-100 text-neutral-600 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer active:scale-90"
                              >
                                <Icons.Trash2 size={10} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form-panel"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase ml-1">规则名称</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                        <Icons.Bookmark size={15} />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="例如：每月房租、宽带费用、健身卡自动扣费等"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 font-bold focus:border-black focus:outline-none focus:ring-0 transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* Amount field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase ml-1">开销金额 ({currency})</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-800">{currency}</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 font-bold focus:border-black focus:outline-none focus:ring-0 transition-all text-sm font-sans"
                      />
                    </div>
                  </div>

                  {/* Category picker grid */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between ml-1 mb-1">
                      <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase">选择分类</label>
                      {onDeleteCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDeleteMode(!isDeleteMode);
                            setErrorMsg('');
                          }}
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all border cursor-pointer flex items-center gap-1 ${
                            isDeleteMode
                              ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-xs'
                              : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50'
                          }`}
                        >
                          {isDeleteMode ? (
                            <><Icons.Check size={10} strokeWidth={3} /><span>完成管理</span></>
                          ) : (
                            <><Icons.Settings size={10} /><span>管理分类</span></>
                          )}
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
                                  if (Object.keys(categories).length <= 1) {
                                    setErrorMsg('必须保留至少一个消费类别哦！');
                                    return;
                                  }
                                  if (confirm(`确定要删除分类"${catName}"吗？`)) {
                                    onDeleteCategory?.(catName);
                                    if (category === catName) {
                                      const remaining = Object.keys(categories).filter(k => k !== catName);
                                      setCategory(remaining[0] || '');
                                    }
                                  }
                                } else {
                                  setCategory(catName);
                                }
                              }}
                              className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 transition-all cursor-pointer ${
                                isDeleteMode
                                  ? 'border-red-300 hover:border-red-500 bg-red-50/20 text-red-900'
                                  : isSelected
                                  ? 'border-black bg-black text-[var(--color-btn-primary-text)] shadow-xs'
                                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-350'
                              }`}
                            >
                              <div className={`p-1 rounded-xl mb-1 shrink-0 transition-colors ${
                                isDeleteMode ? 'bg-red-100 text-red-600' : isSelected ? 'bg-white/20' : catInfo.bgColor
                              }`}>
                                {isDeleteMode ? (
                                  <Icons.Trash2 size={12} className="stroke-[2.5px] text-red-600 animate-pulse" />
                                ) : (
                                  <IconComponent size={12} className="stroke-[2.5px]" />
                                )}
                              </div>
                              <span className={`text-[9px] font-extrabold tracking-tight truncate w-full text-center px-0.5 ${isDeleteMode ? 'text-red-700' : ''}`}>
                                {catName}
                              </span>
                            </button>
                            {isDeleteMode && (
                              <div className="absolute -top-1 -right-1 bg-red-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white text-[7px] font-bold pointer-events-none shadow-sm">
                                ✕
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Add Custom Category Button — only shown when NOT in delete mode */}
                      {!isDeleteMode && onAddCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustomCat(!isAddingCustomCat);
                            setErrorMsg('');
                          }}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                            isAddingCustomCat
                              ? 'border-black bg-pink-50 text-black'
                              : 'border-neutral-300 bg-white/40 text-neutral-500 hover:border-neutral-400'
                          }`}
                        >
                          <div className="p-1 rounded-xl mb-1 bg-neutral-200/50">
                            <Icons.Plus size={12} className="stroke-[2.5px]" />
                          </div>
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
                          <span className="flex items-center gap-1">✨ 添加自定义分类</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingCustomCat(false)}
                            className="text-neutral-400 hover:text-black p-0.5 cursor-pointer"
                          >
                            <Icons.X size={14} />
                          </button>
                        </div>

                        {/* Name input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">类别名称</label>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="如: 房租、健身卡、网费..."
                            value={customCatName}
                            onChange={(e) => setCustomCatName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-xs font-bold text-neutral-900 focus:border-black focus:outline-none focus:ring-0"
                          />
                        </div>

                        {/* Color presets */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">选取颜色</label>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((col) => (
                              <button
                                key={col.hex}
                                type="button"
                                onClick={() => setSelectedColor(col)}
                                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                                  selectedColor.hex === col.hex ? 'border-black scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                                }`}
                                style={{ backgroundColor: col.hex }}
                                title={col.name}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Icon presets */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">选取图标徽章</label>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                            {PRESET_ICONS.map((ic) => {
                              const IconComp = (Icons as any)[ic.iconName] || Icons.Tag;
                              const isIconSelected = selectedIcon === ic.iconName;
                              return (
                                <button
                                  key={ic.iconName}
                                  type="button"
                                  onClick={() => setSelectedIcon(ic.iconName)}
                                  className={`flex flex-col items-center shrink-0 p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                                    isIconSelected
                                      ? 'border-black bg-black text-white shadow-xs'
                                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-350'
                                  }`}
                                >
                                  <IconComp size={14} className="stroke-[2.5px]" />
                                  <span className="text-[8px] font-bold mt-0.5">{ic.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Confirm button */}
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = customCatName.trim();
                            if (!trimmed) {
                              setErrorMsg('请输入自定义分类名称');
                              return;
                            }
                            if (trimmed.length > 6) {
                              setErrorMsg('分类名不能超过 6 个字');
                              return;
                            }
                            if (categories[trimmed]) {
                              setErrorMsg('该分类名称已存在');
                              return;
                            }
                            const newCat: CategoryInfo = {
                              name: trimmed,
                              color: selectedColor.hex,
                              bgColor: selectedColor.bg,
                              circleColor: selectedColor.hex,
                              iconName: selectedIcon,
                            };
                            onAddCategory(newCat);
                            setCategory(trimmed);
                            setCustomCatName('');
                            setIsAddingCustomCat(false);
                          }}
                          className="w-full bg-black hover:opacity-90 text-white py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Icons.Check size={13} strokeWidth={3} />
                          创建并使用此分类
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Day of Month selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase ml-1">每月生效扣款日期</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                        <Icons.Calendar size={15} />
                      </div>
                      <select
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 focus:border-black focus:outline-none focus:ring-0 transition-all text-xs font-bold appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            每月 {d} 号
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                        <Icons.ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Auto Include Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-[var(--color-input-bg)] border border-[var(--color-card-border)] rounded-2xl select-none">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-text)]">
                        <Icons.RefreshCcw size={14} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-[var(--color-text)]">自动计入当月账单</p>
                        <p className="text-[9px] text-[var(--color-text-secondary)]">激活后，当月各处统计数据将自动汇总此开销</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoInclude(!autoInclude)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer duration-200 shrink-0 ${
                        autoInclude ? 'bg-[var(--color-btn-primary)] border border-transparent' : 'bg-neutral-200/50 border border-neutral-300'
                      }`}
                    >
                      <motion.div
                        layout
                        className="bg-white w-4 h-4 rounded-full shadow-sm"
                        animate={{ x: autoInclude ? 18 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>

                  {/* Note input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase ml-1">规则备注 (选填)</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                        <Icons.FileText size={15} />
                      </div>
                      <input
                        type="text"
                        placeholder="记录一些补充说明，例如扣费渠道等"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:border-black focus:outline-none focus:ring-0 transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* Error feedback */}
                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-200 animate-scale-up">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  {/* Submit / Cancel Buttons */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setPanel('list')}
                      className="w-full bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-300 py-2.5 rounded-full text-xs font-extrabold transition-colors cursor-pointer text-center"
                    >
                      返回列表
                    </button>
                    <button
                      type="submit"
                      className="w-full bg-black text-[var(--color-btn-primary-text)] hover:opacity-90 py-2.5 rounded-full text-xs font-extrabold transition-all cursor-pointer text-center flex items-center justify-center gap-1 shadow-md"
                    >
                      <Icons.Check size={14} strokeWidth={3} />
                      保存规则
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer Area (only when in list panel) */}
        {panel === 'list' && (
          <div className="pt-3 border-t border-neutral-100 mt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-neutral-950 text-[var(--color-btn-primary-text)] hover:opacity-90 py-2.5 rounded-full text-xs font-extrabold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md"
            >
              <Icons.CheckCircle2 size={14} strokeWidth={2.5} />
              完成并退出管理
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
