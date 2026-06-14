/**
 * JSON-LD Schema-Builder für die wichtigsten SEO-Signale.
 * Templates landen via `<script slot="head" type="application/ld+json" set:html={serializeJsonLd(...)} />`
 * im Head der jeweiligen Seite. Plan: docs/seo §P1.
 */

import type { CollectionEntry } from 'astro:content';

// Invariante Stammdaten, die (noch) nicht im CMS gepflegt sind.
// Wenn der Verein neue Felder in `siteSettings` ergänzt, hier auf die Daten umstellen.
const ORG_DEFAULTS = {
  legalName: 'Musikverein Gamshurst e.V.',
  alternateName: 'MV Gamshurst',
  foundingDate: '1925',
  genre: 'Blasmusik',
  logoPath: '/favicon.svg',
  defaultOgImage: '/og-default.png',
} as const;

type SiteSettings = CollectionEntry<'siteSettings'>['data'];
type Post = CollectionEntry<'post'>['data'];

interface BreadcrumbItem {
  name: string;
  /** Absoluter Pfad inkl. führendem Slash (z. B. `/aktuelles`). Beim letzten Eintrag weglassen. */
  path?: string;
}

const linkHref = (link?: { url?: string; cached_url?: string } | null): string =>
  link?.url || link?.cached_url || '';

/**
 * Parst den deutschen Adress-Block aus `siteSettings.address`
 * (mehrzeiliger String, letzte Zeile = "PLZ Ort") in ein schema.org PostalAddress.
 * Bei nicht-parsebarer Form fallen wir auf `streetAddress` = full string zurück.
 */
function parseAddress(raw: string): Record<string, string> | undefined {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return undefined;

  const last = lines[lines.length - 1]!;
  const plzMatch = last.match(/^(\d{5})\s+(.+)$/);
  if (plzMatch && lines.length >= 2) {
    return {
      '@type': 'PostalAddress',
      streetAddress: lines.slice(0, -1).join(', '),
      postalCode: plzMatch[1]!,
      addressLocality: plzMatch[2]!,
      addressCountry: 'DE',
    };
  }
  return {
    '@type': 'PostalAddress',
    streetAddress: lines.join(', '),
    addressCountry: 'DE',
  };
}

/**
 * Organization + MusicGroup Schema für die Startseite.
 * Identifiziert den Verein als Entity für Knowledge-Graph / Brand-Search.
 */
export function organizationSchema(
  settings: SiteSettings | undefined,
  siteUrl: URL,
): Record<string, unknown> {
  const sameAs = [
    linkHref(settings?.instagramUrl),
    linkHref(settings?.facebookUrl),
    linkHref(settings?.youtubeUrl),
  ].filter(Boolean);

  const address = settings?.address ? parseAddress(settings.address) : undefined;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['MusicGroup', 'Organization'],
    name: settings?.vereinName || ORG_DEFAULTS.legalName,
    alternateName: ORG_DEFAULTS.alternateName,
    url: siteUrl.origin + '/',
    logo: new URL(ORG_DEFAULTS.logoPath, siteUrl).href,
    image: new URL(ORG_DEFAULTS.defaultOgImage, siteUrl).href,
    foundingDate: ORG_DEFAULTS.foundingDate,
    genre: ORG_DEFAULTS.genre,
  };

  if (address) schema.address = address;
  if (settings?.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'general',
      email: settings.email,
    };
  }
  if (sameAs.length > 0) schema.sameAs = sameAs;

  return schema;
}

/**
 * NewsArticle Schema für News-Detailseiten (`/aktuelles/<slug>`).
 * Voraussetzung: `post.publishedAt` ist ein parsebares Datum, `post.coverImage`
 * verweist auf ein 1200x630-fähiges Asset (OG-Kompatibilität).
 */
export function newsArticleSchema(
  post: Post,
  settings: SiteSettings | undefined,
  pageUrl: URL,
  imageAbsoluteUrl: string,
): Record<string, unknown> {
  const orgName = settings?.vereinName || ORG_DEFAULTS.legalName;
  const orgLogoUrl = new URL(ORG_DEFAULTS.logoPath, pageUrl).href;
  const orgRef = {
    '@type': 'Organization',
    name: orgName,
    url: pageUrl.origin + '/',
    logo: {
      '@type': 'ImageObject',
      url: orgLogoUrl,
    },
  };

  // Storyblok liefert publishedAt als "YYYY-MM-DD HH:mm" — schema.org will ISO 8601.
  const isoDate = toIsoDate(post.publishedAt);

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl.href,
    },
    headline: post.title,
    description: post.excerpt || undefined,
    image: imageAbsoluteUrl ? [imageAbsoluteUrl] : undefined,
    datePublished: isoDate,
    dateModified: isoDate,
    author: orgRef,
    publisher: orgRef,
    articleSection: post.category || undefined,
  };
}

function toIsoDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * BreadcrumbList Schema. Übergib Items in Anzeige-Reihenfolge (Start → … → Aktuelle Seite).
 * Der letzte Eintrag sollte kein `path` haben (kein `item` im Output → spec-konform für aktuelles Element).
 */
export function breadcrumbListSchema(
  items: BreadcrumbItem[],
  siteUrl: URL,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, idx) => {
      const node: Record<string, unknown> = {
        '@type': 'ListItem',
        position: idx + 1,
        name: entry.name,
      };
      if (entry.path) {
        node.item = new URL(entry.path, siteUrl).href;
      }
      return node;
    }),
  };
}

/**
 * Sichere JSON-Serialisierung für JSON-LD-Script-Inhalte.
 * Entwertet `</script`-Sequenzen, falls Daten aus dem CMS unerwartet HTML-ähnliche Strings enthalten.
 */
export function serializeJsonLd(schema: Record<string, unknown>): string {
  return JSON.stringify(schema).replace(/<\/script/gi, '<\\/script');
}
