import { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface LightboxPhoto {
  full: string;
  thumb: string;
  alt: string;
}

interface Props {
  photos: LightboxPhoto[];
  /**
   * Wird verwendet, um die Lightbox an Trigger-Buttons (`data-lightbox-index="N"`) zu binden.
   * Der Trigger-Container muss `data-lightbox-id="<id>"` haben.
   */
  triggerId: string;
  albumTitle?: string;
}

export default function Lightbox({ photos, triggerId, albumTitle }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Trigger-Buttons (vom Masonry-Astro-Component gerendert) verdrahten.
  useEffect(() => {
    const triggers = document.querySelectorAll<HTMLButtonElement>(
      `[data-lightbox-id="${triggerId}"] [data-lightbox-index]`,
    );
    const handler = (e: Event) => {
      const target = e.currentTarget as HTMLButtonElement;
      const i = Number.parseInt(target.dataset.lightboxIndex ?? '0', 10);
      previouslyFocused.current = target;
      setIndex(i);
    };
    triggers.forEach((t) => t.addEventListener('click', handler));
    return () => triggers.forEach((t) => t.removeEventListener('click', handler));
  }, [triggerId]);

  const close = useCallback(() => {
    setIndex(null);
    previouslyFocused.current?.focus();
  }, []);

  const next = useCallback(() => {
    setIndex((cur) => (cur === null ? cur : (cur + 1) % photos.length));
  }, [photos.length]);

  const prev = useCallback(() => {
    setIndex((cur) => (cur === null ? cur : (cur - 1 + photos.length) % photos.length));
  }, [photos.length]);

  // Keyboard-Listener: Esc, ←, →, Tab (Fokus-Trap)
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Tab') {
        // Fokus-Trap: alle fokussierbaren Elemente im Dialog
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        const list = Array.from(focusables);
        if (list.length === 0) return;
        const first = list[0]!;
        const last = list[list.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    // Body-Scroll deaktivieren
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Initialer Fokus auf das Figure-Element → Screen Reader liest das alt vor.
    // React 18+ committet DOM vor Effects → kein setTimeout nötig.
    dialogRef.current?.querySelector<HTMLElement>('.lb-figure')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
    };
  }, [index, close, next, prev]);

  // bfcache-Safety-Net: Falls Browser-Back die Page aus dem bfcache wiederherstellt
  // während Lightbox offen war, ist body.overflow noch 'hidden'. Reset auf pageshow.
  useEffect(() => {
    const onPageShow = () => {
      document.body.style.overflow = '';
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  if (index === null) return null;
  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      ref={dialogRef}
      className="lb-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        // Klick auf Backdrop schließt; Klicks im Bild oder Buttons nicht.
        if (e.target === e.currentTarget) close();
      }}
    >
      <header className="lb-header">
        <span id={titleId} className="lb-title">
          {albumTitle ? `${albumTitle} — ` : ''}
          <span className="lb-counter">{index + 1} / {photos.length}</span>
        </span>
        <button type="button" className="lb-close" aria-label="Lightbox schließen" onClick={close}>
          ✕
        </button>
      </header>

      <button type="button" className="lb-nav lb-nav--prev" aria-label="Vorheriges Foto" onClick={prev}>
        ‹
      </button>

      <figure className="lb-figure" tabIndex={-1} aria-label={photo.alt}>
        <img className="lb-image" src={photo.full} alt={photo.alt} loading="eager" />
      </figure>

      <button type="button" className="lb-nav lb-nav--next" aria-label="Nächstes Foto" onClick={next}>
        ›
      </button>

      <style>{`
        .lb-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(8, 18, 22, 0.93);
          display: grid;
          grid-template-rows: auto 1fr;
          padding: 1rem;
        }
        .lb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #fff;
          padding: 0.5rem 0.75rem;
        }
        .lb-title { font-size: 0.95rem; font-weight: 600; }
        .lb-counter { font-variant-numeric: tabular-nums; opacity: 0.85; }
        .lb-close, .lb-nav {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border: 0;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.4rem;
          line-height: 1;
        }
        .lb-close:hover, .lb-nav:hover,
        .lb-close:focus-visible, .lb-nav:focus-visible {
          background: rgba(255, 255, 255, 0.18);
          outline: 2px solid #f3c12e;
          outline-offset: 2px;
        }
        .lb-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 56px;
          height: 56px;
        }
        .lb-nav--prev { left: 1.5rem; }
        .lb-nav--next { right: 1.5rem; }
        .lb-figure {
          margin: 0;
          display: grid;
          place-items: center;
          padding: 1rem 4rem;
          overflow: hidden;
        }
        .lb-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
        }
        @media (max-width: 640px) {
          .lb-figure { padding: 0.5rem; }
          .lb-nav { width: 44px; height: 44px; }
          .lb-nav--prev { left: 0.5rem; }
          .lb-nav--next { right: 0.5rem; }
        }
      `}</style>
    </div>
  );
}
