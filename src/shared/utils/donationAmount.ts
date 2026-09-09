export const sanitizeDonationAmountInput = (value: string): string =>
  value.replace(/[^\d,.]/g, "");

export const toDonationAmountCents = (value: string): number | null => {
  const sanitized = sanitizeDonationAmountInput(value).trim();
  if (!sanitized) return null;

  const lastCommaIndex = sanitized.lastIndexOf(",");
  const lastDotIndex = sanitized.lastIndexOf(".");
  const decimalSeparatorIndex = Math.max(lastCommaIndex, lastDotIndex);

  const normalized =
    decimalSeparatorIndex >= 0
      ? `${sanitized
          .slice(0, decimalSeparatorIndex)
          .replace(/[,.]/g, "")}.${sanitized
          .slice(decimalSeparatorIndex + 1)
          .replace(/[,.]/g, "")}`
      : sanitized.replace(/[,.]/g, "");

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const cents = Math.round(amount * 100);
  return cents > 0 ? cents : null;
};
