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

// Modul-scoped Client → alle Loader teilen sich eine Instanz und damit die SDK-interne
// Drosselung. Sonst feuert jeder Content-Type parallel mit eigenem Throttle → Rate-Limit.
let sharedClient: StoryblokClient | null = null;
function getClient(token: string): StoryblokClient {
  if (!sharedClient) {
    sharedClient = new StoryblokClient({
      accessToken: token,
      region: 'eu',
      // Storyblok Free-CDN: 6 req/s. Wir bleiben mit 3 req/s deutlich darunter, damit
      // mehrere parallel laufende Loader zusammen unterhalb des Limits bleiben.
      rateLimit: 3,
    });
  }
  return sharedClient;
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

/** Meta-Felder einer Story (System-Fields), getrennt vom inhaltlichen content. */
export interface StoryMeta {
  uuid: string;
  id: number;
  name: string;
  slug: string;
  full_slug: string;
  published_at: string | null;
  first_published_at: string | null;
  tag_list: string[];
  position: number;
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
        // Production-Build (STORYBLOK_VERSION=published) ohne Token = stille Bruchstelle.
        // Lieber loud failen als leere Footer/Sektionen deployen.
        if (version === 'published') {
          throw new Error(
            `STORYBLOK_DELIVERY_TOKEN fehlt — Production-Build (version=published) abgebrochen für "${contentType}".`,
          );
        }
        logger.warn(
          `STORYBLOK_DELIVERY_TOKEN fehlt — collection "${contentType}" bleibt leer (Skeleton-Mode, version=draft).`,
        );
        return;
      }

      const client = getClient(token);

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
          // full_slug als ID: stabil, semantisch (statt opaker uuid) und matched
          // direkt die Storyblok-Ordnerstruktur (`aktuelles/foo`, `site-settings`, …).
          const meta: StoryMeta = {
            uuid: story.uuid,
            id: story.id,
            name: story.name,
            slug: story.slug,
            full_slug: story.full_slug,
            published_at: story.published_at,
            first_published_at: story.first_published_at,
            tag_list: story.tag_list,
            position: story.position,
          };
          // Storyblok-Interna (_editable: Inline-Editor-Marker, _uid: Block-ID) raus —
          // dürfen nie ins Frontend rendern (XSS-Schutz, HTML-Kommentar im _editable).
          const { _editable: _e, _uid: _u, ...cleanContent } = story.content as Record<
            string,
            unknown
          > & { _editable?: unknown; _uid?: unknown };

          // Storyblok-Feldnamen dürfen `_meta` nicht verwenden — diese Loader reserviert es
          // für System-Felder. Dev-Mode warnt bei Kollision (Production: stille Overwrite).
          if (import.meta.env.DEV && '_meta' in story.content) {
            logger.warn(
              `Story "${story.full_slug}" hat ein CMS-Feld namens "_meta" — wird vom Loader überschrieben.`,
            );
          }

          // Content flach + Meta separat → Schemas validieren die genutzten Felder direkt.
          const data = { ...cleanContent, _meta: meta };
          store.set({
            id: story.full_slug,
            data: data as Record<string, unknown>,
            digest: generateDigest(data as Record<string, unknown>),
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
