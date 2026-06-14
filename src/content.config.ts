import { defineCollection, z } from 'astro:content';
import { makeStoryblokLoader } from './lib/storyblok-loader';

/**
 * Collections aus Storyblok (Plan §Content-Modell, docs/storyblok-setup.md §4).
 * Schemas validieren die Felder, die wir tatsächlich nutzen — alles andere
 * geht durch `.passthrough()`. CLI-Generierte Types können später ergänzt werden.
 */

// ── Wiederverwendbare Sub-Schemas ─────────────────────────────────────────────

/** Storyblok Multilink-Feld. Leer wenn Redakteur nichts eingetragen hat. */
const multilink = z.object({
  url: z.string().default(''),
  cached_url: z.string().default(''),
  linktype: z.string().optional(),
  fieldtype: z.literal('multilink').optional(),
  id: z.string().optional(),
  target: z.string().optional(),
});

/** Storyblok Asset-Feld (Image/Datei). */
const asset = z.object({
  id: z.number().nullable().optional(),
  filename: z.string(),
  alt: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  focus: z.string().nullable().optional(),
  name: z.string().optional(),
});

/**
 * Storyblok Richtext (TipTap-Doc).
 * `type` und `content` als optional/passthrough, damit leere Felder (`{}` oder `null`)
 * nicht die Schema-Validierung killen — Renderer prüft Existenz auf Konsumer-Seite.
 */
const richtext = z
  .object({
    type: z.string().optional(),
    content: z.array(z.unknown()).optional(),
  })
  .passthrough();

const storyMeta = z.object({
  uuid: z.string(),
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  full_slug: z.string(),
  published_at: z.string().nullable(),
  first_published_at: z.string().nullable(),
  tag_list: z.array(z.string()).default([]),
  position: z.number(),
});

// ── Collection-spezifische Schemas ────────────────────────────────────────────

const post = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'post', startsWith: 'aktuelles/' }),
  schema: z
    .object({
      _meta: storyMeta,
      component: z.literal('post'),
      title: z.string(),
      excerpt: z.string().default(''),
      body: richtext.optional(),
      category: z.string().default('Sonstiges'),
      coverImage: asset.optional(),
      publishedAt: z.string().optional(),
      externalLink: multilink.optional(),
    })
    .passthrough(),
});

const event = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'event', startsWith: 'termine/' }),
  schema: z
    .object({
      _meta: storyMeta,
      component: z.literal('event'),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().optional().nullable(),
      time: z.string().default(''),
      location: z.string().default(''),
      category: z.string().default('Sonstiges'),
      description: z.string().default(''),
      highlight: z.boolean().default(false),
    })
    .passthrough(),
});

const boardMember = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'boardMember', startsWith: 'vorstand/' }),
  schema: z
    .object({
      _meta: storyMeta,
      component: z.literal('boardMember'),
      name: z.string(),
      role: z.string().default(''),
      instrument: z.string().default(''),
      photo: asset.optional(),
      sortOrder: z.number().default(0),
    })
    .passthrough(),
});

const album = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'album', startsWith: 'galerie/' }),
  schema: z
    .object({
      _meta: storyMeta,
      component: z.literal('album'),
      title: z.string(),
      date: z.string(),
      coverImage: asset,
      photos: z.array(asset).default([]),
      featured: z.boolean().default(false),
      sortOrder: z.number().default(0),
    })
    .passthrough(),
});

const home = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'home' }),
  schema: z
    .object({
      _meta: storyMeta,
      component: z.literal('home'),
      sections: z.array(z.record(z.string(), z.unknown())).default([]),
    })
    .passthrough(),
});

const siteSettings = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'siteSettings' }),
  schema: z
    .object({
      _meta: storyMeta,
      component: z.literal('siteSettings'),
      vereinName: z.string().default('Musikverein Gamshurst e.V.'),
      address: z.string().default(''),
      email: z.string().default(''),
      instagramUrl: multilink.optional(),
      facebookUrl: multilink.optional(),
      youtubeUrl: multilink.optional(),
      proben: richtext.optional(),
    })
    .passthrough(),
});

const impressum = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'impressum' }),
  schema: z
    .object({
      _meta: storyMeta,
      component: z.literal('impressum'),
      title: z.string().default('Impressum'),
      body: richtext.optional(),
      isPlaceholder: z.boolean().default(false),
    })
    .passthrough(),
});

const datenschutz = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'datenschutz' }),
  schema: z
    .object({
      _meta: storyMeta,
      component: z.literal('datenschutz'),
      title: z.string().default('Datenschutz'),
      body: richtext.optional(),
      isPlaceholder: z.boolean().default(false),
    })
    .passthrough(),
});

export const collections = {
  post,
  event,
  boardMember,
  album,
  home,
  siteSettings,
  impressum,
  datenschutz,
};
