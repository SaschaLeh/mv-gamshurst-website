/**
 * Storyblok-Helper: URL-Bau für Image Service, Richtext-Render-Reexport.
 * Image Service Docs: https://www.storyblok.com/docs/image-service
 */

export { renderRichText } from '@storyblok/astro';

export interface StoryblokAsset {
  filename: string;
  alt?: string;
  title?: string;
  focus?: string;
  id?: number;
}

interface ImgOptions {
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  quality?: number;
  /** Smart-Crop nutzt Storyblok-Face-Detection — sinnvoll für Personenfotos. */
  smart?: boolean;
}

/**
 * Baut eine Storyblok-Image-Service-URL.
 *
 *   imgUrl(asset, { width: 600, height: 400, format: 'webp' })
 *   → https://a.storyblok.com/f/.../image.jpg/m/600x400/filters:format(webp)
 *
 * Eingabe ist entweder ein Asset-Object aus Storyblok (`{ filename, alt, ... }`)
 * oder eine reine URL-String. `null`/`undefined` → leerer String.
 */
export function imgUrl(
  asset: StoryblokAsset | string | null | undefined,
  opts: ImgOptions = {},
): string {
  const src = typeof asset === 'string' ? asset : asset?.filename;
  if (!src) return '';

  const { width, height, format = 'webp', quality, smart } = opts;
  const segments: string[] = [];

  if (width != null || height != null) {
    segments.push(`${width ?? 0}x${height ?? 0}`);
  }
  if (smart) {
    segments.push('smart');
  }

  const filters: string[] = [];
  if (format) filters.push(`format(${format})`);
  if (quality != null) filters.push(`quality(${quality})`);
  if (filters.length) segments.push(`filters:${filters.join(':')}`);

  return segments.length > 0 ? `${src}/m/${segments.join('/')}` : src;
}

/**
 * Baut ein srcset-Attribut für responsive Bilder über mehrere Pixelbreiten.
 *
 *   srcset(asset, [320, 640, 960], { format: 'webp' })
 *   → "<url>/m/320x0/filters:format(webp) 320w, <url>/m/640x0/... 640w, ..."
 */
export function srcset(
  asset: StoryblokAsset | string | null | undefined,
  widths: number[],
  opts: Omit<ImgOptions, 'width' | 'height'> & { aspect?: [number, number] } = {},
): string {
  const src = typeof asset === 'string' ? asset : asset?.filename;
  if (!src) return '';

  const { aspect, ...rest } = opts;
  return widths
    .map((w) => {
      const h = aspect ? Math.round((w * aspect[1]) / aspect[0]) : 0;
      return `${imgUrl(asset, { width: w, height: h, ...rest })} ${w}w`;
    })
    .join(', ');
}
