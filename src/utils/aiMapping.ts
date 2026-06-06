import { CategoryInfo, PaymentMethodInfo } from '../types';

export const detectTransactionType = (text: string): 'expense' | 'income' => {
  const normalized = text.toLowerCase();

  const expenseKeywords = [
    '花', '花了', '买', '买了', '购买', '买入', '申购', '支付', '付款', '扣款', '消费',
    'purchase', 'buy', 'bought', 'subscribe', 'subscription', 'paid', 'spent'
  ];

  const incomeKeywords = [
    '收入', '收到', '进账', '工资', '薪水', '赚了', '客户付款',
    'salary', 'income', 'received', 'payment received', 'gaji', 'dapat duit', 'masuk duit', 'terima'
  ];

  const hasExpense = expenseKeywords.some(kw => normalized.includes(kw));
  const hasIncome = incomeKeywords.some(kw => normalized.includes(kw));

  // Priority rule: if both are present, or only expense is present, it's an expense.
  if (hasExpense) return 'expense';
  if (hasIncome) return 'income';
  
  // Default to expense if unclear
  return 'expense';
};

export const mapCategory = (
  rawCategory: string,
  type: 'expense' | 'income',
  categories: Record<string, CategoryInfo>,
  incomeCategories: Record<string, CategoryInfo>
): string => {
  const normalized = rawCategory.toLowerCase().trim();

  if (type === 'expense') {
    const expenseMapping: Record<string, string[]> = {
      '吃饭': [
        '吃饭', '吃', '饭', '早餐', '午餐', '晚餐', '宵夜',
        'nasi lemak', 'nasi goreng', 'mee', 'mee goreng', 'laksa', 'roti canai',
        'burger', 'coffee', 'kopi', 'teh', 'teh tarik', 'water', 'air', '水', 'makan', 'minum'
      ],
      '交通': [
        'grab', 'petrol', 'minyak', 'toll', 'parking', 'bus', 'train', 'mrt', 'lrt', 'taxi',
        '油', '油费', '过路费', '停车', '交通'
      ],
      '网购': [
        '网购', 'shopee', 'lazada', 'taobao', '淘宝', 'online shopping'
      ],
      '逛街': [
        '逛街', 'mall', 'shopping mall', '买衣服', '衣服', '鞋', 'shopping'
      ],
      '日常用品': [
        '日常用品', 'groceries', 'grocery', 'supermarket', 'household', '牙膏', '纸巾', '洗发水', 'soap', 'shampoo'
      ]
    };

    for (const [cat, keywords] of Object.entries(expenseMapping)) {
      if (keywords.some(kw => normalized.includes(kw))) {
        // Only return if the mapped category actually exists in the user's categories
        if (categories[cat]) return cat;
      }
    }
    // Try direct match
    const existingCat = Object.keys(categories).find(c => c.toLowerCase() === normalized);
    if (existingCat) return existingCat;
    
    return Object.keys(categories)[0] || '自定义';
  } else {
    const incomeMapping: Record<string, string[]> = {
      '其他收入': [ // mapped '收入' to '其他收入' if no explicit '收入' exists
        '收入', '收到', '进账', '工资', '薪水', '赚', '赚了', '客户付款',
        'freelance', 'client paid', 'salary', 'income', 'received', 'payment received',
        'gaji', 'dapat duit', 'masuk duit', 'terima'
      ]
    };

    for (const [cat, keywords] of Object.entries(incomeMapping)) {
      if (keywords.some(kw => normalized.includes(kw))) {
        // check if user has '收入' or fallback to '工资薪酬' / '其他收入'
        if (incomeCategories['收入']) return '收入';
        if (incomeCategories['其他收入']) return '其他收入';
        if (incomeCategories['工资薪酬']) return '工资薪酬';
      }
    }

    const existingCat = Object.keys(incomeCategories).find(c => c.toLowerCase() === normalized);
    if (existingCat) return existingCat;

    return Object.keys(incomeCategories)[0] || '其他收入';
  }
};

export const mapPaymentMethod = (
  rawPayment: string,
  paymentMethods: PaymentMethodInfo[]
): string => {
  if (!rawPayment) return paymentMethods[0]?.id || 'pay-cash';

  const normalized = rawPayment.toLowerCase().trim();

  const mapping: Record<string, string[]> = {
    'pay-cash': ['现金', 'cash', 'tunai'],
    'pay-tng': ['tng', 'touch n go', 'touchngo', "touch 'n go", 'ewallet', 'e-wallet', '电子钱包'],
    'pay-bank': [
      'card', 'debit', 'credit', 'bank card', '银行卡', 'bank transfer', 'online banking',
      'duitnow', 'transfer', '转账', 'maybank', 'cimb', 'public bank', 'hong leong'
    ]
  };

  for (const [id, keywords] of Object.entries(mapping)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      // Return ID if it exists in paymentMethods
      const exists = paymentMethods.find(m => m.id === id);
      if (exists) return id;
    }
  }

  // Fallback to currently selected / first method
  return paymentMethods[0]?.id || 'pay-cash';
};

export const mapDate = (rawDate: string): string => {
  const normalized = rawDate.toLowerCase().trim();
  const today = new Date();
  
  if (normalized.includes('昨天') || normalized.includes('yesterday') || normalized.includes('semalam')) {
    today.setDate(today.getDate() - 1);
  } else if (normalized.includes('前天') || normalized.includes('kelmarin')) {
    today.setDate(today.getDate() - 2);
  }
  // Otherwise default to today

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
};
