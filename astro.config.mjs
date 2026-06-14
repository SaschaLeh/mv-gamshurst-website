import { defineConfig, passthroughImageService } from 'astro/config';
import { storyblok } from '@storyblok/astro';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const storyblokToken = env.STORYBLOK_DELIVERY_TOKEN;

if (!storyblokToken) {
  // Skeleton-Mode: Build läuft weiter, Collections bleiben leer. Siehe docs/storyblok-setup.md.
  console.warn(
    '[storyblok] STORYBLOK_DELIVERY_TOKEN nicht gesetzt — Integration inaktiv (Skeleton-Mode).',
  );
}

export default defineConfig({
  output: 'static',
  site: 'https://mv-gamshurst.de',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  // Viewport-Prefetch: leichte Perf-Verbesserung ohne View-Transitions-Overhead (Plan §Astro-Konfig).
  prefetch: {
    defaultStrategy: 'viewport',
  },
  image: {
    // Bilder werden vom Storyblok Image-CDN transformiert; Astro generiert nur srcset.
    service: passthroughImageService(),
    domains: ['a.storyblok.com'],
  },
  integrations: [
    react(),
    sitemap({
      // 404 + Legal-Seiten raus: kein SEO-Wert, würden nur Crawl-Budget streuen.
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/impressum') &&
        !page.includes('/datenschutz'),
      // Pro Eintrag priority/changefreq setzen; lastmod = Build-Zeit (gut für Bing,
      // Google ignoriert priority/changefreq, lastmod hilft trotzdem bei Re-Crawls).
      serialize(item) {
        const lastmod = new Date().toISOString();
        const path = new URL(item.url).pathname;
        const isHome = path === '/' || path === '';
        const isNewsList = path === '/aktuelles' || path === '/aktuelles/';
        const isNewsPost = path.startsWith('/aktuelles/') && !isNewsList;
        const isGalleryList = path === '/galerie' || path === '/galerie/';
        const isGalleryAlbum = path.startsWith('/galerie/') && !isGalleryList;

        if (isHome) {
          return { ...item, lastmod, priority: 1.0, changefreq: 'weekly' };
        }
        if (isNewsList) {
          return { ...item, lastmod, priority: 0.8, changefreq: 'weekly' };
        }
        if (isNewsPost) {
          return { ...item, lastmod, priority: 0.7, changefreq: 'monthly' };
        }
        if (isGalleryList) {
          return { ...item, lastmod, priority: 0.6, changefreq: 'monthly' };
        }
        if (isGalleryAlbum) {
          return { ...item, lastmod, priority: 0.5, changefreq: 'monthly' };
        }
        return { ...item, lastmod, priority: 0.5, changefreq: 'yearly' };
      },
    }),
    ...(storyblokToken
      ? [
          storyblok({
            accessToken: storyblokToken,
            apiOptions: { region: 'eu' },
            // Tabellen-Editier-Modus, kein Visual Editor (Plan §Context).
            bridge: false,
            // Component-Mappings für home.sections folgen in Phase 4 (heroSection, …).
            components: {},
          }),
        ]
      : []),
  ],
});
