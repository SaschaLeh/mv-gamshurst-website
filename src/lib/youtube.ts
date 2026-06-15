/**
 * YouTube-Helper für Galerie-Video-Karten.
 *
 * Wir embedden nicht (kein iframe → kein Consent-Banner), sondern verlinken
 * mit dem statischen Vorschaubild von ytimg.com. `hqdefault.jpg` (480×360)
 * existiert garantiert für jedes Video; `maxresdefault.jpg` nicht — bewusst
 * auf `hq` festgelegt, damit kein Broken-Image entsteht.
 */

const YOUTUBE_ID_PATTERNS: ReadonlyArray<RegExp> = [
  /[?&]v=([\w-]{6,})/,
  /youtu\.be\/([\w-]{6,})/,
  /youtube\.com\/embed\/([\w-]{6,})/,
  /youtube\.com\/shorts\/([\w-]{6,})/,
];

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  for (const re of YOUTUBE_ID_PATTERNS) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
