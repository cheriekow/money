export const PRO_BASE_PRICE_MYR = 19;

// Approximate exchange rates relative to MYR (1 RM = X Foreign Currency)
// These are static fallbacks for UI display purposes.
const EXCHANGE_RATES_FROM_MYR: Record<string, number> = {
  'RM': 1,
  '$': 0.213,   // USD (19 * 0.213 = ~4.05)
  '¥': 1.526,   // CNY (19 * 1.526 = ~29.00)
  'SGD': 0.289, // SGD (19 * 0.289 = ~5.50)
  '฿': 7.89,    // THB (19 * 7.89 = ~150.00)
  '£': 0.17,    // GBP
  '€': 0.20,    // EUR
  'Rp': 3450,   // IDR
  '₫': 5300,    // VND
  '₱': 12.5,    // PHP
  '₹': 18.5,    // INR
  '₩': 295,     // KRW
};

export const convertMYRToCurrency = (amountMYR: number, targetCurrencySymbol: string): number => {
  const rate = EXCHANGE_RATES_FROM_MYR[targetCurrencySymbol] || 1; 
  return amountMYR * rate;
};

export const formatMembershipPrice = (amountMYR: number, currencySymbol: string): string => {
  if (currencySymbol === 'RM') {
    return `RM${amountMYR}`;
  }

  const converted = convertMYRToCurrency(amountMYR, currencySymbol);
  
  let prefix = currencySymbol;
  if (currencySymbol === '$') prefix = 'USD ';
  if (currencySymbol === '¥') prefix = '¥';
  if (currencySymbol === 'SGD') prefix = 'SGD ';
  if (currencySymbol === '฿') prefix = '฿';

  return `≈ ${prefix}${converted.toFixed(2)}`;
};
