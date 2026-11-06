/**
 * Formats numeric values into Roblox/Blox Fruits style suffixes (e.g., 2.7B, 15M, 850K).
 */
export function formatValue(num: number | null | undefined, isCurrency = false): string {
  if (num === null || num === undefined) {
    return 'N/A';
  }
  if (num === 0) {
    return isCurrency ? '0' : 'N/A';
  }

  const absNum = Math.abs(num);
  let formatted = '';

  if (absNum >= 1_000_000_000) {
    const val = num / 1_000_000_000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '')}B`;
  } else if (absNum >= 1_000_000) {
    const val = num / 1_000_000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '')}M`;
  } else if (absNum >= 1_000) {
    const val = num / 1_000;
    formatted = `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '')}K`;
  } else {
    formatted = num.toLocaleString();
  }

  return formatted;
}

/**
 * Format relative time (e.g. "2 minutes ago", "Just now")
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

/**
 * Format clean standard timestamp (e.g. "Nov 6, 2026, 11:20 AM UTC")
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}
