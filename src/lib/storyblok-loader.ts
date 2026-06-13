import StoryblokClient from 'storyblok-js-client';
import type { Loader } from 'astro/loaders';

/**
 * Custom Astro 5 Content Layer Loader für Storyblok.
 *
 * Warum nicht @storyblok/astro Content Layer Loader: Der Loader ist im aktuellen
 * @storyblok/astro nicht (mehr) verfügbar (vgl. Plan §Offene Punkte Risiko 5).
 * Dieser SDK-basierte Loader ist das im Plan vorgesehene Fallback.
 *
 * Verhalten ohne Token: load() loggt Warnung und kehrt zurück; Collection bleibt leer.
 * Dadurch bleibt `npm run build` im Skeleton-Mode grün.
 */

interface MakeOptions {
  contentType: string;
  startsWith?: string;
}

interface StoryblokStory {
  uuid: string;
  id: number;
  slug: string;
  full_slug: string;
  name: string;
  created_at: string;
  published_at: string | null;
  first_published_at: string | null;
  content: Record<string, unknown> & { component: string };
  sort_by_date: string | null;
  position: number;
  tag_list: string[];
}

interface StoryblokStoriesResponse {
  stories: StoryblokStory[];
  cv: number;
}

export function makeStoryblokLoader({ contentType, startsWith }: MakeOptions): Loader {
  const token = import.meta.env.STORYBLOK_DELIVERY_TOKEN as string | undefined;
  const version = ((import.meta.env.STORYBLOK_VERSION as string | undefined) ?? 'published') as
    | 'draft'
    | 'published';

  return {
    name: `storyblok-${contentType}`,
    load: async ({ store, logger, generateDigest }) => {
      if (!token) {
        logger.warn(
          `STORYBLOK_DELIVERY_TOKEN fehlt — collection "${contentType}" bleibt leer (Skeleton).`,
        );
        return;
      }

      const client = new StoryblokClient({ accessToken: token, region: 'eu' });

      store.clear();

      let page = 1;
      const perPage = 100;
      let total = 0;

      // Storyblok CDN-API liefert maximal 100 Stories pro Seite → paginieren bis leer.
      while (true) {
        const { data } = await client.get('cdn/stories', {
          version,
          per_page: perPage,
          page,
          filter_query: { component: { in: contentType } },
          ...(startsWith ? { starts_with: startsWith } : {}),
        });

        const response = data as StoryblokStoriesResponse;
        const stories = response.stories ?? [];
        if (stories.length === 0) break;

        for (const story of stories) {
          // uuid ist stabil und einmalig pro Story → ideal als Content-Layer-ID.
          store.set({
            id: story.uuid,
            data: story as unknown as Record<string, unknown>,
            digest: generateDigest(story as unknown as Record<string, unknown>),
          });
          total++;
        }

        if (stories.length < perPage) break;
        page++;
      }

      logger.info(`Storyblok ${contentType}: ${total} Stories geladen (version=${version}).`);
    },
  };
}
