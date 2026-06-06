import { CategoryInfo, PaymentMethodInfo } from '../types';

export const mapCategory = (
  rawCategory: string,
  type: 'expense' | 'income',
  categories: Record<string, CategoryInfo>,
  incomeCategories: Record<string, CategoryInfo>
): string => {
  const catsToUse = type === 'expense' ? categories : incomeCategories;
  const normalized = (rawCategory || '').trim();

  // Try direct exact match (since AI returns the exact category names)
  if (catsToUse[normalized]) return normalized;
  
  // Try case-insensitive match
  const existingCat = Object.keys(catsToUse).find(c => c.toLowerCase() === normalized.toLowerCase());
  if (existingCat) return existingCat;
  
  // Fallback
  return type === 'expense' ? (Object.keys(categories)[0] || '自定义') : (Object.keys(incomeCategories)[0] || '其他收入');
};

export const mapPaymentMethod = (
  rawPayment: string,
  paymentMethods: PaymentMethodInfo[]
): string => {
  if (!rawPayment) return ''; // Let frontend use default

  const normalized = rawPayment.toLowerCase().trim();

  // The AI should return exactly '现金', 'TnG', '银行卡'
  if (normalized === '现金' || normalized === 'cash' || normalized === 'tunai') return 'pay-cash';
  if (normalized === 'tng' || normalized === "touch 'n go" || normalized === "touch n go") return 'pay-tng';
  if (normalized === '银行卡' || normalized === 'bank transfer' || normalized === 'card') return 'pay-bank';

  // Fallback to exact ID match if it happens to match
  const exists = paymentMethods.find(m => m.id === normalized || m.name.toLowerCase() === normalized);
  if (exists) return exists.id;

  return ''; // Let frontend use default
};

export const mapDate = (rawDate: string): string => {
  const normalized = (rawDate || '').toLowerCase().trim();
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
