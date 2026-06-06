import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { CategoryInfo, CategoryType, Expense, Income, PaymentMethodInfo } from '../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Expense props
  onAddExpense: (expense: Omit<Expense, 'id'>, isFixedExpenseRule?: boolean) => void;
  categories: Record<string, CategoryInfo>;
  onAddCategory: (category: CategoryInfo) => void;
  onDeleteCategory: (categoryName: string) => void;
  editingExpense?: Expense | null;
  onEditExpense?: (id: string, updated: Omit<Expense, 'id'>) => void;
  // Income props
  onAddIncome: (income: Omit<Income, 'id'>, isFixedIncomeRule?: boolean) => void;
  incomeCategories: Record<string, CategoryInfo>;
  onAddIncomeCategory: (category: CategoryInfo) => void;
  onDeleteIncomeCategory: (categoryName: string) => void;
  editingIncome?: Income | null;
  onEditIncome?: (id: string, updated: Omit<Income, 'id'>) => void;
  // Shared
  currency: string;
  defaultMode?: 'expense' | 'income';
  // Payment methods
  paymentMethods?: PaymentMethodInfo[];
  onAddPaymentMethod?: (method: PaymentMethodInfo) => void;
  onDeletePaymentMethod?: (id: string) => void;
  prefilledExpense?: Omit<Expense, 'id'> | null;
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
  { iconName: 'Gamepad2', label: '娱乐' },
  { iconName: 'Sparkles', label: '护肤' },
  { iconName: 'Gift', label: '礼物' },
  { iconName: 'Clapperboard', label: '电影' },
  { iconName: 'GraduationCap', label: '学习' },
  { iconName: 'ShoppingBag', label: '购物' },
  { iconName: 'Car', label: '交通' },
  { iconName: 'Utensils', label: '美食' },
  { iconName: 'Home', label: '居家' },
  { iconName: 'Smartphone', label: '数码' },
  { iconName: 'Shirt', label: '服饰' },
  { iconName: 'Apple', label: '生鲜' },
  { iconName: 'Dumbbell', label: '运动' },
  { iconName: 'Plane', label: '旅行' },
  { iconName: 'Dog', label: '宠物' },
  { iconName: 'Scissors', label: '理发' },
  { iconName: 'Baby', label: '母婴' },
  { iconName: 'Music', label: '音乐' },
  { iconName: 'Briefcase', label: '兼职' },
  { iconName: 'Banknote', label: '工资' },
  { iconName: 'TrendingUp', label: '理财' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  categories,
  onAddCategory,
  onDeleteCategory,
  editingExpense,
  onEditExpense,
  onAddIncome,
  incomeCategories,
  onAddIncomeCategory,
  onDeleteIncomeCategory,
  editingIncome,
  onEditIncome,
  currency,
  defaultMode = 'expense',
  paymentMethods,
  onAddPaymentMethod,
  onDeletePaymentMethod,
  prefilledExpense,
}) => {
  // Mode: 'expense' | 'income'
  const [mode, setMode] = useState<'expense' | 'income'>(defaultMode);

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
  const [showAllIcons, setShowAllIcons] = useState(false);

  // Payment Method States
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('pay-cash');
  const [isAddingCustomPay, setIsAddingCustomPay] = useState(false);
  const [customPayName, setCustomPayName] = useState('');
  const [selectedPayColor, setSelectedPayColor] = useState(PRESET_COLORS[0].hex);
  const [selectedPayIcon, setSelectedPayIcon] = useState('💳');
  const [isPayDeleteMode, setIsPayDeleteMode] = useState(false);

  // Active category map based on mode
  const activeCats = mode === 'expense' ? categories : incomeCategories;
  const isEditing = mode === 'expense' ? !!editingExpense : !!editingIncome;

  // Set default state when open
  useEffect(() => {
    if (isOpen) {
      // Set mode based on what's being edited or the default
      const newMode = editingIncome ? 'income' : editingExpense ? 'expense' : defaultMode;
      setMode(newMode);

      const catsToUse = newMode === 'expense' ? categories : incomeCategories;

      if (editingExpense && newMode === 'expense') {
        setAmount(editingExpense.amount.toString());
        setCategory(editingExpense.category);
        setDate(editingExpense.date);
        setNote(editingExpense.note || '');
        setSelectedPaymentMethodId(editingExpense.paymentMethodId || 'pay-cash');
      } else if (editingIncome && newMode === 'income') {
        setAmount(editingIncome.amount.toString());
        setCategory(editingIncome.category);
        setDate(editingIncome.date);
        setNote(editingIncome.note || '');
      } else if (prefilledExpense) {
        setAmount(prefilledExpense.amount > 0 ? prefilledExpense.amount.toString() : '');
        setCategory(prefilledExpense.category || Object.keys(catsToUse)[0] || '');
        setDate(prefilledExpense.date || '');
        setNote(prefilledExpense.note || '');
        setSelectedPaymentMethodId(prefilledExpense.paymentMethodId || 'pay-cash');
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
        setAmount('');
        const firstCatKey = Object.keys(catsToUse)[0] || '';
        setCategory(firstCatKey);
        setNote('');
        setSelectedPaymentMethodId(paymentMethods && paymentMethods[0] ? paymentMethods[0].id : 'pay-cash');
      }
      setIsFixedToggle(false);
      setErrorMsg('');
      setIsAddingCustomCat(false);
      setCustomCatName('');
      setIsDeleteMode(false);
      setIsAddingCustomPay(false);
      setCustomPayName('');
      setIsPayDeleteMode(false);
      setSelectedPayColor(PRESET_COLORS[0].hex);
      setSelectedPayIcon('💳');
      setShowAllIcons(false);
    }
  }, [isOpen, editingExpense, editingIncome, defaultMode, prefilledExpense]);

  // When mode switches, update category selection
  useEffect(() => {
    if (isOpen && !editingExpense && !editingIncome) {
      const catsToUse = mode === 'expense' ? categories : incomeCategories;
      const firstCatKey = Object.keys(catsToUse)[0] || '';
      setCategory(firstCatKey);
      setIsAddingCustomCat(false);
      setIsDeleteMode(false);
      setIsFixedToggle(false);
      setErrorMsg('');
      setShowAllIcons(false);
    }
  }, [mode]);

  // Lock body scroll on mobile when modal is open to prevent underlying pages from sliding or bouncing
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg(`请输入正确的${mode === 'income' ? '收入' : '消费'}金额（大于 0）`);
      return;
    }

    if (!category) {
      setErrorMsg(`请选择一个${mode === 'income' ? '收入' : '消费'}类别`);
      return;
    }

    if (!date) {
      setErrorMsg('请选择日期');
      return;
    }

    const payload = {
      amount: parsedAmount,
      category,
      date,
      note: note.trim() || undefined,
      paymentMethodId: mode === 'expense' ? selectedPaymentMethodId : undefined,
    };

    if (mode === 'income') {
      if (editingIncome && onEditIncome) {
        onEditIncome(editingIncome.id, payload);
      } else {
        onAddIncome(payload, isFixedToggle);
      }
    } else {
      if (editingExpense && onEditExpense) {
        onEditExpense(editingExpense.id, payload);
      } else {
        onAddExpense(payload, isFixedToggle);
      }
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
    if (activeCats[trimmedName]) {
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

    if (mode === 'income') {
      onAddIncomeCategory(newCat);
    } else {
      onAddCategory(newCat);
    }
    setCategory(trimmedName);
    setCustomCatName('');
    setIsAddingCustomCat(false);
  };

  const handleDeleteCat = (catName: string) => {
    if (Object.keys(activeCats).length <= 1) {
      setErrorMsg('必须保留至少一个类别哦！');
      return;
    }
    if (confirm(`确定要删除分类"${catName}"吗？`)) {
      if (mode === 'income') {
        onDeleteIncomeCategory(catName);
      } else {
        onDeleteCategory(catName);
      }
    }
  };

  const isIncome = mode === 'income';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none overflow-x-hidden" id="add-expense-modal-container">
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
        className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-y-auto overflow-x-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col justify-between"
        style={{ borderColor: isIncome ? '#10b981' : 'black' }}
        id="modal-card"
      >
        {/* Top Handle Drag-Bar decorator */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4 block sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: isIncome ? '#10b981' : 'var(--color-accent)' }}
            />
            {isEditing ? (isIncome ? '编辑收入' : '编辑账目') : '新增记账'}
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

        {/* ── Mode Switcher（only when not editing） ── */}
        {!isEditing && (
          <div className="flex rounded-full bg-neutral-100 p-1 mb-4 gap-1">
            <button
              type="button"
              onClick={() => setMode('expense')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                !isIncome
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Icons.ArrowUpCircle size={13} strokeWidth={2.5} />
              支出
            </button>
            <button
              type="button"
              onClick={() => setMode('income')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                isIncome
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Icons.ArrowDownCircle size={13} strokeWidth={2.5} />
              收入
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-500 tracking-wider uppercase ml-1">
              {isIncome ? '收入金额' : '消费金额'} ({currency})
            </label>
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
                className={`w-full pl-10 pr-4 py-3.5 rounded-full border-2 bg-white text-neutral-900 placeholder-neutral-400 font-bold focus:outline-none focus:ring-0 transition-all text-lg ${
                  isIncome
                    ? 'border-emerald-200 focus:border-emerald-500'
                    : 'border-neutral-300 focus:border-black'
                }`}
              />
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1 select-none">
              <label className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
                {isIncome ? '收入类别' : '支出类别'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteMode(!isDeleteMode);
                  setIsAddingCustomCat(false);
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
                  <><Icons.Settings size={10} /><span>管理/删除分类</span></>
                )}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5" id="category-selector-grid">
              {Object.keys(activeCats).map((catName) => {
                const catInfo = activeCats[catName];
                const IconComponent = (Icons as any)[catInfo.iconName] || Icons.HelpCircle;
                const isSelected = category === catName;

                return (
                  <div key={catName} className="relative group">
                    <button
                      id={`modal-category-${catName}`}
                      type="button"
                      onClick={() => {
                        if (isDeleteMode) {
                          handleDeleteCat(catName);
                        } else {
                          setCategory(catName);
                          setIsAddingCustomCat(false);
                        }
                      }}
                      className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 transition-all cursor-pointer ${
                        isDeleteMode
                          ? 'border-red-300 hover:border-red-500 bg-red-50/20 text-red-900'
                          : isSelected
                          ? isIncome
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-md'
                            : 'border-black bg-black text-[var(--color-btn-primary-text)] shadow-md'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-350'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-xl mb-1 relative transition-colors ${
                          isDeleteMode
                            ? 'bg-red-100 text-red-600'
                            : isSelected
                            ? 'bg-white/20'
                            : (catInfo.bgColor.startsWith('bg-') ? catInfo.bgColor : '')
                        }`}
                        style={(!isDeleteMode && !isSelected && !catInfo.bgColor.startsWith('bg-')) ? { backgroundColor: catInfo.bgColor } : {}}
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
                  <button type="button" onClick={() => setIsAddingCustomCat(false)} className="text-neutral-400 hover:text-black p-0.5">
                    <Icons.X size={14} />
                  </button>
                </div>

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
                    
                    {/* Custom Color Picker Gradient Wheel Button */}
                    <div 
                      className={`relative w-6 h-6 rounded-full border-2 transition-transform hover:scale-105 flex items-center justify-center ${
                        !PRESET_COLORS.some(col => col.hex === selectedColor.hex) ? 'border-black scale-110 shadow-sm' : 'border-neutral-350 bg-neutral-100'
                      }`}
                      style={{
                        background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)'
                      }}
                      title="自定义调色盘"
                    >
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Icons.Pipette size={11} className="text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.7)]" strokeWidth={3} />
                      </div>
                      <input
                        type="color"
                        value={PRESET_COLORS.some(col => col.hex === selectedColor.hex) ? '#ffffff' : selectedColor.hex}
                        onChange={(e) => {
                          const hex = e.target.value;
                          setSelectedColor({ name: '自定义色', hex, bg: hex + '4d' });
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">选取图标徽章</label>
                  <div className={showAllIcons ? "flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-1 bg-neutral-50/50 rounded-xl border border-neutral-100" : "flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin"}>
                    {(showAllIcons ? PRESET_ICONS : PRESET_ICONS.slice(0, 8)).map((ic) => {
                      const IconComp = (Icons as any)[ic.iconName] || Icons.Tag;
                      const isIconSelected = selectedIcon === ic.iconName;
                      return (
                        <button
                          key={ic.iconName}
                          type="button"
                          onClick={() => setSelectedIcon(ic.iconName)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                            isIconSelected
                              ? 'bg-black text-[var(--color-btn-primary-text)] border-black'
                              : 'bg-white text-neutral-705 border-neutral-200 hover:border-neutral-350'
                          }`}
                          title={ic.label}
                        >
                          <IconComp size={13} strokeWidth={2.5} />
                        </button>
                      );
                    })}

                    {!showAllIcons && (
                      <button
                        type="button"
                        onClick={() => setShowAllIcons(true)}
                        className="p-1.5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-black hover:text-black hover:bg-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="显示更多图标"
                      >
                        <Icons.Plus size={13} strokeWidth={2.5} />
                      </button>
                    )}

                    {showAllIcons && (
                      <button
                        type="button"
                        onClick={() => setShowAllIcons(false)}
                        className="p-1.5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-black hover:text-black hover:bg-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="收起"
                      >
                        <Icons.ChevronUp size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

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

          {/* Payment Method Selector (Only for Expense) */}
          {!isIncome && paymentMethods && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between ml-1 select-none">
                <label className="text-xs font-semibold text-neutral-500 tracking-wider uppercase">
                  支付渠道
                </label>
                {paymentMethods.some(m => !m.id.startsWith('pay-')) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPayDeleteMode(!isPayDeleteMode);
                      setIsAddingCustomPay(false);
                    }}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all border cursor-pointer flex items-center gap-1 ${
                      isPayDeleteMode
                        ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-xs'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50'
                    }`}
                  >
                    {isPayDeleteMode ? (
                      <><Icons.Check size={9} strokeWidth={3} /><span>完成管理</span></>
                    ) : (
                      <><Icons.Settings size={9} /><span>管理渠道</span></>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5 animate-fade-in">
                {paymentMethods.map((method) => {
                  const isSelected = selectedPaymentMethodId === method.id;
                  const isPreset = method.id.startsWith('pay-');
                  return (
                    <div key={method.id} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (isPayDeleteMode) {
                            if (isPreset) return;
                            if (confirm(`确定要删除支付方式"${method.name}"吗？`)) {
                              if (onDeletePaymentMethod) onDeletePaymentMethod(method.id);
                              if (selectedPaymentMethodId === method.id) {
                                setSelectedPaymentMethodId(paymentMethods[0]?.id || 'pay-cash');
                              }
                            }
                          } else {
                            setSelectedPaymentMethodId(method.id);
                            setIsAddingCustomPay(false);
                          }
                        }}
                        className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 transition-all cursor-pointer ${
                          isPayDeleteMode && !isPreset
                            ? 'border-red-300 hover:border-red-500 bg-red-50/20 text-red-900'
                            : isSelected && !isPayDeleteMode
                            ? 'border-black bg-black text-[var(--color-btn-primary-text)] shadow-xs'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-350'
                        }`}
                      >
                        <div 
                          className={`p-1 px-1.5 rounded-lg mb-0.5 text-xs font-bold transition-colors ${
                            isPayDeleteMode && !isPreset
                              ? 'bg-red-100 text-red-600'
                              : isSelected && !isPayDeleteMode
                              ? 'bg-white/20'
                              : ''
                          }`}
                          style={(!isPayDeleteMode && !isSelected) ? { backgroundColor: `${method.color}25` } : {}}
                        >
                          {isPayDeleteMode && !isPreset ? (
                            <Icons.Trash2 size={12} className="stroke-[2.5px] text-red-600 animate-pulse" />
                          ) : (
                            <span>{method.icon}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-extrabold tracking-tight truncate w-full text-center">
                          {method.name}
                        </span>
                      </button>
                      {isPayDeleteMode && !isPreset && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white text-[7px] font-bold pointer-events-none shadow-sm">
                          ✕
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Custom Payment Method Trigger */}
                {!isPayDeleteMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustomPay(!isAddingCustomPay);
                      setErrorMsg('');
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                      isAddingCustomPay
                        ? 'border-black bg-pink-50 text-black shadow-xs'
                        : 'border-neutral-300 bg-white/40 text-neutral-500 hover:border-neutral-400'
                    }`}
                  >
                    <div className="p-1 rounded-lg mb-0.5 bg-neutral-200/50 flex items-center justify-center w-6 h-5">
                      <Icons.Plus size={12} strokeWidth={2.5} />
                    </div>
                    <span className="text-[9px] font-extrabold tracking-tight">自定义</span>
                  </button>
                )}
              </div>

              {/* Add Custom Payment Method Drawer Form */}
              <AnimatePresence>
                {isAddingCustomPay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-neutral-50/80 border-2 border-neutral-300 rounded-[24px] p-4 space-y-3.5 shadow-xs overflow-hidden mt-2"
                  >
                    <div className="flex items-center justify-between text-xs font-black text-neutral-800 select-none">
                      <span className="flex items-center gap-1">✨ 添加自定义支付渠道</span>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingCustomPay(false)} 
                        className="text-neutral-400 hover:text-black p-0.5 cursor-pointer"
                      >
                        <Icons.X size={14} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">渠道名称</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="如: Apple Pay、信用卡..."
                        value={customPayName}
                        onChange={(e) => setCustomPayName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-xs font-bold text-neutral-900 focus:border-black focus:outline-none focus:ring-0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block select-none">选取图标</label>
                      <div className="flex flex-wrap gap-2 pb-1">
                        {['💳', '💵', '📱', '🏦', '🪙', '🛍️', '💰', '💸'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setSelectedPayIcon(emoji)}
                            className={`text-base p-1 px-1.5 rounded-xl border-2 transition-transform cursor-pointer hover:scale-115 ${
                              selectedPayIcon === emoji ? 'border-black scale-110 bg-white' : 'border-transparent'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block select-none">选取底色</label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((col) => (
                          <button
                            key={col.hex}
                            type="button"
                            onClick={() => setSelectedPayColor(col.hex)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer hover:scale-105 ${
                              selectedPayColor === col.hex ? 'border-black scale-110 shadow-xs' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: col.hex }}
                            title={col.name}
                          />
                        ))}
                        
                        {/* Custom Color input overlay */}
                        <div className="relative flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              document.getElementById('custom-pay-color-picker-input')?.click();
                            }}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center hover:scale-105 ${
                              !PRESET_COLORS.some(col => col.hex === selectedPayColor) ? 'border-black scale-110 shadow-xs' : 'border-neutral-350 bg-neutral-100'
                            }`}
                            style={{
                              background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)'
                            }}
                            title="自定义底色"
                          >
                            <Icons.Pipette size={11} className="text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.7)]" strokeWidth={3} />
                          </button>
                          <input
                            id="custom-pay-color-picker-input"
                            type="color"
                            value={PRESET_COLORS.some(col => col.hex === selectedPayColor) ? '#ffffff' : selectedPayColor}
                            onChange={(e) => {
                              setSelectedPayColor(e.target.value);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = customPayName.trim();
                        if (!trimmed) {
                          setErrorMsg('请输入支付渠道名称');
                          return;
                        }
                        if (trimmed.length > 6) {
                          setErrorMsg('渠道名称不能超过 6 个字');
                          return;
                        }
                        if (paymentMethods && paymentMethods.some(m => m.name === trimmed)) {
                          setErrorMsg('该支付方式已存在');
                          return;
                        }
                        const newId = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                        if (onAddPaymentMethod) {
                          onAddPaymentMethod({
                            id: newId,
                            name: trimmed,
                            icon: selectedPayIcon,
                            color: selectedPayColor
                          });
                        }
                        setSelectedPaymentMethodId(newId);
                        setCustomPayName('');
                        setIsAddingCustomPay(false);
                        setErrorMsg('');
                      }}
                      className="w-full bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/30 text-[var(--color-text)] py-2 rounded-full text-xs font-bold transition-all border border-black/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Icons.Check size={13} strokeWidth={3} />
                      确认创建此渠道并使用
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-500 tracking-wider uppercase ml-1">
              {isIncome ? '收入日期' : '消费日期'}
            </label>
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
                placeholder={isIncome ? '例如：1月工资、年终奖...' : '例如：买午餐麦当劳、网购支出等'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-full border-2 border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:border-black focus:outline-none focus:ring-0 transition-all text-xs"
              />
            </div>
          </div>

          {/* Fixed toggle */}
          {!isEditing && (
            <div className="flex items-center justify-between p-3.5 bg-[var(--color-input-bg)] border border-[var(--color-card-border)] rounded-[22px] select-none animate-fade-in mt-1">
              <div className="flex items-center gap-2.5 flex-1 pr-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-[var(--color-accent)]/15 text-[var(--color-text)]'}`}>
                  <Icons.CalendarClock size={14} />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-extrabold text-[var(--color-text)] truncate">
                    {isIncome ? '设为每月固定收入' : '设为每月固定开销'}
                  </p>
                  <p className="text-[9px] text-[var(--color-text-secondary)] truncate">
                    {isIncome ? '每月此号自动计入收入，省去重复记录' : '自动在每月此号计入，省去重复记账'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFixedToggle(!isFixedToggle)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer duration-200 shrink-0 ${
                  isFixedToggle
                    ? isIncome
                      ? 'bg-emerald-500 border border-transparent'
                      : 'bg-[var(--color-btn-primary)] border border-transparent'
                    : 'bg-neutral-200/50 border border-neutral-300'
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
            className={`w-full py-3 rounded-full font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg mt-2 text-sm text-white ${
              isIncome ? 'bg-emerald-500' : 'bg-black'
            }`}
          >
            <Icons.Check size={18} strokeWidth={3} />
            {isIncome ? '记录收入' : '保存记录'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
