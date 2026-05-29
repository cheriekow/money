export type CategoryType = string;

export interface Expense {
  id: string;
  amount: number;
  category: CategoryType;
  date: string;
  note?: string;
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
    color: '#FDE68A', // Sleek Pastel Yellow
    bgColor: 'bg-[#FDE68A]/30',
    circleColor: '#FDE68A',
    iconName: 'Utensils',
  },
  '逛街': {
    name: '逛街',
    color: '#FBCFE8', // Sleek Pastel Pink
    bgColor: 'bg-[#FBCFE8]/30',
    circleColor: '#FBCFE8',
    iconName: 'ShoppingBag',
  },
  '网购': {
    name: '网购',
    color: '#BFDBFE', // Sleek Pastel Blue
    bgColor: 'bg-[#BFDBFE]/30',
    circleColor: '#BFDBFE',
    iconName: 'Laptop',
  },
  '日常用品': {
    name: '日常用品',
    color: '#A7F3D0', // Sleek Pastel Green
    bgColor: 'bg-[#A7F3D0]/30',
    circleColor: '#A7F3D0',
    iconName: 'Heart',
  },
  '交通': {
    name: '交通',
    color: '#FED7AA', // Sleek Warm Peach
    bgColor: 'bg-[#FED7AA]/30',
    circleColor: '#FED7AA',
    iconName: 'Car',
  },
};

export interface FixedExpense {
  id: string;
  name: string;           // 规则名称 (如 "每月房租", "iCloud会员")
  amount: number;         // 固定开销金额
  category: CategoryType; // 消费类别 (如 "日常用品", "网购")
  dayOfMonth: number;     // 每月几号生效 (1 至 31)
  autoInclude: boolean;   // 是否自动计入当月账单
  note?: string;          // 备注 (可选)
}
