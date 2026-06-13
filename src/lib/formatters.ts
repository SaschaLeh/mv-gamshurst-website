/**
 * Lokalisierungs-Helper für Datumsformate (de-DE) und Termin-Gruppierung.
 * Genutzt ab Phase 4 (Termine-Sektion mit Monats-Karten, Handoff §5.1.3).
 */

const DATE_LONG = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const DATE_SHORT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const MONTH = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const WEEKDAY_SHORT = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
const DAY = new Intl.DateTimeFormat('de-DE', { day: '2-digit' });

function toDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

export function formatDate(input: Date | string, style: 'long' | 'short' = 'long'): string {
  return (style === 'long' ? DATE_LONG : DATE_SHORT).format(toDate(input));
}

export function formatDay(input: Date | string): string {
  return DAY.format(toDate(input));
}

export function formatWeekdayShort(input: Date | string): string {
  return WEEKDAY_SHORT.format(toDate(input));
}

export function monthKey(input: Date | string): string {
  const d = toDate(input);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(input: Date | string): string {
  return MONTH.format(toDate(input));
}

export interface HasStartDate {
  startDate: string | Date;
}

export interface MonthBucket<T extends HasStartDate> {
  key: string;
  label: string;
  events: T[];
}

/**
 * Gruppiert Events in chronologische Monatsblöcke.
 * Sortierung: Monate aufsteigend, Events innerhalb des Monats aufsteigend.
 */
export function groupEventsByMonth<T extends HasStartDate>(events: T[]): MonthBucket<T>[] {
  const sorted = [...events].sort(
    (a, b) => +toDate(a.startDate) - +toDate(b.startDate),
  );
  const buckets = new Map<string, MonthBucket<T>>();
  for (const event of sorted) {
    const key = monthKey(event.startDate);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, label: monthLabel(event.startDate), events: [] };
      buckets.set(key, bucket);
    }
    bucket.events.push(event);
  }
  return [...buckets.values()];
}

/** Filter: nur Events, deren endDate (oder startDate falls keiner) heute oder später ist. */
export function filterUpcoming<T extends HasStartDate & { endDate?: string | Date | null }>(
  events: T[],
  now: Date = new Date(),
): T[] {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return events.filter((event) => {
    const candidate = event.endDate ? toDate(event.endDate) : toDate(event.startDate);
    return candidate >= todayStart;
  });
}
