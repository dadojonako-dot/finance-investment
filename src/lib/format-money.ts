// Intl accepts decimal strings without first rounding them through Number.
export function formatMoney(value: string | number, digits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value as number);
}
