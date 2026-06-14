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
      filter: (page) => !page.includes('/404'),
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
