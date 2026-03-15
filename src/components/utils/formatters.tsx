function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatAmount(
  amount: number | bigint | string | null | undefined,
  decimals: number = 8,
): string {
  if (!amount && amount !== 0) return '0';
  const value = Number(amount) / 10 ** decimals;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function truncate(str: string | null | undefined, n: number = 10): string {
  if (!str) return '';
  if (str.length <= n * 2) return str;
  return `${str.slice(0, n)}...${str.slice(-n)}`;
}

export function fromUnix(ms: number | string | null | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return 'N/A';
  }
  try {
    return formatDateTime(new Date(ms));
  } catch (_error) {
    return 'Invalid Date';
  }
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

export function timeAgo(timestamp: number | null | undefined): string {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    return 'N/A';
  }
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 0) return 'in the future';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
