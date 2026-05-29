import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { CategoryInfo, CategoryType, Expense } from '../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Omit<Expense, 'id'>, isFixedExpenseRule?: boolean) => void;
  categories: Record<string, CategoryInfo>;
  onAddCategory: (category: CategoryInfo) => void;
  onDeleteCategory: (categoryName: string) => void;
  currency: string;
  editingExpense?: Expense | null;
  onEditExpense?: (id: string, updated: Omit<Expense, 'id'>) => void;
}

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

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  categories,
  onAddCategory,
  onDeleteCategory,
  currency,
  editingExpense,
  onEditExpense,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<CategoryType>('');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isFixedToggle, setIsFixedToggle] = useState<boolean>(false);

  // Custom Category State
  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0].iconName);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // Set default state when open
  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setAmount(editingExpense.amount.toString());
        setCategory(editingExpense.category);
        setDate(editingExpense.date);
        setNote(editingExpense.note || '');
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
        setAmount('');
        
        const firstCatKey = Object.keys(categories)[0] || '';
        setCategory(firstCatKey);
        
        setNote('');
      }
      setIsFixedToggle(false);
      setErrorMsg('');
      setIsAddingCustomCat(false);
      setCustomCatName('');
      setIsDeleteMode(false);
    }
  }, [isOpen, categories, editingExpense]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('请输入正确的消费金额（大于 0）');
      return;
    }

    if (!category) {
      setErrorMsg('请选择一个消费类别');
      return;
    }

    if (!date) {
      setErrorMsg('请选择消费日期');
      return;
    }

    const payload = {
      amount: parsedAmount,
      category,
      date,
      note: note.trim() || undefined,
    };

    if (editingExpense && onEditExpense) {
      onEditExpense(editingExpense.id, payload);
    } else {
      onAddExpense(payload, isFixedToggle);
    }

    onClose();
  };

  const handleCreateCategory = () => {
    setErrorMsg('');
    const trimmedName = customCatName.trim();
    if (!trimmedName) {
      setErrorMsg('请输入自定义分类名称');
      return;
    }

    if (trimmedName.length > 6) {
      setErrorMsg('分类名不能超过 6 个字');
      return;
    }

    if (categories[trimmedName]) {
      setErrorMsg('该分类名称已存在');
      return;
    }

    const newCat: CategoryInfo = {
      name: trimmedName,
      color: selectedColor.hex,
      bgColor: selectedColor.bg,
      circleColor: selectedColor.hex,
      iconName: selectedIcon,
    };

    onAddCategory(newCat);
    setCategory(trimmedName); // automatically select new category
    setCustomCatName('');
    setIsAddingCustomCat(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none" id="add-expense-modal-container">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        id="modal-backdrop"
      />

      {/* Content Card */}
      <motion.div
        initial={{ y: '100%', scale: 1 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 border-black sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-y-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col justify-between"
        id="modal-card"
      >
        {/* Top Handle Drag-Bar decorator */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4 block sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-[var(--color-accent)] rounded-full" />
            {editingExpense ? '编辑账目' : '新增记账'}
          </h3>
          <button
            id="close-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 bg-neutral-200/60 text-neutral-800 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-500 tracking-wider uppercase ml-1">消费金额 ({currency})</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-neutral-800">{currency}</span>
              <input
                id="expense-amount-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 font-bold focus:border-black focus:outline-none focus:ring-0 transition-all text-lg"
              />
            </div>
          </div>

          {/* Custom Category Selection pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1 select-none">
              <label className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">选择类别</label>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteMode(!isDeleteMode);
                  setIsAddingCustomCat(false);
                  setErrorMsg('');
                }}
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all border cursor-pointer flex items-center gap-1 ${
                  isDeleteMode 
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-605 shadow-xs' 
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50'
                }`}
              >
                {isDeleteMode ? (
                  <>
                    <Icons.Check size={10} strokeWidth={3} />
                    <span>完成管理</span>
                  </>
                ) : (
                  <>
                    <Icons.Settings size={10} />
                    <span>管理/删除分类</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5" id="category-selector-grid">
              {Object.keys(categories).map((catName) => {
                const catInfo = categories[catName];
                const IconComponent = (Icons as any)[catInfo.iconName] || Icons.HelpCircle;
                const isSelected = category === catName;

                return (
                  <div key={catName} className="relative group">
                    <button
                      id={`modal-category-${catName}`}
                      type="button"
                      onClick={() => {
                        if (isDeleteMode) {
                          if (Object.keys(categories).length <= 1) {
                            setErrorMsg('必须保留至少一个消费类别哦！');
                            return;
                          }
                          if (confirm(`确定要删除分类“${catName}”吗？`)) {
                            onDeleteCategory(catName);
                          }
                        } else {
                          setCategory(catName);
                          setIsAddingCustomCat(false);
                        }
                      }}
                      className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 transition-all cursor-pointer ${
                        isDeleteMode
                          ? 'border-red-300 hover:border-red-500 bg-red-50/20 text-red-900'
                          : isSelected
                          ? 'border-black bg-black text-[var(--color-btn-primary-text)] shadow-md'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-350'
                      }`}
                    >
                      <div 
                        className={`p-1.5 rounded-xl mb-1 relative transition-colors ${
                          isDeleteMode 
                            ? 'bg-red-100 text-red-600' 
                            : isSelected 
                            ? 'bg-white/20' 
                            : catInfo.bgColor
                        }`}
                      >
                        {isDeleteMode ? (
                          <Icons.Trash2 size={14} className="stroke-[2.5px] text-red-600 animate-pulse" />
                        ) : (
                          <IconComponent size={14} className="stroke-[2.5px]" />
                        )}
                      </div>
                      <span className={`text-[10px] font-bold tracking-tight truncate w-full text-center px-0.5 ${isDeleteMode ? 'text-red-700 font-extrabold' : ''}`}>
                        {catName}
                      </span>
                    </button>
                    {isDeleteMode && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center border border-white text-[8px] font-bold pointer-events-none shadow-sm shadow-red-500/30">
                        ✕
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Custom Button */}
              {!isDeleteMode && (
                <button
                  id="modal-add-category-pills-trigger"
                  type="button"
                  onClick={() => {
                    setIsAddingCustomCat(!isAddingCustomCat);
                    setErrorMsg('');
                  }}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 border-dashed transition-all cursor-pointer mt-0 ${
                    isAddingCustomCat
                      ? 'border-black bg-pink-50 text-black'
                      : 'border-neutral-300 bg-white/40 text-neutral-500 hover:border-neutral-400'
                  }`}
                >
                  <div className="p-1.5 rounded-xl mb-1 bg-neutral-200/50">
                    <Icons.Plus size={14} className="stroke-[2.5px]" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">自定义</span>
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Expansion Drawer for Adding Custom Category */}
          <AnimatePresence>
            {isAddingCustomCat && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white/80 border-2 border-neutral-300 rounded-[24px] p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                  <span className="flex items-center gap-1">✨ 添加自定义类别</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomCat(false)}
                    className="text-neutral-400 hover:text-black p-0.5"
                  >
                    <Icons.X size={14} />
                  </button>
                </div>

                {/* Input Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">类别名称</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="如: 娱乐、运动、宠物..."
                    value={customCatName}
                    onChange={(e) => setCustomCatName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-xs font-bold text-neutral-900 focus:border-black focus:outline-none focus:ring-0"
                  />
                </div>

                {/* Colors presets selection */}
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

                {/* Icons presets selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">选取图标徽章</label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {PRESET_ICONS.map((ic) => {
                      const IconComp = (Icons as any)[ic.iconName] || Icons.Tag;
                      const isSelected = selectedIcon === ic.iconName;

                      return (
                        <button
                          key={ic.iconName}
                          type="button"
                          onClick={() => setSelectedIcon(ic.iconName)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-black text-[var(--color-btn-primary-text)] border-black'
                              : 'bg-white text-neutral-705 border-neutral-200 hover:border-neutral-350'
                          }`}
                          title={ic.label}
                        >
                          <IconComp size={13} strokeWidth={2.5} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic mini preview button */}
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="w-full bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/30 text-[var(--color-text)] py-2 rounded-full text-xs font-bold transition-all border border-black/10 flex items-center justify-center gap-1 cursor-pointer active:scale-95 mt-1"
                >
                  <Icons.Plus size={14} strokeWidth={2.5} />
                  确认创建此分类
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-500 tracking-wider uppercase ml-1">消费日期</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                <Icons.Calendar size={16} />
              </div>
              <input
                id="expense-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 focus:border-black focus:outline-none focus:ring-0 transition-all text-xs"
              />
            </div>
          </div>

          {/* Note input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-500 tracking-wider uppercase ml-1">备注 (选填)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">
                <Icons.FileText size={16} />
              </div>
              <input
                id="expense-note-input"
                type="text"
                placeholder="例如：买午餐麦当劳、微信红包支出等"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:border-black focus:outline-none focus:ring-0 transition-all text-xs"
              />
            </div>
          </div>

          {/* Toggle fixed expense option */}
          {!editingExpense && (
            <div className="flex items-center justify-between p-3.5 bg-[var(--color-input-bg)] border border-[var(--color-card-border)] rounded-[22px] select-none animate-fade-in mt-1">
              <div className="flex items-center gap-2.5 flex-1 pr-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-text)] shrink-0">
                  <Icons.CalendarClock size={14} />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-extrabold text-[var(--color-text)] truncate">设为每月固定开销</p>
                  <p className="text-[9px] text-[var(--color-text-secondary)] truncate">自动在每月此号计入，省去重复记账</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFixedToggle(!isFixedToggle)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer duration-200 shrink-0 ${
                  isFixedToggle ? 'bg-[var(--color-btn-primary)] border border-transparent' : 'bg-neutral-200/50 border border-neutral-300'
                }`}
              >
                <motion.div
                  layout
                  className="bg-white w-4 h-4 rounded-full shadow-sm"
                  animate={{ x: isFixedToggle ? 18 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          )}

          {/* Error feedback */}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-200 animate-scale-up">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Submit button */}
          <button
            id="submit-expense-btn"
            type="submit"
            className="w-full bg-black text-[var(--color-btn-primary-text)] py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg mt-2 text-sm"
          >
            <Icons.Check size={18} strokeWidth={3} />
            保存记录
          </button>
        </form>
      </motion.div>
    </div>
  );
};
