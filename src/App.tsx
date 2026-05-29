import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { DEFAULT_CATEGORIES, CategoryInfo, CategoryType, Expense } from './types';
import { INITIAL_EXPENSES } from './seedData';
import { RingChart } from './components/RingChart';
import { ExpenseModal } from './components/ExpenseModal';

export default function App() {
  // --- STATE ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Custom expandable Categories Map state
  const [categories, setCategories] = useState<Record<string, CategoryInfo>>(() => {
    const savedActive = localStorage.getItem('active_categories');
    if (savedActive) {
      try {
        return JSON.parse(savedActive);
      } catch (e) {
        console.error('Error parsing active_categories:', e);
      }
    }
    
    // Check legacy custom_categories
    const legacySaved = localStorage.getItem('custom_categories');
    if (legacySaved) {
      try {
        const legacyParsed = JSON.parse(legacySaved);
        const merged = { ...DEFAULT_CATEGORIES, ...legacyParsed };
        localStorage.setItem('active_categories', JSON.stringify(merged));
        return merged;
      } catch (e) {
        console.error('Error parsing legacy custom_categories:', e);
      }
    }

    return { ...DEFAULT_CATEGORIES };
  });

  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [filterMonthOnly, setFilterMonthOnly] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Dynamic Budget Settings state
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    const saved = localStorage.getItem('monthly_budget');
    return saved ? parseFloat(saved) : 2000;
  });
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());

  // Dynamic Currency settings state
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('currency') || '¥';
  });
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  // --- Active Switchable Theme State ---
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    const saved = localStorage.getItem('activeTheme');
    return saved || 'cream';
  });

  // Enforce document element data-theme attribute on mount or change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  // Collapsible ledger details list state
  const [isLedgerExpanded, setIsLedgerExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('isLedgerExpanded');
    return saved === 'true'; // Default to false (collapsed) if not set, following user request
  });

  // --- Active Switchable Tab State ---
  const [activeTab, setActiveTab] = useState<number>(() => {
    const saved = localStorage.getItem('activeTab');
    return saved ? parseInt(saved, 10) : 0;
  });

  // --- DYNAMICALLY SELECTABLE YEAR-MONTH STATE ---
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  });

  const { currentYear, currentMonth, currentMonthStr, displayDateTitle } = useMemo(() => {
    const parts = selectedYearMonth.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return {
      currentYear: y,
      currentMonth: m,
      currentMonthStr: selectedYearMonth,
      displayDateTitle: `${y}年${m}月`
    };
  }, [selectedYearMonth]);

  // Sync Input and Budget Status
  useEffect(() => {
    setBudgetInput(monthlyBudget.toString());
  }, [monthlyBudget]);

  // --- INITIALIZE ONLY ONCE ON MOUNT ---
  useEffect(() => {
    const saved = localStorage.getItem('expenses');
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
      } catch (err) {
        console.error('Error parsing expenses from localStorage:', err);
        loadDefaultSeedData();
      }
    } else {
      loadDefaultSeedData();
    }

    // Detect PWA standalone mode
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Listen to Android PWA prompt trigger
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Sync back to local storage whenever expenses change
  const saveExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    localStorage.setItem('expenses', JSON.stringify(newExpenses));
  };

  const loadDefaultSeedData = () => {
    // Replace standard '2026-05' in mock seed dates dynamically to current selected month
    const adapted = INITIAL_EXPENSES.map(item => {
      const updatedDate = item.date.replace(/^2026-05/, currentMonthStr);
      return { ...item, date: updatedDate };
    });
    saveExpenses(adapted);
    triggerFeedback('成功重置为演示账单！', 'info');
  };

  const handleClearAllData = () => {
    saveExpenses([]);
    triggerFeedback('账单已被彻底清空！', 'info');
  };

  const triggerFeedback = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
  };

  // Auto clear toast after timeout
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // Month navigation buttons
  const handlePrevMonth = () => {
    const parts = selectedYearMonth.split('-');
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    setSelectedYearMonth(`${y}-${String(m).padStart(2, '0')}`);
    triggerFeedback(`已切换至 ${y}年${m}月`, 'info');
  };

  const handleNextMonth = () => {
    const parts = selectedYearMonth.split('-');
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    setSelectedYearMonth(`${y}-${String(m).padStart(2, '0')}`);
    triggerFeedback(`已切换至 ${y}年${m}月`, 'info');
  };

  // --- METRICS CALCULATIONS ---
  const filteredByMonthExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filterMonthOnly) {
        return e.date.startsWith(currentMonthStr);
      }
      return true;
    });
  }, [expenses, currentMonthStr, filterMonthOnly]);

  // Total for current display (filtered by month/all)
  const displayTotal = useMemo(() => {
    return filteredByMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredByMonthExpenses]);

  // Overall totals for each category based on dynamic category list
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.keys(categories).forEach(catKey => {
      totals[catKey] = 0;
    });
    filteredByMonthExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [filteredByMonthExpenses, categories]);

  // Find the category with maximum spending for insight panel
  const highestSpendingCat = useMemo(() => {
    let maxAmount = 0;
    let maxCat = '吃饭';
    if (Object.keys(categoryTotals).length > 0) {
      maxCat = Object.keys(categoryTotals)[0];
    }
    Object.keys(categoryTotals).forEach(cat => {
      if (categoryTotals[cat] > maxAmount) {
        maxAmount = categoryTotals[cat];
        maxCat = cat;
      }
    });
    return { category: maxCat, amount: maxAmount };
  }, [categoryTotals]);

  // --- MONTHLY RECORDS ACCUMULATIONS ---
  const monthlySummaries = useMemo(() => {
    const summaries: Record<string, number> = {};
    expenses.forEach(e => {
      const yearMonth = e.date.substring(0, 7); // e.g. "2026-05"
      if (yearMonth.length === 7) {
        summaries[yearMonth] = (summaries[yearMonth] || 0) + e.amount;
      }
    });

    return Object.keys(summaries).map(ym => {
      const [year, month] = ym.split('-');
      return {
        yearMonth: ym,
        total: summaries[ym],
        label: `${parseInt(month, 10)}月`,
        yearLabel: `${year}年`
      };
    }).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)); // newer months first
  }, [expenses]);

  // --- ACTIONS ---
  const handleAddExpense = (newExpense: Omit<Expense, 'id'>) => {
    const created: Expense = {
      ...newExpense,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [created, ...expenses];
    saveExpenses(updated);
    triggerFeedback(`已成功记账一套 ${currency}${newExpense.amount}!`, 'success');
  };

  const handleDeleteExpense = (id: string, label: string) => {
    const updated = expenses.filter(e => e.id !== id);
    saveExpenses(updated);
    triggerFeedback(`已删除账单【${label}】`, 'info');
  };

  const handleEditExpense = (id: string, updatedExpense: Omit<Expense, 'id'>) => {
    const updated = expenses.map(e => e.id === id ? { ...e, ...updatedExpense } : e);
    saveExpenses(updated);
    triggerFeedback(`已成功修改账目！`, 'success');
    setEditingExpense(null);
  };

  // --- BACKUP & RECOVERY ACTIONS ---
  const handleExportBackup = () => {
    try {
      const backupData = {
        expenses,
        categories,
        monthlyBudget,
        version: '1.0.0',
        exportedAt: new Date().toISOString()
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      downloadAnchor.setAttribute('download', `ledger_backup_${dateStr}.json`);
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerFeedback('账本数据导出备份成功！', 'success');
    } catch (e) {
      console.error(e);
      triggerFeedback('导出备份失败，请稍后重试', 'info');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && Array.isArray(parsed.expenses)) {
          // Validate expenses
          const validExpenses = parsed.expenses.filter((exp: any) => {
            return exp && typeof exp.amount === 'number' && typeof exp.category === 'string' && typeof exp.date === 'string';
          });
          
          saveExpenses(validExpenses);
          
          if (parsed.categories && typeof parsed.categories === 'object') {
            setCategories(parsed.categories);
            localStorage.setItem('active_categories', JSON.stringify(parsed.categories));
          }
          
          if (typeof parsed.monthlyBudget === 'number') {
            setMonthlyBudget(parsed.monthlyBudget);
            localStorage.setItem('monthly_budget', parsed.monthlyBudget.toString());
          }
          
          triggerFeedback('账本数据已成功恢复导入！', 'success');
        } else {
          triggerFeedback('无效的备份文件格式！', 'info');
        }
      } catch (err) {
        console.error(err);
        triggerFeedback('解析备份文件失败，请确保是正确的 JSON 文件！', 'info');
      }
    };
    fileReader.readAsText(file);
    event.target.value = '';
  };

  const handleAddCategory = (newCat: CategoryInfo) => {
    const updated = { ...categories, [newCat.name]: newCat };
    setCategories(updated);
    localStorage.setItem('active_categories', JSON.stringify(updated));
    triggerFeedback(`分类【${newCat.name}】创建成功并默认激活！`, 'success');
  };

  const handleDeleteCategory = (catName: string) => {
    const updated = { ...categories };
    delete updated[catName];
    setCategories(updated);
    localStorage.setItem('active_categories', JSON.stringify(updated));
    if (selectedCategory === catName) {
      setSelectedCategory(null);
    }
    triggerFeedback(`分类【${catName}】已成功删除！`, 'info');
  };

  // Filter actual list of transactions displayed at the bottom
  const displayedHistoryList = useMemo(() => {
    let list = [...filteredByMonthExpenses];
    
    // Apply category filter if one is selected in Ring Chart
    if (selectedCategory) {
      list = list.filter(e => e.category === selectedCategory);
    }

    // Apply search query filter if one is typed
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => 
        e.category.toLowerCase().includes(q) || 
        (e.note && e.note.toLowerCase().includes(q))
      );
    }
    
    // Sort descending by date, secondary sort by id descending for new additions
    return list.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id); // newer additions with same date first
    });
  }, [filteredByMonthExpenses, selectedCategory, searchQuery]);

  // Find current month's expenses for Tab 1 (Date-grouped and simplified ledger)
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(currentMonthStr));
  }, [expenses, currentMonthStr]);

  // Group current month's expenses by Date
  const currentMonthGroupedByDate = useMemo(() => {
    const groups: Record<string, { date: string; total: number; items: Expense[] }> = {};
    currentMonthExpenses.forEach((exp) => {
      if (!groups[exp.date]) {
        groups[exp.date] = { date: exp.date, total: 0, items: [] };
      }
      groups[exp.date].total += exp.amount;
      groups[exp.date].items.push(exp);
    });

    // Sort dates descending
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [currentMonthExpenses]);

  // Format date to human friendly format
  const formatChineseDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(dateStr);
        const dNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dayOfWeek = dNames[dateObj.getDay()] || '';
        return `${m}月${d}日 ${dayOfWeek}`;
      }
    } catch (e) {
      // fallback
    }
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col font-sans select-none antialiased relative pb-28 md:pb-12" id="app-root-view">
      
      {/* GLOBAL HEADER BAR */}
      <header className="border-b border-black/5 bg-white/40 backdrop-blur-md sticky top-0 z-40 select-none animate-fade-in" id="app-global-header">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs shrink-0">
              <img src="/icon-192.png" className="w-full h-full object-cover" alt="咕噜存钱 Logo" />
            </div>
            <span className="text-sm sm:text-base font-extrabold text-neutral-900 tracking-tight">咕噜存钱</span>
          </div>

          {/* Selectable Month Navigation Pill Title */}
          <div className="flex items-center gap-0.5 bg-white/80 border border-neutral-250 rounded-full p-1 shadow-sm transition-colors hover:border-neutral-450">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1 px-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              title="上个月"
            >
              <Icons.ChevronLeft size={14} strokeWidth={2.5} />
            </button>

            <div className="relative flex items-center gap-1.5 px-2 cursor-pointer select-none">
              <Icons.CalendarDays size={14} className="text-neutral-600" />
              <span className="text-xs sm:text-sm font-black text-neutral-850 tracking-tight">{displayDateTitle}</span>
              {/* Hidden native picker covering the label for native month choosing */}
              <input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedYearMonth(e.target.value);
                    const parts = e.target.value.split('-');
                    triggerFeedback(`已跳转至 ${parts[0]}年${parseInt(parts[1], 10)}月`, 'info');
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="点击选择月份"
              />
            </div>

            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1 px-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              title="下个月"
            >
              <Icons.ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              id="currency-setting-btn"
              onClick={() => setIsSettingOpen(true)}
              title="货币设置"
              className="w-9 h-9 border border-neutral-300 hover:border-black rounded-full flex items-center justify-center text-neutral-600 hover:text-black transition-all cursor-pointer bg-white shadow-xs hover:bg-white relative hover:scale-[1.05] active:scale-[0.95]"
            >
              <Icons.Settings size={15} />
              <span className="absolute -top-1.5 -right-1.5 bg-black text-[var(--color-btn-primary-text)] text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white/80 shadow-md transform scale-90">
                {currency}
              </span>
            </button>

            <button
              id="reset-demodata-btn"
              onClick={() => setIsResetConfirmOpen(true)}
              title="重置或清空所有数据"
              className="w-9 h-9 border border-dashed border-neutral-400 hover:border-black rounded-full flex items-center justify-center text-neutral-600 hover:text-black transition-all cursor-pointer bg-white/30 hover:bg-white"
            >
              <Icons.RotateCcw size={15} />
            </button>

            <div className="hidden md:flex items-center gap-1.5 bg-black text-[var(--color-btn-primary-text)] px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <span>{filteredByMonthExpenses.length}笔记录</span>
            </div>
          </div>

        </div>
      </header>

      {/* Dynamic Float-in toast alert notifications */}
      <AnimatePresence>
        {feedbackMsg && (
          <div className="fixed left-1/2 -translate-x-1/2 top-18 z-55 w-full max-w-sm px-4" id="toast-wrapper">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="p-3 bg-neutral-900 border border-white/15 text-[var(--color-btn-primary-text)] text-xs font-semibold rounded-full flex items-center justify-between shadow-xl"
              id="toast-notification"
            >
              <div className="flex items-center gap-2 px-1 text-[var(--color-btn-primary-text)]">
                {feedbackMsg.type === 'success' ? (
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#FDE68A]" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
              <button 
                onClick={() => setFeedbackMsg(null)}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <Icons.X size={14} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN RESPONSIVE BENTO GRID CONTAINER */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 md:py-8 flex-1 flex flex-col" id="desktop-main-layout">
        
        <AnimatePresence mode="wait">
          {activeTab === 0 && (
            <motion.div
              key="tab-home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start w-full"
            >
              
              {/* LEFT BENTO BLOCK: Circular Analytics and Stats Card */}
              <div className="col-span-1 lg:col-span-5 flex flex-col gap-5 md:gap-6 lg:sticky lg:top-22">
                
                {/* PWA Premium Install Banner (Hidden if in Standalone mode) */}
                {!isStandalone && (
                  <div className="bg-gradient-to-r from-[var(--color-accent)]/25 to-[#BFDBFE]/20 border border-[var(--color-accent)]/30 p-4 rounded-[28px] shadow-xs flex items-center justify-between gap-4 animate-fade-in" id="pwa-install-banner">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-xs shrink-0 flex-shrink-0">
                        <img src="/icon-192.png" className="w-full h-full object-cover" alt="App Logo" />
                      </div>
                      <div className="font-sans">
                        <h4 className="text-xs font-black text-neutral-900 leading-tight">安装「咕噜存钱」App</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5 leading-none">获得全屏沉浸体验与桌面快捷入口</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsInstallModalOpen(true)}
                      className="bg-neutral-950 hover:bg-neutral-800 text-[var(--color-btn-primary-text)] rounded-full py-1.5 px-4 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      安装 App
                    </button>
                  </div>
                )}

                {/* Visual Header/Title wrapper for analytics */}
                <div className="bg-white/80 border border-white/50 backdrop-blur-sm p-6 rounded-[32px] shadow-xs flex flex-col items-center justify-center relative overflow-hidden animate-fade-in" id="chart-card-wrapper">
                  
                  {/* Soft background decor bubble */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--color-accent)]/10 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="text-center mb-1">
                    <h2 className="text-sm font-extrabold text-neutral-800 tracking-wider uppercase">记账轮盘 analysis</h2>
                    <p className="text-[10px] text-neutral-400 mt-0.5">点击轮盘或外圈分类可快速筛选</p>
                  </div>

                  <div className="w-full flex justify-center py-2">
                    <RingChart
                      totalAmount={displayTotal}
                      categoryTotals={categoryTotals}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                      categories={categories}
                      currency={currency}
                    />
                  </div>

                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="mt-2 text-xs font-bold text-neutral-500 hover:text-black flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 py-1 px-3 rounded-full transition-colors cursor-pointer"
                    >
                      <Icons.FilterX size={12} />
                      显示全部类型
                    </button>
                  )}
                </div>

                {/* Micro Stats Widget bento block */}
                <div className="grid grid-cols-2 gap-4" id="sleek-stats-cards-row">
                  {/* Card 1: Main Category Highlight */}
                  <div 
                    onClick={() => {
                      if (highestSpendingCat.amount > 0) {
                        setSelectedCategory(highestSpendingCat.category);
                        triggerFeedback(`已列出最高消费类别 - 【${highestSpendingCat.category}】!`, 'success');
                      } else {
                        triggerFeedback('暂无消费数据，点击下方 + 键开始记账吧！', 'info');
                      }
                    }}
                    className="bg-[var(--color-accent)] hover:opacity-95 text-[var(--color-accent-text)] border border-black/5 p-5 rounded-[28px] shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    id="sleek-category-card"
                  >
                    <div className="text-[10px] font-bold uppercase opacity-75 mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                      {highestSpendingCat.amount > 0 ? `最高: ${highestSpendingCat.category}` : '日常主买'}
                    </div>
                    <div className="text-xl font-black truncate">
                      {currency}{highestSpendingCat.amount > 0 ? highestSpendingCat.amount.toFixed(1) : '0'}
                    </div>
                    <p className="text-[9px] opacity-60 mt-1 leading-normal font-medium font-sans">点击即可聚焦该分类详情</p>
                  </div>

                  {/* Card 2: Interactive left balance calculator with customize limit support */}
                  <div 
                    className="bg-[var(--color-card-dark)] text-[var(--color-card-dark-text)] p-5 rounded-[28px] border border-black/10 shadow-md transition-all relative overflow-hidden"
                    id="sleek-balance-card"
                  >
                    {isEditingBudget ? (
                      <div className="space-y-2 text-current animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="text-[9px] font-bold uppercase opacity-60 flex items-center gap-1">
                          <Icons.Edit2 size={10} className="text-[var(--color-accent)]" />
                          修改本月限额 (预算)
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-bold opacity-60">{currency}</span>
                          <input
                            type="number"
                            step="100"
                            value={budgetInput}
                            onChange={(e) => setBudgetInput(e.target.value)}
                            className="w-full bg-white/10 text-current rounded-md px-2 py-1 text-xs font-bold focus:outline-none ring-1 ring-white/20 focus:ring-[var(--color-accent)]"
                            placeholder="2000"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const val = parseFloat(budgetInput);
                              if (!isNaN(val) && val >= 0) {
                                setMonthlyBudget(val);
                                localStorage.setItem('monthly_budget', val.toString());
                                setIsEditingBudget(false);
                                triggerFeedback(`预算额度已更新为 ${currency}${val.toFixed(0)}`, 'success');
                              } else {
                                triggerFeedback('请输入合法的金额数值', 'info');
                              }
                            }}
                            className="bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-accent-text)] text-[10px] font-extrabold px-2.5 py-1 rounded-full cursor-pointer"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBudgetInput(monthlyBudget.toString());
                              setIsEditingBudget(false);
                            }}
                            className="opacity-70 hover:opacity-100 text-[10px] font-bold px-1.5 py-1 cursor-pointer"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setIsEditingBudget(true);
                          triggerFeedback('输入金额即可立即修改结余限额上限！', 'info');
                        }}
                        className="cursor-pointer group flex flex-col h-full justify-between"
                      >
                        <div>
                          <div className="text-[10px] font-bold uppercase opacity-60 mb-1 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                              结余 ({filterMonthOnly ? `限额${currency}${monthlyBudget}` : "历史汇总"})
                            </div>
                            <Icons.Edit2 size={11} className="text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-xl font-bold font-sans tracking-tight mt-0.5">
                            {currency}{(monthlyBudget - displayTotal).toFixed(0)}
                          </div>
                        </div>
                        <p className="text-[9px] opacity-50 mt-1 leading-normal group-hover:opacity-85 transition-colors">
                          点击卡片自定义限额 ✏️
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Past Monthly History summation selector card */}
                <div className="bg-white/80 border border-white/50 backdrop-blur-sm p-5 rounded-[28px] shadow-xs flex flex-col gap-3 select-none animate-fade-in" id="monthly-history-summary-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Icons.CalendarCheck size={14} className="text-neutral-500 animate-pulse" />
                      月度账单回顾
                    </span>
                    <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-bold font-mono">
                      共 {monthlySummaries.length} 个月
                    </span>
                  </div>
                  
                  {monthlySummaries.length === 0 ? (
                    <div className="text-center py-4 bg-neutral-50/50 border border-dashed border-neutral-250 rounded-2xl">
                      <span className="text-[10px] text-neutral-400 font-bold">暂无往期月度汇总</span>
                    </div>
                  ) : (
                    <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-thin scrollbar-thumb-black/10 text-neutral-900 scroll-smooth" id="monthly-summary-scroll">
                      {monthlySummaries.map(({ yearMonth, total, label, yearLabel }) => {
                        const isActive = selectedYearMonth === yearMonth;
                        return (
                          <button
                            key={yearMonth}
                            type="button"
                            onClick={() => {
                              setSelectedYearMonth(yearMonth);
                              setFilterMonthOnly(true);
                              triggerFeedback(`已载入 ${yearLabel}${label} 账单明细`, 'info');
                            }}
                            className={`flex-shrink-0 px-3 py-2 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-neutral-950 text-[var(--color-btn-primary-text)] border-neutral-950 shadow-md scale-102 font-bold' 
                                : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-405 hover:shadow-xs'
                            }`}
                            style={{ minWidth: '78px' }}
                          >
                            <span className="text-[8px] opacity-60 leading-none">{yearLabel}</span>
                            <span className="text-xs font-black leading-tight mt-0.5">{label}</span>
                            <span className={`text-[9px] font-bold mt-1.5 px-2 py-0.5 rounded-full font-mono ${isActive ? 'bg-[var(--color-active-badge-bg)] text-[var(--color-active-badge-text)]' : 'bg-neutral-100 text-neutral-600'}`}>
                              {currency}{total.toFixed(0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Helpful interactive rotating tip card on page itself */}
                <div className="bg-white/40 border border-neutral-200/50 rounded-[28px] p-4 flex items-center gap-3.5" id="mini-inline-insight">
                  <div className="w-9 h-9 rounded-full bg-[#FDE68A] flex items-center justify-center shrink-0 border border-black/5">
                    <Icons.HeartHandshake size={15} className="text-amber-800" />
                  </div>
                  <div className="flex-1 min-w-0 font-sans">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">精明小管家</div>
                    <p className="text-xs text-neutral-700 leading-normal font-medium">
                      {highestSpendingCat.amount > 0 ? (
                        <>您的最大支出在 <strong>【{highestSpendingCat.category}】</strong>。当前结存为 <strong>{currency}{(monthlyBudget - displayTotal).toFixed(0)}</strong>，请合理调控预算，加油！</>
                      ) : (
                        "本月未记录消费。写下您的今天的第一笔消费，让我们开始省钱日记吧！"
                      )}
                    </p>
                  </div>
                </div>

              </div>

              {/* RIGHT BENTO BLOCK: Consumption details ledger */}
              <div className="col-span-1 lg:col-span-7 flex flex-col gap-4 animate-fade-in" id="ledger-history-container">
                
                <div className="bg-white/80 border border-white/50 backdrop-blur-sm p-6 rounded-[36px] shadow-xs" id="ledger-history-section">
                  
                  {/* Filter controls headers */}
                  <div className={`flex items-center justify-between select-none gap-2 ${isLedgerExpanded ? 'mb-5' : 'mb-0'}`}>
                    
                    <div className="flex flex-col">
                      <button
                        id="toggle-ledger-expand-btn"
                        onClick={() => {
                          const nextState = !isLedgerExpanded;
                          setIsLedgerExpanded(nextState);
                          localStorage.setItem('isLedgerExpanded', String(nextState));
                          triggerFeedback(nextState ? '已展开账单消费明细' : '已折叠并隐藏消费明细列表', 'info');
                        }}
                        className="group/toggle flex items-center gap-1.5 text-lg font-extrabold text-neutral-900 hover:text-black cursor-pointer select-none focus:outline-hidden text-left bg-transparent border-0 p-0"
                        title={isLedgerExpanded ? "点击折叠明细" : "点击展开明细"}
                      >
                        <span>消费明细</span>
                        <span className="text-xs bg-neutral-100 text-neutral-600 font-bold py-0.5 px-2 rounded-full font-mono group-hover/toggle:bg-neutral-200 transition-colors">
                          {displayedHistoryList.length}笔
                        </span>
                        <div className="w-5 h-5 rounded-full bg-neutral-100 group-hover/toggle:bg-neutral-200 flex items-center justify-center transition-colors">
                          <Icons.ChevronDown 
                            size={12} 
                            strokeWidth={3}
                            className={`text-neutral-500 transition-transform duration-305 ${isLedgerExpanded ? 'rotate-180' : 'rotate-0'}`} 
                          />
                        </div>
                      </button>
                      {selectedCategory && isLedgerExpanded && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-neutral-400">当前分类:</span>
                          <span className="text-[10px] bg-black text-white px-1.5 py-0.2 rounded font-bold">{selectedCategory}</span>
                        </div>
                      )}
                    </div>

                    {/* Inline Add Record btn for comfortable desktop view */}
                    <div className="flex items-center gap-2">
                      
                      {/* Ledger Period Selector */}
                      <button
                        id="filter-toggle-pill"
                        onClick={() => setFilterMonthOnly(!filterMonthOnly)}
                        className="bg-white border border-neutral-300 rounded-full hover:border-black flex items-center gap-1 py-1 px-3 text-xs font-extrabold text-neutral-800 transition-colors shadow-xs cursor-pointer"
                      >
                        <span>{filterMonthOnly ? '本月账单' : '所有历史'}</span>
                        <Icons.ChevronDown size={13} strokeWidth={2.5} className={`transition-transform duration-250 ${filterMonthOnly ? '' : 'rotate-180'}`} />
                      </button>

                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-neutral-950 hover:bg-neutral-805 text-white rounded-full py-1.5 px-4 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 animate-pulse"
                        title="添加新账单"
                      >
                        <Icons.Plus size={13} strokeWidth={3} />
                        <span>记一笔</span>
                      </button>
                    </div>

                  </div>

                  {isLedgerExpanded ? (
                    <>
                      {/* Real-time Keyword Search Bar */}
                      <div className="mb-4 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                          <Icons.Search size={14} />
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="搜索分类或备注，如：吃饭、烤肉、春装..."
                          className="w-full pl-10 pr-10 py-2.5 rounded-full border border-neutral-250 bg-white/70 text-xs font-bold text-neutral-900 placeholder-neutral-400 focus:border-black focus:bg-white focus:outline-none transition-all shadow-xs"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer p-0.5"
                          >
                            <Icons.X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Category Filter Pills on Ledger block */}
                      <div className="mb-4 bg-neutral-50/70 border border-neutral-100 p-3 rounded-2xl select-none" id="ledger-category-quick-filter">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                            <Icons.SlidersHorizontal size={10} />
                            按类别筛选查看消费
                          </span>
                          {selectedCategory && (
                            <button
                              onClick={() => {
                                setSelectedCategory(null);
                                triggerFeedback('已清除消费类型筛选！', 'info');
                              }}
                              className="text-[9px] text-[#e06666] font-bold"
                            >
                              显示全部
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none items-center scroll-smooth">
                          {/* "All" button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(null);
                              triggerFeedback('显示所有类型的消费记录', 'info');
                            }}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                              selectedCategory === null
                                ? 'bg-[var(--color-btn-primary)] text-[var(--color-btn-primary-text)] border-[var(--color-btn-primary)] scale-102 shadow-xs font-black/90'
                                : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border-[var(--color-card-border)] hover:bg-[var(--color-input-bg)]'
                            }`}
                          >
                            全部
                          </button>

                          {/* Rest of categories */}
                          {Object.keys(categories).map((catName) => {
                            const catInfo = categories[catName];
                            const isSelected = selectedCategory === catName;

                            return (
                              <button
                                key={catName}
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(catName);
                                  triggerFeedback(`已载入“${catName}”分类账单`, 'success');
                                }}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'text-[var(--color-text)] font-black shadow-xs bg-[var(--color-card)]'
                                    : 'bg-[var(--color-card)] text-[var(--color-text-secondary)] border-[var(--color-card-border)] hover:bg-[var(--color-input-bg)]'
                                }`}
                                style={isSelected ? { borderColor: catInfo.color, boxShadow: `0 2px 5px ${catInfo.color}40`, backgroundColor: `${catInfo.color}25` } : {}}
                              >
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: catInfo.color }}
                                />
                                <span>{catName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Transactions display content */}
                      <div className="space-y-3" id="ledger-items-list-container">
                        {displayedHistoryList.length === 0 ? (
                          <div className="text-center py-16 bg-neutral-50/50 border-2 border-dashed border-neutral-250 rounded-[28px] animate-fade-in pr-2 pl-2">
                            <Icons.SearchX className="mx-auto text-neutral-400 mb-2" size={36} />
                            <p className="text-xs font-extrabold text-neutral-500">
                              {searchQuery.trim()
                                ? `未找到匹配“${searchQuery}”的账目`
                                : selectedCategory 
                                ? `暂未在【${selectedCategory}】下录入花费纪录`
                                : `${displayDateTitle}暂无记账数据`}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-1">您可以尝试更换搜索词或选择其他月份</p>
                            
                            {selectedCategory && (
                              <button 
                                onClick={() => setSelectedCategory(null)}
                                className="mt-4 text-xs font-bold underline text-neutral-900 hover:text-black cursor-pointer inline-flex items-center gap-1"
                              >
                                <Icons.FilterX size={12} />
                                清除分类筛选
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 pr-0.5">
                            {displayedHistoryList.map((expense) => {
                              const catInfo = categories[expense.category] || { name: expense.category, color: '#CCCCCC', bgColor: 'bg-neutral-200/30', iconName: 'Tag' };
                              const IconComponent = (Icons as any)[catInfo.iconName] || Icons.Tag;
                              
                              // Compute dynamic proportional scale for progress bar inside cells
                              const categorySum = categoryTotals[expense.category] || expense.amount;
                              const propWidth = Math.max(12, Math.min(100, (expense.amount / categorySum) * 100));

                              return (
                                <motion.div
                                  key={expense.id}
                                  layoutId={expense.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="group flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-card-border)] rounded-[22px] p-4 transition-all duration-200 hover:border-[var(--color-accent)]/50 hover:shadow-xs relative"
                                >
                                  {/* LEFT CATEGORY ICON */}
                                  <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                                    <div 
                                      className="w-11 h-11 rounded-full flex items-center justify-center border border-[var(--color-card-border)] shadow-xs shrink-0 select-none transition-transform group-hover:scale-105"
                                      style={{ backgroundColor: catInfo.color, color: '#1a1a1a' }}
                                    >
                                      <IconComponent size={18} strokeWidth={2.5} />
                                    </div>

                                    {/* NOTE & SPENDING BAR */}
                                    <div className="flex-1 min-w-0 pr-3">
                                      <div className="flex items-baseline space-x-2">
                                        <span className="text-sm font-extrabold text-[var(--color-text)] select-all">{expense.category}</span>
                                        {expense.note && (
                                          <span className="text-[10px] sm:text-xs text-[var(--color-text-secondary)] max-w-[90px] min-[360px]:max-w-[130px] min-[400px]:max-w-[160px] sm:max-w-[220px] truncate select-all font-medium font-sans inline-block align-middle ml-1">
                                            {expense.note}
                                          </span>
                                        )}
                                      </div>

                                      {/* Proportional visual filled progress bar details */}
                                      <div className="flex items-center space-x-2 mt-1.5">
                                        <div className="w-full h-2 bg-[var(--color-input-bg)] border border-[var(--color-card-border)]/50 rounded-full overflow-hidden relative">
                                          <div 
                                            className="h-full rounded-full transition-all duration-500 ease-out"
                                            style={{ 
                                              width: `${propWidth}%`,
                                              backgroundColor: catInfo.color
                                            }}
                                          />
                                        </div>
                                        <span className="text-[8px] font-mono font-bold text-[var(--color-text-tertiary)] shrink-0">
                                          {propWidth.toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* VALUE & DELETE COMMAND */}
                                  <div className="flex items-center space-x-3 shrink-0 pl-1 select-none font-sans">
                                    <div className="text-right">
                                      <span className="text-base font-extrabold text-[var(--color-text)] block tracking-tight">
                                        {currency} {expense.amount.toFixed(2)}
                                      </span>
                                      <span className="text-[10px] text-[var(--color-text-secondary)]/70 font-mono block">
                                        {expense.date}
                                      </span>
                                    </div>

                                    {/* Edit Action */}
                                    <button
                                      id={`edit-btn-${expense.id}`}
                                      onClick={() => {
                                        setEditingExpense(expense);
                                        setIsModalOpen(true);
                                      }}
                                      title="编辑此笔消费"
                                      className="p-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-card-solid)] rounded-full transition-all cursor-pointer active:scale-[0.9]"
                                    >
                                      <Icons.Edit2 size={13} strokeWidth={2.5} />
                                    </button>

                                    {/* Trash Delete Action */}
                                    <button
                                      id={`delete-btn-${expense.id}`}
                                      onClick={() => handleDeleteExpense(expense.id, `${expense.category}: ¥${expense.amount}`)}
                                      title="删除此笔消费"
                                      className="p-2 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-[var(--color-card-solid)] rounded-full transition-all cursor-pointer active:scale-[0.9]"
                                    >
                                      <Icons.Trash2 size={13} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}

                </div>

              </div>

            </motion.div>
          )}

          {activeTab === 1 && (
            <motion.div
              key="tab-bill"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-xl mx-auto w-full flex flex-col gap-5 md:gap-6"
            >
              {/* Header Box with Month Navigation */}
              <div className="bg-white/80 border border-white/50 backdrop-blur-sm rounded-[32px] p-6 shadow-xs flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full mb-2">
                  本页账单 (按日查看)
                </span>
                
                {/* Month Toggler */}
                <div className="flex items-center justify-between w-full max-w-sm my-2">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-2 rounded-full hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer text-neutral-700 hover:text-black shrink-0"
                    title="上个月"
                  >
                    <Icons.ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                  <h2 className="text-lg font-black text-neutral-900 tracking-tight font-sans text-center px-4 flex-1">
                    {displayDateTitle}
                  </h2>
                  <button 
                    onClick={handleNextMonth}
                    className="p-2 rounded-full hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer text-neutral-700 hover:text-black shrink-0"
                    title="下个月"
                  >
                    <Icons.ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Substats */}
                <div className="w-full border-t border-dashed border-neutral-200 mt-4 pt-3.5 flex justify-around text-center select-none">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-neutral-400">本月支出</span>
                    <span className="text-sm font-black text-neutral-800 font-mono">{currentMonthExpenses.length} 笔</span>
                  </div>
                  <div className="border-r border-neutral-200" />
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-neutral-400">总计支出额</span>
                    <span className="text-sm font-black text-neutral-900 font-mono text-[#e06666]">{currency}{currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Simplified Dates & Spent Ledger List */}
              <div className="bg-white/80 border border-white/50 backdrop-blur-sm p-6 rounded-[32px] shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-neutral-800 uppercase tracking-wider flex items-center gap-1.5_">
                    <Icons.CalendarCheck size={14} className="text-neutral-500" />
                    按日期汇总明细
                  </span>
                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-full font-bold">
                    共 {currentMonthGroupedByDate.length} 天有支出
                  </span>
                </div>

                {currentMonthGroupedByDate.length === 0 ? (
                  <div className="text-center py-16 bg-neutral-50/50 border border-dashed border-neutral-200 rounded-[24px]">
                    <Icons.CalendarDays className="mx-auto text-neutral-300 mb-2" size={32} />
                    <p className="text-xs font-extrabold text-neutral-400">
                      该月暂未记录任何消费
                    </p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="mt-4 bg-neutral-900 hover:bg-black text-white text-[10px] font-bold px-3.5 py-2 rounded-full inline-flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      <Icons.Plus size={11} strokeWidth={3} />
                      立即记一笔
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--color-input-border)]/40 space-y-4">
                    {currentMonthGroupedByDate.map((group) => {
                      return (
                        <div key={group.date} className="pt-4 first:pt-0 flex flex-col gap-2">
                          
                          {/* Date Header + Date Total */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-3.5 rounded-full bg-[var(--color-accent)]" />
                              <span className="text-sm font-extrabold text-neutral-800">
                                {formatChineseDate(group.date)}
                              </span>
                            </div>
                            <span className="text-sm sm:text-base font-black text-neutral-900 font-sans tracking-tight">
                              {currency} {group.total.toFixed(2)}
                            </span>
                          </div>

                          {/* Nested itemized log showing the exact breakdown */}
                          <div className="bg-[var(--color-input-bg)] border border-[var(--color-input-border)]/40 rounded-2xl p-3 flex flex-col gap-2">
                            {group.items.map((item) => {
                              const catInfo = categories[item.category] || { color: '#CCCCCC', iconName: 'Tag' };
                              return (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span 
                                      className="w-1.5 h-1.5 rounded-full shrink-0" 
                                      style={{ backgroundColor: catInfo.color }}
                                    />
                                    <span className="font-bold text-neutral-700 truncate">{item.category}</span>
                                    {item.note && (
                                      <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">
                                        ({item.note})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-neutral-600 font-mono shrink-0 ml-2">
                                    {currency} {item.amount.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Budget and remaining warning message */}
              {currentMonthExpenses.length > 0 && (
                <div className="bg-white/40 border border-neutral-200/50 rounded-[28px] p-4 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#FDE68A]/80 flex items-center justify-center shrink-0 border border-black/5">
                    <Icons.CheckCircle2 size={15} className="text-amber-800" />
                  </div>
                  <div className="flex-1 font-sans">
                    <p className="text-xs text-neutral-700 leading-normal">
                      本月累计记录消费 <strong>{currentMonthExpenses.length}</strong> 笔，总花费 <strong>{currency}{currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(1)}</strong>。
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {activeTab === 2 && (
            <motion.div
              key="tab-ledger"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto w-full flex flex-col gap-4 animate-fade-in"
            >
              
              <div className="bg-white/80 border border-white/50 backdrop-blur-sm p-6 sm:p-8 rounded-[36px] shadow-xs" id="ledger-history-section">
                
                {/* Header indicators */}
                <div className="flex items-center justify-between select-none mb-5 gap-2">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-extrabold text-neutral-900 tracking-tight flex items-center gap-1.5">
                      <span>消费明细</span>
                      <span className="text-xs bg-neutral-100 text-neutral-600 font-bold py-0.5 px-2 rounded-full font-mono">
                        {displayedHistoryList.length}笔
                      </span>
                    </h3>
                    {selectedCategory && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-neutral-400">当前分类:</span>
                        <span className="text-[10px] bg-black text-white px-1.5 py-0.2 rounded font-bold">{selectedCategory}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="filter-toggle-pill"
                      onClick={() => setFilterMonthOnly(!filterMonthOnly)}
                      className="bg-white border border-neutral-300 rounded-full hover:border-black flex items-center gap-1 py-1 px-3 text-xs font-extrabold text-neutral-800 transition-colors shadow-xs cursor-pointer"
                    >
                      <span>{filterMonthOnly ? '本月账单' : '所有历史'}</span>
                      <Icons.ChevronDown size={13} className={`transition-transform duration-250 ${filterMonthOnly ? '' : 'rotate-180'}`} />
                    </button>

                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-neutral-950 hover:bg-neutral-805 text-white rounded-full py-1.5 px-4 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Icons.Plus size={13} strokeWidth={3} />
                      <span>记一笔</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Keyword Search Bar */}
                <div className="mb-4 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Icons.Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索分类或备注，如：吃饭、烤肉、春装..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-full border border-neutral-250 bg-white/70 text-xs font-bold text-neutral-900 placeholder-neutral-400 focus:border-black focus:bg-white focus:outline-none transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer p-0.5"
                    >
                      <Icons.X size={14} />
                    </button>
                  )}
                </div>

                {/* Category selectors */}
                <div className="mb-4 bg-neutral-50/70 border border-neutral-100 p-3 rounded-2xl select-none" id="ledger-category-quick-filter">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(null);
                        triggerFeedback('显示所有类型的消费记录', 'info');
                      }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        selectedCategory === null
                          ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50'
                      }`}
                    >
                      全部
                    </button>

                    {Object.keys(categories).map((catName) => {
                      const catInfo = categories[catName];
                      const isSelected = selectedCategory === catName;

                      return (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(catName);
                            triggerFeedback(`已载入“${catName}”分类账单`, 'success');
                          }}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'text-neutral-950 font-black shadow-xs bg-white'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50'
                          }`}
                          style={isSelected ? { borderColor: catInfo.color, boxShadow: `0 2px 5px ${catInfo.color}40`, backgroundColor: `${catInfo.color}25` } : {}}
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catInfo.color }} />
                          <span>{catName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real spend listings */}
                <div className="space-y-3" id="ledger-items-list-container">
                  {displayedHistoryList.length === 0 ? (
                    <div className="text-center py-16 bg-neutral-50/50 border-2 border-dashed border-neutral-250 rounded-[28px] pr-2 pl-2">
                      <Icons.SearchX className="mx-auto text-neutral-400 mb-2" size={36} />
                      <p className="text-xs font-extrabold text-neutral-500">
                        {searchQuery.trim()
                          ? `未找到匹配“${searchQuery}”的账目`
                          : selectedCategory 
                          ? `暂未在【${selectedCategory}】下录入花费纪录`
                          : `${displayDateTitle}暂无记账数据`}
                      </p>
                      
                      {selectedCategory && (
                        <button 
                          onClick={() => setSelectedCategory(null)}
                          className="mt-4 text-xs font-bold underline text-neutral-900 hover:text-black cursor-pointer inline-flex items-center gap-1"
                        >
                          <Icons.FilterX size={12} />
                          清除分类筛选
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayedHistoryList.map((expense) => {
                        const catInfo = categories[expense.category] || { name: expense.category, color: '#CCCCCC', bgColor: 'bg-neutral-200/30', iconName: 'Tag' };
                        const IconComponent = (Icons as any)[catInfo.iconName] || Icons.Tag;
                        const categorySum = categoryTotals[expense.category] || expense.amount;
                        const propWidth = Math.max(12, Math.min(100, (expense.amount / categorySum) * 100));

                        return (
                          <motion.div
                            key={expense.id}
                            layoutId={expense.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group flex items-center justify-between bg-white border border-[var(--color-card-border)] rounded-[22px] p-4 transition-all duration-200 hover:border-neutral-900/40 hover:shadow-xs relative"
                          >
                            <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                              <div 
                                className="w-11 h-11 rounded-full flex items-center justify-center border border-neutral-200/50 shadow-xs shrink-0 select-none transition-transform group-hover:scale-105"
                                style={{ backgroundColor: catInfo.color, color: '#1a1a1a' }}
                              >
                                <IconComponent size={18} strokeWidth={2.5} />
                              </div>

                              <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-baseline space-x-2">
                                  <span className="text-sm font-extrabold text-neutral-900">{expense.category}</span>
                                  {expense.note && (
                                    <span className="text-xs text-neutral-500 truncate max-w-[150px] font-medium font-sans">
                                      {expense.note}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 mt-1.5">
                                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden relative">
                                    <div 
                                      className="h-full rounded-full transition-all duration-500 ease-out"
                                      style={{ width: `${propWidth}%`, backgroundColor: catInfo.color }}
                                    />
                                  </div>
                                  <span className="text-[8px] font-mono font-bold text-neutral-400">
                                    {propWidth.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 shrink-0 pl-1 select-none font-sans">
                              <div className="text-right">
                                <span className="text-base font-extrabold text-neutral-900 block tracking-tight">
                                  {currency} {expense.amount.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-mono block">
                                  {expense.date}
                                </span>
                              </div>

                              <button
                                id={`delete-btn-${expense.id}`}
                                onClick={() => handleDeleteExpense(expense.id, `${expense.category}: ¥${expense.amount}`)}
                                title="删除此笔消费"
                                className="p-2 bg-neutral-50 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-full transition-colors cursor-pointer"
                              >
                                <Icons.Trash2 size={13} strokeWidth={2.5} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          )}

          {activeTab === 3 && (
            <motion.div
              key="tab-settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl mx-auto w-full flex flex-col gap-6"
            >
              
              <div className="bg-white/80 border border-white/50 backdrop-blur-sm p-6 sm:p-8 rounded-[36px] shadow-sm space-y-6">
                
                <div className="border-b border-neutral-100 pb-4">
                  <h2 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                    <Icons.Settings className="text-[var(--color-accent)]" size={20} />
                    系统偏好设置中心
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">定制极简账本的运作货币、消费上限与分类名录</p>
                </div>

                {/* 1. Currency choices */}
                <div>
                  <h3 className="text-xs font-black uppercase text-neutral-500 tracking-wider flex items-center gap-2 mb-3">
                    <Icons.Coins size={14} />
                    选择账本货币
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { symbol: '¥', name: '日元 / 人民币 (¥)', detail: 'CNY / JPY' },
                      { symbol: 'RM', name: '令吉 (RM)', detail: 'MYR' },
                      { symbol: '$', name: '美元 ($)', detail: 'USD' },
                      { symbol: 'HK$', name: '港币 (HK$)', detail: 'HKD' },
                      { symbol: '€', name: '欧元 (€)', detail: 'EUR' },
                      { symbol: '£', name: '英镑 (£)', detail: 'GBP' }
                    ].map((cur) => {
                      const isSelected = currency === cur.symbol;
                      return (
                        <button
                          key={cur.symbol}
                          type="button"
                          onClick={() => {
                            setCurrency(cur.symbol);
                            localStorage.setItem('currency', cur.symbol);
                            triggerFeedback(`货币符号成功更改为：${cur.symbol}`, 'success');
                          }}
                          className={`flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-black bg-black text-[var(--color-btn-primary-text)] shadow-md'
                              : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-input-bg)]'
                          }`}
                        >
                          <span className="text-sm font-mono font-black">{cur.symbol}</span>
                          <span className="text-xs font-bold mt-1">{cur.name}</span>
                          <span className={`text-[8px] font-medium leading-none mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                            {cur.detail}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 个性化主题装扮 (Theme customization) */}
                <div className="border-t border-neutral-100 pt-5">
                  <h3 className="text-xs font-black uppercase text-neutral-500 tracking-wider flex items-center gap-2 mb-3">
                    <Icons.Palette size={14} />
                    选择个性化主题装扮
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: 'cream',
                        name: '温润奶香 (经典)',
                        desc: '温馨舒适的柔和色调',
                        colorPreview: 'bg-[#f7f3e8] border-[#cbd5c5] text-[#1a1a1a]',
                        dotColors: ['#fbc4d0', '#fcd581', '#90be6d']
                      },
                      {
                        id: 'cyberpunk',
                        name: '极客赛博 (酷炫)',
                        desc: '科技感十足的暗夜霓虹',
                        colorPreview: 'bg-[#0b0c10] border-[#38bdf8] text-[#f5f6f8]',
                        dotColors: ['#f43f5e', '#38bdf8', '#39ff14']
                      },
                      {
                        id: 'matcha',
                        name: '抹茶森林 (护眼)',
                        desc: '自然静谧的舒适绿意',
                        colorPreview: 'bg-[#eff2eb] border-[#cbd5c5] text-[#1d251d]',
                        dotColors: ['#3e5c33', '#8f9e8a', '#e8a7b5']
                      }
                    ].map((t) => {
                      const isSelected = activeTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setActiveTheme(t.id);
                            localStorage.setItem('activeTheme', t.id);
                            document.documentElement.setAttribute('data-theme', t.id);
                            triggerFeedback(`已成功切换至【${t.name}】主题！`, 'success');
                          }}
                          className={`flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-black bg-black text-[var(--color-btn-primary-text)] shadow-md'
                              : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-input-bg)]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-black">{t.name}</span>
                            <div className="flex gap-0.5">
                              {t.dotColors.map((c, i) => (
                                <span key={i} className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          </div>
                          
                          <p className={`text-[9px] mt-1 font-medium ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                            {t.desc}
                          </p>

                          {/* Soft visual preview frame inside the card */}
                          <div className={`mt-2.5 w-full h-8 rounded-lg border flex items-center justify-around text-[8px] font-bold ${t.colorPreview}`}>
                            <span>图标</span>
                            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.dotColors[0] }} />
                            <span>￥120</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Monthly Budget limits */}
                <div className="border-t border-neutral-100 pt-5">
                  <h3 className="text-xs font-black uppercase text-neutral-500 tracking-wider flex items-center gap-2 mb-3">
                    <Icons.Sliders size={14} />
                    设置本月最高预算上限
                  </h3>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-2 bg-neutral-50 rounded-full px-4 py-2.5 flex-1 border border-neutral-205">
                      <span className="text-sm font-bold text-neutral-400">{currency}</span>
                      <input
                        type="number"
                        step="100"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        className="w-full bg-transparent text-sm font-black text-neutral-900 focus:outline-none"
                        placeholder="请输入预算金额"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseFloat(budgetInput);
                        if (!isNaN(val) && val >= 0) {
                          setMonthlyBudget(val);
                          localStorage.setItem('monthly_budget', val.toString());
                          triggerFeedback(`结余限额已更新为 ${currency}${val.toFixed(0)}`, 'success');
                        } else {
                          triggerFeedback('请输入合法的数字金额', 'info');
                        }
                      }}
                      className="bg-neutral-900 hover:bg-black text-white px-6 py-3 rounded-full text-xs font-black transition-colors cursor-pointer text-center"
                    >
                      保存限额设定
                    </button>
                  </div>
                </div>

                {/* 3. Category management info */}
                <div className="border-t border-neutral-100 pt-5">
                  <h3 className="text-xs font-black uppercase text-neutral-500 tracking-wider flex items-center gap-2 mb-3">
                    <Icons.Tag size={14} />
                    激活中的消费分类 ({Object.keys(categories).length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(categories).map((catName) => {
                      const catInfo = categories[catName];
                      return (
                        <div
                          key={catName}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-full text-xs font-bold"
                          style={{ borderColor: `${catInfo.color}35` }}
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: catInfo.color }} />
                          <span>{catName}</span>
                          <button
                            onClick={() => {
                              if (Object.keys(categories).length <= 1) {
                                triggerFeedback('必须保留至少一个分类！', 'info');
                                return;
                              }
                              handleDeleteCategory(catName);
                            }}
                            className="ml-1 text-[#e06666] cursor-pointer"
                            title="删除分类"
                          >
                            <Icons.X size={11} strokeWidth={3} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed">
                    注：您可以随时在记一笔账单弹框里的「分类编辑」中添加新的专属分类或管理其色彩标识。
                  </p>
                </div>

                {/* 4. Data Backup & Recovery region */}
                <div className="border-t border-neutral-100 pt-5 bg-[#BFDBFE]/10 p-4 rounded-3xl border border-[#BFDBFE]/20 mb-5">
                  <h3 className="text-xs font-black uppercase text-blue-800 tracking-wider flex items-center gap-2 mb-3">
                    <Icons.Database size={14} />
                    数据备份与恢复 (本地安全运行)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 border border-neutral-250 text-neutral-800 py-3 rounded-2xl text-xs font-extrabold cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Icons.Download size={13} className="text-blue-600" />
                      导出备份文件 (JSON)
                    </button>

                    <label className="flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 border border-neutral-250 text-neutral-800 py-3 rounded-2xl text-xs font-extrabold cursor-pointer transition-all active:scale-[0.98] select-none text-center">
                      <Icons.Upload size={13} className="text-emerald-600" />
                      导入恢复备份 (JSON)
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* 5. Danger control region */}
                <div className="border-t border-neutral-100 pt-5 bg-neutral-50/50 p-4 rounded-3xl">
                  <h3 className="text-xs font-black uppercase text-[#e06666] tracking-wider flex items-center gap-2 mb-3">
                    <Icons.AlertTriangle size={14} />
                    极简账本数据维护
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleClearAllData();
                      }}
                      className="flex items-center justify-center gap-2 bg-white/80 hover:bg-neutral-100 border border-neutral-250 text-neutral-800 py-3 rounded-2xl text-xs font-extrabold cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Icons.Trash2 size={13} className="text-[#e06666]" />
                      彻底彻底清空当前账本
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        loadDefaultSeedData();
                      }}
                      className="flex items-center justify-center gap-2 bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/40 border border-[var(--color-accent)] text-[var(--color-text)] py-3 rounded-2xl text-xs font-extrabold cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Icons.RotateCcw size={13} />
                      恢复默认示例数据
                    </button>
                  </div>
                </div>

              </div>
              
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FLOATING ACTION BOTTOM DOCK - GRACEFUL ON ALL DESKTOP / MOBILE LAYOUTS */}
      <footer 
        className="fixed bottom-0 left-0 right-0 mx-auto w-[calc(100%-2rem)] max-w-[350px] sm:max-w-[450px] bg-neutral-900/90 backdrop-blur-md rounded-full px-5 py-3.5 flex items-center justify-between shadow-2xl border border-white/10 select-none z-50" 
        id="floating-action-deck"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          marginLeft: 'auto',
          marginRight: 'auto',
          transform: 'none',
        }}
      >
        
        {/* Left portions of actions (Tabs 0 and 1) */}
        <div className="flex items-center justify-around flex-1">
          <button
            id="footer-home-tab"
            onClick={() => {
              setActiveTab(0);
              localStorage.setItem('activeTab', '0');
            }}
            style={activeTab === 0 ? { color: 'var(--color-accent)', backgroundColor: 'rgba(255,255,255,0.12)' } : {}}
            className={`p-2.5 rounded-full cursor-pointer transition-all ${
              activeTab === 0 
                ? '' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="控制台主页"
          >
            <Icons.LayoutGrid size={18} strokeWidth={2.5} />
          </button>

          <button
            id="footer-bill-tab"
            onClick={() => {
              setActiveTab(1);
              localStorage.setItem('activeTab', '1');
              setFilterMonthOnly(true);
            }}
            style={activeTab === 1 ? { color: 'var(--color-accent)', backgroundColor: 'rgba(255,255,255,0.12)' } : {}}
            className={`p-2.5 rounded-full cursor-pointer transition-all ${
              activeTab === 1 
                ? '' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="本月账单"
          >
            <Icons.TrendingUp size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Center Prominent Record Plus Sign */}
        <div className="relative w-12 flex justify-center flex-shrink-0">
          <button
            id="overlap-plus-trigger-btn"
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: 'var(--color-accent)' }}
            className="absolute -top-10 w-14 h-14 border-[3px] border-[var(--color-bg)] rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all font-bold cursor-pointer pointer-events-auto"
            title="记一笔"
          >
            <Icons.Plus size={26} strokeWidth={3} style={{ color: 'var(--color-accent-text)' }} />
          </button>
        </div>

        {/* Right portions of actions (Tabs 2 and 3) */}
        <div className="flex items-center justify-around flex-1">
          <button
            id="footer-ledger-tab"
            onClick={() => {
              setActiveTab(2);
              localStorage.setItem('activeTab', '2');
            }}
            style={activeTab === 2 ? { color: 'var(--color-accent)', backgroundColor: 'rgba(255,255,255,0.12)' } : {}}
            className={`p-2.5 rounded-full cursor-pointer transition-all ${
              activeTab === 2 
                ? '' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="消费明细"
          >
            <Icons.CalendarCheck size={18} strokeWidth={2.5} />
          </button>

          <button
            id="footer-settings-tab"
            onClick={() => {
              setActiveTab(3);
              localStorage.setItem('activeTab', '3');
            }}
            style={activeTab === 3 ? { color: 'var(--color-accent)', backgroundColor: 'rgba(255,255,255,0.12)' } : {}}
            className={`p-2.5 rounded-full cursor-pointer transition-all ${
              activeTab === 3 
                ? '' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            title="系统设置"
          >
            <Icons.Settings size={18} strokeWidth={2.5} />
          </button>
        </div>

      </footer>

      {/* PWA INSTALLATION INSTRUCTION MODAL */}
      <AnimatePresence>
        {isInstallModalOpen && (
          <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none" id="pwa-install-modal-container">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInstallModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
              id="install-modal-backdrop"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ y: '100%', scale: 1 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 border-black sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-y-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col justify-between"
              id="install-modal-card"
            >
              {/* Drag bar for mobile */}
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4 block sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-neutral-900 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-[#BFDBFE] rounded-full animate-pulse" />
                  安装到手机桌面
                </h3>
                <button
                  onClick={() => setIsInstallModalOpen(false)}
                  className="p-1.5 bg-neutral-200/60 text-neutral-800 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              {/* Body Content */}
              <div className="space-y-4 text-xs text-neutral-700 leading-relaxed overflow-y-auto pr-0.5">
                
                {/* Section 1: Why install */}
                <div className="bg-[#BFDBFE]/15 border border-[#BFDBFE]/30 p-3 rounded-2xl">
                  <span className="font-black text-neutral-800 block mb-1">✨ 为什么要安装「咕噜存钱」？</span>
                  <ul className="list-disc list-inside space-y-0.5 font-medium text-neutral-600">
                    <li>从手机桌面点击图标即可快速进入</li>
                    <li>隐藏浏览器地址栏，享受纯净全屏沉浸体验</li>
                    <li>操作流畅顺滑，像真正的手机 App 一样好用</li>
                  </ul>
                </div>

                {/* Android Direct One-click Install (Conditional) */}
                {deferredPrompt && (
                  <div className="bg-[#A7F3D0]/20 border border-[#A7F3D0]/40 p-3 rounded-2xl text-center">
                    <span className="font-black text-neutral-800 block mb-2">🎉 检测到您的系统支持快速安装！</span>
                    <button
                      onClick={() => {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then((choiceResult: any) => {
                          if (choiceResult.outcome === 'accepted') {
                            triggerFeedback('感谢安装咕噜存钱！', 'success');
                            setIsInstallModalOpen(false);
                          }
                          setDeferredPrompt(null);
                        });
                      }}
                      className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-2.5 rounded-full font-black text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      立即一键安装 App
                    </button>
                  </div>
                )}

                {/* Section 2: iPhone iOS installation */}
                <div className="bg-white border border-neutral-200/70 p-4 rounded-2xl space-y-2">
                  <span className="font-black text-neutral-900 flex items-center gap-1.5 flex-nowrap shrink-0">
                    <Icons.Smartphone size={14} className="text-pink-400" />
                    苹果 iPhone 安装步骤（Safari 浏览器）
                  </span>
                  <ol className="list-decimal list-inside space-y-1 font-medium text-neutral-600">
                    <li>请确保使用苹果自带的 <span className="font-black text-neutral-850">Safari 浏览器</span> 打开本网站</li>
                    <li>点击屏幕底部工具栏的 <span className="font-black text-neutral-850">「分享」</span> 按钮（带向上箭头的方框）</li>
                    <li>在分享菜单中向下滑动，点击 <span className="font-black text-neutral-850">「加入主屏幕」</span></li>
                    <li>确认应用名字，点击右上角 <span className="font-black text-neutral-850">「加入」</span> 即可完成</li>
                  </ol>
                </div>

                {/* Section 3: Android installation */}
                <div className="bg-white border border-neutral-200/70 p-4 rounded-2xl space-y-2">
                  <span className="font-black text-neutral-900 flex items-center gap-1.5 flex-nowrap shrink-0">
                    <Icons.Settings2 size={14} className="text-blue-400" />
                    安卓 Android 安装步骤（Chrome 浏览器）
                  </span>
                  <ol className="list-decimal list-inside space-y-1 font-medium text-neutral-600">
                    <li>使用 <span className="font-black text-neutral-850">Chrome 谷歌浏览器</span> 访问本网站</li>
                    <li>点击右上角菜单栏 <span className="font-black text-neutral-850">「三个点」</span> 图标</li>
                    <li>在下拉选项中点击 <span className="font-black text-neutral-850">「安装应用」</span> 或 <span className="font-black text-neutral-850">「添加到主屏幕」</span></li>
                    <li>在弹出的对话框中确认安装即可</li>
                  </ol>
                </div>

              </div>

              {/* Footer Button */}
              <div className="mt-5">
                <button
                  onClick={() => setIsInstallModalOpen(false)}
                  className="w-full bg-neutral-950 hover:bg-neutral-800 text-white py-3 rounded-full font-black text-xs transition-all active:scale-[0.98] cursor-pointer shadow-sm text-center"
                >
                  我知道了
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW EXPENDITURE MODAL FORM */}
      <AnimatePresence>
        {isModalOpen && (
          <ExpenseModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingExpense(null);
            }}
            onAddExpense={handleAddExpense}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            currency={currency}
            editingExpense={editingExpense}
            onEditExpense={handleEditExpense}
          />
        )}
      </AnimatePresence>

      {/* DANGEROUS RESET/WIPE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none" id="reset-confirm-modal-container">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetConfirmOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
              id="reset-modal-backdrop"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ y: '100%', scale: 1 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 border-black sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-hidden flex flex-col justify-between"
              id="reset-modal-card"
            >
              {/* Top Handle Decorator for Mobile Drag Handles */}
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4 block sm:hidden" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-neutral-900 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-[#FDE68A] rounded-full animate-ping" />
                  确定重置您的账本吗？
                </h3>
                <button
                  id="close-reset-modal-btn"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="p-1.5 bg-neutral-200/60 text-neutral-800 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <p className="text-xs text-neutral-600 font-medium leading-relaxed mb-6">
                重置动作将清除您当前保存的所有花费记录。
                为防止误删，您可以选择以下重置行为，或点击取消返回：
              </p>

              <div className="space-y-3">
                {/* Option 1: Completely Wipe */}
                <button
                  id="confirm-wipe-btn"
                  onClick={() => {
                    handleClearAllData();
                    setIsResetConfirmOpen(false);
                  }}
                  className="w-full bg-[var(--color-btn-primary)] text-[var(--color-btn-primary-text)] py-3.5 rounded-full font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                >
                  <Icons.Trash2 size={16} strokeWidth={2.5} className="text-[var(--color-accent)]" />
                  彻底清空账本 (全新空白账单)
                </button>

                {/* Option 2: Reset to sample demo data */}
                <button
                  id="confirm-restore-demo-btn"
                  onClick={() => {
                    loadDefaultSeedData();
                    setIsResetConfirmOpen(false);
                  }}
                  className="w-full bg-[var(--color-accent)] text-[var(--color-accent-text)] py-3.5 rounded-full font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer border border-black/10 shadow-sm"
                >
                  <Icons.RotateCcw size={16} strokeWidth={2.5} />
                  重置并载入演示数据 (含有历史明细)
                </button>

                {/* Cancel Button */}
                <button
                  type="button"
                  id="cancel-reset-btn"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="w-full bg-white text-neutral-700 py-3 rounded-full font-bold text-xs hover:border-black border border-neutral-300 transition-colors cursor-pointer text-center"
                >
                  取消并保留当前账单
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CURRENCY & PREFERENCE SETTING MODAL */}
      <AnimatePresence>
        {isSettingOpen && (
          <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none" id="currency-setting-modal-container">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
              id="setting-modal-backdrop"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ y: '100%', scale: 1 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-[var(--color-bg)] border-t-4 border-black sm:border-4 sm:rounded-[36px] rounded-t-[36px] p-6 shadow-2xl z-10 overflow-hidden flex flex-col justify-between"
              id="setting-modal-card"
            >
              {/* Top Handle Drag-Bar decorator */}
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-4 block sm:hidden" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-neutral-900 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-[var(--color-accent)] rounded-full animate-bounce" />
                  账本设置 & 货币符号
                </h3>
                <button
                  id="close-setting-modal-btn"
                  onClick={() => setIsSettingOpen(false)}
                  className="p-1.5 bg-neutral-200/60 text-neutral-800 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">选择显示货币</label>
                  <div className="grid grid-cols-2 gap-2.5 mt-2">
                    {[
                      { symbol: '¥', name: '日元 / 人民币 (¥)', detail: 'CNY / JPY' },
                      { symbol: 'RM', name: '令吉 (RM)', detail: '马来西亚马币 MYR' },
                      { symbol: '$', name: '美元 ($)', detail: 'USD' },
                      { symbol: 'HK$', name: '港币 (HK$)', detail: 'HKD' },
                      { symbol: '€', name: '欧元 (€)', detail: 'EUR' },
                      { symbol: '£', name: '英镑 (£)', detail: 'GBP' }
                    ].map((cur) => {
                      const isSelected = currency === cur.symbol;
                      return (
                        <button
                          key={cur.symbol}
                          type="button"
                          onClick={() => {
                            setCurrency(cur.symbol);
                            localStorage.setItem('currency', cur.symbol);
                            triggerFeedback(`货币符号成功更改为：${cur.symbol}`, 'success');
                          }}
                          className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-black bg-black text-[var(--color-btn-primary-text)] shadow-md'
                              : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-input-bg)]'
                          }`}
                        >
                          <span className="text-xs font-mono font-black">{cur.symbol}</span>
                          <span className="text-[11px] font-extrabold mt-1">{cur.name}</span>
                          <span className={`text-[8px] font-medium leading-none mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                            {cur.detail}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Theme selection in Settings Modal */}
                <div className="border-t border-neutral-100 pt-4">
                  <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider flex items-center gap-1.5 mb-2">
                    <Icons.Palette size={12} />
                    选择个性化主题装扮
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cream', name: '温润奶香', previewColor: 'bg-[#f7f3e8]' },
                      { id: 'cyberpunk', name: '极客赛博', previewColor: 'bg-[#0b0c10]' },
                      { id: 'matcha', name: '抹茶森林', previewColor: 'bg-[#eff2eb]' }
                    ].map((t) => {
                      const isSelected = activeTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setActiveTheme(t.id);
                            localStorage.setItem('activeTheme', t.id);
                            document.documentElement.setAttribute('data-theme', t.id);
                            triggerFeedback(`已成功切换至【${t.name}】主题！`, 'success');
                          }}
                          className={`flex items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-black bg-black text-[var(--color-btn-primary-text)] shadow-xs'
                              : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-input-bg)]'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full border border-neutral-300 flex-shrink-0 ${t.previewColor}`} />
                          <span className="text-[10px] font-black leading-none">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/60 rounded-2xl p-3 border border-neutral-200 text-neutral-600 space-y-1">
                  <span className="text-[10px] font-extrabold text-neutral-800 block">💡 提示说明：</span>
                  <p className="text-[10px] leading-relaxed">
                    更改货币选项后，账本内的最高消费、月度结余、限额运算、往期汇总以及自定义消费输入处的金额符号均会同步实时转换，账单数据会自动保留。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSettingOpen(false)}
                  className="w-full bg-neutral-900 hover:bg-black text-white py-3 rounded-full font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  确认返回
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
