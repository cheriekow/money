export type CategoryType = string;

export interface PaymentMethodInfo {
  id: string;
  name: string;
  icon: string;   // emoji icon
  color: string;  // Hex color for theme/border
}

export interface Expense {
  id: string;
  amount: number;
  category: CategoryType;
  date: string;
  note?: string;
  paymentMethodId?: string; // Optional for backward compatibility
}

export interface CategoryInfo {
  name: string;
  color: string; // Tailwind hex color
  bgColor: string; // Pastel tailwind color class
  circleColor: string; // for stroke styling
  iconName: string; // Lucide icon reference
}

export const DEFAULT_CATEGORIES: Record<string, CategoryInfo> = {
  '吃饭': {
    name: '吃饭',
    color: '#FDE68A',
    bgColor: 'bg-[#FDE68A]/30',
    circleColor: '#FDE68A',
    iconName: 'Utensils',
  },
  '逛街': {
    name: '逛街',
    color: '#FBCFE8',
    bgColor: 'bg-[#FBCFE8]/30',
    circleColor: '#FBCFE8',
    iconName: 'ShoppingBag',
  },
  '网购': {
    name: '网购',
    color: '#BFDBFE',
    bgColor: 'bg-[#BFDBFE]/30',
    circleColor: '#BFDBFE',
    iconName: 'Laptop',
  },
  '日常用品': {
    name: '日常用品',
    color: '#A7F3D0',
    bgColor: 'bg-[#A7F3D0]/30',
    circleColor: '#A7F3D0',
    iconName: 'Heart',
  },
  '交通': {
    name: '交通',
    color: '#FED7AA',
    bgColor: 'bg-[#FED7AA]/30',
    circleColor: '#FED7AA',
    iconName: 'Car',
  },
};

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: CategoryType;
  dayOfMonth: number;
  autoInclude: boolean;
  note?: string;
  paymentMethodId?: string; // Optional
}

// ─── Income Types ───────────────────────────────────────────────────────────

export interface Income {
  id: string;
  amount: number;
  category: string;
  date: string;  // YYYY-MM-DD
  note?: string;
}

export interface FixedIncome {
  id: string;
  name: string;        // e.g. "每月工资", "房租收入"
  amount: number;
  category: string;
  dayOfMonth: number;  // 每月几号到账 (1–31)
  autoInclude: boolean;
  note?: string;
}

export const DEFAULT_INCOME_CATEGORIES: Record<string, CategoryInfo> = {
  '工资薪酬': {
    name: '工资薪酬',
    color: '#6EE7B7',
    bgColor: 'bg-[#6EE7B7]/30',
    circleColor: '#6EE7B7',
    iconName: 'Banknote',
  },
  '兼职副业': {
    name: '兼职副业',
    color: '#93C5FD',
    bgColor: 'bg-[#93C5FD]/30',
    circleColor: '#93C5FD',
    iconName: 'Briefcase',
  },
  '理财投资': {
    name: '理财投资',
    color: '#FDE68A',
    bgColor: 'bg-[#FDE68A]/30',
    circleColor: '#FDE68A',
    iconName: 'TrendingUp',
  },
  '红包礼金': {
    name: '红包礼金',
    color: '#FDA4AF',
    bgColor: 'bg-[#FDA4AF]/30',
    circleColor: '#FDA4AF',
    iconName: 'Gift',
  },
  '其他收入': {
    name: '其他收入',
    color: '#C4B5FD',
    bgColor: 'bg-[#C4B5FD]/30',
    circleColor: '#C4B5FD',
    iconName: 'CirclePlus',
  },
};

export interface User {
  username: string;
  email: string;
  avatar: string;
  isProMember: boolean;
  token?: string;
  expiryDate?: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
}

export interface AIParsedItem {
  id: string; // generate on frontend
  type: 'expense' | 'income';
  amount: number;
  currency?: string;
  category: string;
  payment_method: string;
  note: string;
  transaction_date: string;
  confidence?: number;
}

export interface AIParsedResult {
  mode: 'local_fallback' | 'ai';
  sourceLabel: string;
  rawText: string;
  items: AIParsedItem[];
  detected_total: number | null;
  calculated_total: number;
  total_matches: boolean | null;
  warnings: string[];
}

