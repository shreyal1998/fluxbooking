import { COUNTRIES } from "@/config/countries";

/**
 * Formats a numeric amount into a localized currency string based on the tenant's settings.
 * @param amount - The numeric value to format
 * @param currencyCode - The ISO currency code (e.g., USD, INR)
 * @returns A formatted string (e.g., $10.00, ₹500.00)
 */
export function formatCurrency(
  amount: number | string, 
  currencyCode: string = "USD",
  options?: { showFree?: boolean }
) {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const showFree = options?.showFree ?? true;

  if (showFree && (isNaN(numericAmount) || numericAmount === 0)) {
    return "Free";
  }

  const validAmount = isNaN(numericAmount) ? 0 : numericAmount;
  const code = currencyCode.toUpperCase();

  try {
    // Use a locale that matches the currency for better symbol support
    const locale = code === 'INR' ? 'en-IN' : 'en-US';

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
      minimumFractionDigits: validAmount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(validAmount);
  } catch {
    // Fallback if Intl fails
    const country = COUNTRIES.find(c => c.currency === code);
    const symbol = country?.symbol || "$";
    const formattedNum = validAmount % 1 === 0 ? validAmount.toString() : validAmount.toFixed(2);
    return `${symbol}${formattedNum}`;
  }
}

export function getCurrencySymbol(currencyCode: string = "USD") {
  const code = currencyCode.toUpperCase();
  try {
    const locale = code === 'INR' ? 'en-IN' : 'en-US';
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find(p => p.type === 'currency');
    return symbolPart ? symbolPart.value : "$";
  } catch {
    const country = COUNTRIES.find(c => c.currency === code);
    return country?.symbol || "$";
  }
}
