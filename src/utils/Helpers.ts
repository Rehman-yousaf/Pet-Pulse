import { Colors } from '@/src/constants/Colors';

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getStatusColor = (status: 'Active' | 'Sick' | 'Recovering'): string => {
  switch (status) {
    case 'Active': return '#27AE60';
    case 'Sick': return '#EB5757';
    case 'Recovering': return Colors.primary;
    default: return Colors.grey;
  }
};

export const isValidEmail = (email: string): boolean => {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

export const PET_TYPES = [
  { id: 'dog', label: 'Dog', emoji: '🐕' },
  { id: 'cat', label: 'Cat', emoji: '🐈' },
  { id: 'bird', label: 'Bird', emoji: '🐦' },
  { id: 'fish', label: 'Fish', emoji: '🐠' },
  { id: 'rabbit', label: 'Rabbit', emoji: '🐰' },
  { id: 'hamster', label: 'Hamster', emoji: '🐹' },
  { id: 'turtle', label: 'Turtle', emoji: '🐢' },
  { id: 'horse', label: 'Horse', emoji: '🐴' },
  { id: 'guinea_pig', label: 'Guinea Pig', emoji: '🐹' },
  { id: 'other', label: 'Other', emoji: '🐾' },
] as const;

export const formatRelativeTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMs > 0) {
      if (diffMins < 1) return 'in a moment';
      if (diffMins < 60) return `in ${diffMins} min`;
      if (diffHours < 24) return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      if (diffDays === 1) return 'tomorrow';
      if (diffDays < 7) return `in ${diffDays} days`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const absMins = Math.abs(diffMins);
    const absHours = Math.abs(diffHours);
    const absDays = Math.abs(diffDays);
    if (absMins < 1) return 'Just now';
    if (absMins < 60) return `${absMins} min ago`;
    if (absHours < 24) return `${absHours} hour${absHours !== 1 ? 's' : ''} ago`;
    if (absDays === 1) return 'Yesterday';
    if (absDays < 7) return `${absDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

export const getPetEmoji = (type: string): string => {
  if (!type || typeof type !== 'string') return '🐾';
  const key = type.trim().toLowerCase();
  const found = PET_TYPES.find((t) => t.id === key);
  return found ? found.emoji : '🐾';
};
