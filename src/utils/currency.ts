const MAX_MONEY = 9_000_000_000_000;

export function normalizeMoney(value: unknown) {
  const amount = Number(String(value ?? '').replace(/[^\d-]/g, ''));
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_MONEY) return null;
  return amount;
}

export function formatMoneyInput(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';

  const normalizedDigits = digits.replace(/^0+(?=\d)/, '');
  return normalizedDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(safeAmount)}đ`;
}

export function formatSupportDateTime(value: unknown) {
  const candidate = value as { toDate?: () => Date } | Date | null;
  const date = candidate && typeof (candidate as { toDate?: () => Date }).toDate === 'function'
    ? (candidate as { toDate: () => Date }).toDate()
    : candidate instanceof Date
      ? candidate
      : null;
  if (!date || Number.isNaN(date.getTime())) return 'Vừa xong';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}
