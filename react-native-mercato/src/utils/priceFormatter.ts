import { decodeEntities } from './htmlParser';

export function formatPrice(amount: number, currencySymbol: string): string {
  const symbol = decodeEntities(currencySymbol) || '$';
  const safe = Math.max(0, Number.isFinite(amount) ? amount : 0);
  return `${symbol}${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRawPrice(raw: string | undefined, currencySymbol: string): string {
  if (!raw) return '';
  const num = Number(raw);
  if (Number.isNaN(num)) return '';
  return formatPrice(num, currencySymbol);
}

export function calcDiscountPercent(regularPrice?: string, salePrice?: string): number | null {
  const reg = Number(regularPrice);
  const sale = Number(salePrice);
  if (!reg || !sale || Number.isNaN(reg) || Number.isNaN(sale) || sale >= reg) return null;
  const pct = Math.round(((reg - sale) / reg) * 100);
  return pct > 0 ? pct : null;
}
