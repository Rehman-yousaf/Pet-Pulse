/**
 * Check if a timestamp is from today (local date).
 * Accepts Firestore Timestamp (with toDate()), Date, or ISO date string.
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

export function isToday(timestamp: unknown): boolean {
  const date = toDate(timestamp);
  if (!date || isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
}
