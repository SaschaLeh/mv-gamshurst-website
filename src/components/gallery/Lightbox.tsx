import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

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

/** Same-Page-View-Transition für Tile↔Lightbox. Browser-Capability + reduced-motion respektieren. */
function canStartViewTransition(): boolean {
  if (typeof document === 'undefined') return false;
  if (typeof document.startViewTransition !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function Lightbox({ photos, triggerId, albumTitle }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Click-Handling per Event Delegation auf dem Trigger-Container.
  // Vorteil: ein Listener; nach-paginierte Tiles funktionieren automatisch.
  useEffect(() => {
    const container = document.querySelector<HTMLElement>(
      `[data-lightbox-id="${triggerId}"]`,
    );
    if (!container) return;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const trigger = target?.closest<HTMLButtonElement>('[data-lightbox-index]');
      if (!trigger) return;
      const i = Number.parseInt(trigger.dataset.lightboxIndex ?? '0', 10);
      if (Number.isNaN(i) || i < 0 || i >= photos.length) return;
      previouslyFocused.current = trigger;
      openWithTransition(trigger, i);
    };
    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [triggerId, photos.length]);

  const openWithTransition = (trigger: HTMLButtonElement, i: number) => {
    const triggerImg = trigger.querySelector<HTMLImageElement>('img');
    if (!canStartViewTransition() || !triggerImg) {
      setIndex(i);
      return;
    }
    triggerImg.style.viewTransitionName = 'lb-active';
    const transition = document.startViewTransition!(() => {
      flushSync(() => setIndex(i));
    });
    transition.finished.finally(() => {
      triggerImg.style.viewTransitionName = '';
    });
  };

  const close = useCallback(() => {
    if (index === null) return;
    const currentTile = document.querySelector<HTMLImageElement>(
      `[data-lightbox-id="${triggerId}"] [data-lightbox-index="${index}"] img`,
    );
    if (!canStartViewTransition() || !currentTile) {
      setIndex(null);
      previouslyFocused.current?.focus();
      return;
    }
    currentTile.style.viewTransitionName = 'lb-active';
    const transition = document.startViewTransition!(() => {
      flushSync(() => setIndex(null));
    });
    transition.finished.finally(() => {
      currentTile.style.viewTransitionName = '';
      previouslyFocused.current?.focus();
    });
  }, [index, triggerId]);

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
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('.lb-figure')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
    };
  }, [index, close, next, prev]);

  // Touch-Swipe: horizontal → prev/next, vertikal nach unten → close.
  useEffect(() => {
    if (index === null) return;
    const figure = dialogRef.current?.querySelector<HTMLElement>('.lb-figure');
    if (!figure) return;
    let startX = 0;
    let startY = 0;
    let active = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        active = false;
        return;
      }
      const t = e.touches[0]!;
      startX = t.clientX;
      startY = t.clientY;
      active = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax > 50 && ax > ay) {
        if (dx < 0) next();
        else prev();
      } else if (dy > 100 && ay > ax) {
        close();
      }
    };
    figure.addEventListener('touchstart', onStart, { passive: true });
    figure.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      figure.removeEventListener('touchstart', onStart);
      figure.removeEventListener('touchend', onEnd);
    };
  }, [index, next, prev, close]);

  // bfcache-Safety: body.overflow zurücksetzen, falls Page aus bfcache restored wird.
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
          touch-action: pan-y;
          /* Grid-Items haben min-height:auto per Default → eine 1fr-Row dehnt sich
             ans Bild an statt es zu begrenzen. Beides explizit auf 0, damit
             hochformatige Bilder per max-height in den Viewport passen. */
          min-height: 0;
          min-width: 0;
        }
        .lb-image {
          /* max-block-size in dvh ist nötig, weil max-height:100% in Kombination
             mit view-transition-name auf einem Grid-Item nicht zuverlässig auf
             die 1fr-Row aufgelöst wird. max-width:100% relativiert sauber auf
             den Figure-Content-Bereich (Padding wird berücksichtigt). */
          max-width: 100%;
          max-height: 100%;
          max-block-size: calc(100dvh - 7rem);
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
          /* Same-Page-View-Transition: persistent identifier nur am Lightbox-Bild.
             Auf Tile-Seite wird der Name kurz per JS gesetzt, sodass Browser den
             Morph rechnet. Direkt nach Transition wird der Name auf dem Tile gelöscht. */
          view-transition-name: lb-active;
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
