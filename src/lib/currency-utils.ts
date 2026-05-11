import { COUNTRIES } from "@/config/countries";

/**
 * Formats a numeric amount into a localized currency string based on the tenant's settings.
 * @param amount - The numeric value to format
 * @param currencyCode - The ISO currency code (e.g., USD, INR)
 * @returns A formatted string (e.g., $10.00, ₹500.00)
 */
export function formatCurrency(amount: number | string, currencyCode: string = "USD") {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const code = currencyCode.toUpperCase();

  try {
    // Use a locale that matches the currency for better symbol support
    const locale = code === 'INR' ? 'en-IN' : 'en-US';

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
    }).format(numericAmount);
  } catch {
    // Fallback if Intl fails
    const country = COUNTRIES.find(c => c.currency === code);
    const symbol = country?.symbol || "$";
    return `${symbol}${numericAmount.toFixed(2)}`;
  }
}
