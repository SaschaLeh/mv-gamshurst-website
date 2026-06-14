/**
 * Lokalisierungs-Helper für Datumsformate (de-DE) und Termin-Gruppierung.
 * Genutzt ab Phase 4 (Termine-Sektion mit Monats-Karten, Handoff §5.1.3).
 */

// Cloudflare Workers läuft in UTC; Storyblok speichert Datetime in UTC. Ohne explizite
// timeZone würden Termine, deren UTC-Zeit nach 22 Uhr läuft, auf der Live-Site einen
// Tag zurückspringen. Berlin pinnen → konsistent für die deutsche Zielgruppe.
const TZ = 'Europe/Berlin';

const DATE_LONG = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: TZ,
});

const DATE_SHORT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TZ,
});

const MONTH = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
  timeZone: TZ,
});
const WEEKDAY_SHORT = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: TZ });
const DAY = new Intl.DateTimeFormat('de-DE', { day: '2-digit', timeZone: TZ });

// Für Berlin-Day-Vergleiche (z. B. „selber Tag?")
const DAY_KEY = new Intl.DateTimeFormat('de-DE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TZ,
});

/** Ist `a` derselbe Kalendertag wie `b` in Europe/Berlin? */
export function isSameDayBerlin(a: Date | string, b: Date | string): boolean {
  return DAY_KEY.format(toDate(a)) === DAY_KEY.format(toDate(b));
}

export function toDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

export function formatDate(input: Date | string | null | undefined, style: 'long' | 'short' = 'long'): string {
  if (!input) return '';
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return '';
  return (style === 'long' ? DATE_LONG : DATE_SHORT).format(d);
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
