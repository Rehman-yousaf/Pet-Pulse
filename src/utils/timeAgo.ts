/**
 * Convert a Firestore Timestamp or Date or ISO string to "5m ago", "2h ago", "3d ago".
 */
function toDate(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'string') return new Date(input);
  if (typeof input === 'object' && input !== null && 'toDate' in input && typeof (input as { toDate: () => Date }).toDate === 'function') {
    return (input as { toDate: () => Date }).toDate();
  }
  return null;
}

export function timeAgo(input: unknown): string {
  const date = toDate(input);
  if (!date || isNaN(date.getTime())) return '';

  const now = new Date();
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hour < 24) return `${hour}h ago`;
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.floor(day / 7)}w ago`;
  return date.toLocaleDateString();
}
