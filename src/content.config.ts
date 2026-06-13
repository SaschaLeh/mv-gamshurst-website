import { defineCollection } from 'astro:content';
import { makeStoryblokLoader } from './lib/storyblok-loader';

/**
 * Collections aus Storyblok (Plan §Content-Modell, docs/storyblok-setup.md §4).
 * Schemas (zod) folgen Phase 3b nach `storyblok types generate` —
 * dann werden die Generated-Types als zod-Schemas eingespielt.
 */

const post = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'post', startsWith: 'aktuelles/' }),
});

const event = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'event', startsWith: 'termine/' }),
});

const boardMember = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'boardMember', startsWith: 'vorstand/' }),
});

const album = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'album', startsWith: 'galerie/' }),
});

const home = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'home' }),
});

const siteSettings = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'siteSettings' }),
});

const impressum = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'impressum' }),
});

const datenschutz = defineCollection({
  loader: makeStoryblokLoader({ contentType: 'datenschutz' }),
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
