import type { APIRoute } from 'astro';

const SITEMAP_URL = 'https://mv-gamshurst.de/sitemap-index.xml';

const body = [
  'User-agent: *',
  'Allow: /',
  '',
  '# Privater Bereich gibt es nicht; nichts auszuschließen.',
  '',
  `Sitemap: ${SITEMAP_URL}`,
  '',
].join('\n');

export const GET: APIRoute = () =>
  new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
