// Currency utilities and configuration
export const DEFAULT_CURRENCY = "NGN";
export const CURRENCY_SYMBOLS = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£"
} as const;

export const formatCurrency = (
  amount: number | string, 
  currency: keyof typeof CURRENCY_SYMBOLS = DEFAULT_CURRENCY
): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${numAmount.toFixed(2)}`;
};

// Get currency based on user region (can be expanded later)
export const getUserCurrency = (): keyof typeof CURRENCY_SYMBOLS => {
  // For now, default to Nigerian Naira
  // In the future, this can detect user location or preference
  return DEFAULT_CURRENCY;
};