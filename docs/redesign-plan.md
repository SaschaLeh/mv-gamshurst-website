# Plan: Website-Redesign MV Gamshurst — Astro + Storyblok + Cloudflare Workers

## Context

**Warum dieser Plan existiert.** Die aktuelle Website des MV Gamshurst läuft als selbstgeschriebenes WordPress-Theme bei domainoffensive (do.de starterWeb). WordPress ist für den überschaubaren Bedarf des Vereins überdimensioniert (Plugin-Wirrwarr, Update-Bürde, veraltetes Theme). Ein fertiges Redesign existiert bereits als Design-Handoff (`design_handoff_mv_gamshurst/`, Richtung C, High-Fidelity). Ziel: ein modernes, schlankes Setup, das **nicht-technische Redakteure** (Vorstandsebene, Office-Niveau) Aktuelles, Termine und Bildergalerie pflegen lässt, **ohne laufende Kosten**, ohne dass Domain & Mailpostfächer bei do.de wegmüssen.

**Stack (entschieden):**
- **Frontend:** Astro 5 (Static Site Generation, selektive Inseln)
- **CMS:** Storyblok (Community-Plan, deutsches Editor-UI — **Tabellen-Editier-Modus**, kein Visual Editor)
- **Content-Integration:** `@storyblok/astro` als Content Layer Loader (Astro Content Collections API) — kein naiver SDK-Polling-Fetch
- **Type-Safety:** Storyblok-CLI generiert TypeScript-Types aus dem Space-Schema (`storyblok types generate`)
- **Hosting:** **Cloudflare Workers (Static Assets)** — *nicht* Cloudflare Pages. Pages ist seit 2025 in Wartungsmodus; Workers Static Assets ist der von Cloudflare und Astro empfohlene Pfad für neue Projekte.
- **Contact-Endpoint:** Worker-Route im selben Worker (`/api/contact`), keine separate Deploy-Einheit
- **Spam-Schutz:** Cloudflare Turnstile (gratis, unsichtbar) + Honeypot + KV-Rate-Limit
- **Mail-Versand:** Resend Free-Tier (3.000 Mails/Monat) → Ziel `info@mv-gamshurst.de`
- **Repo:** GitHub privat, CI über Cloudflare Workers Builds (verbindet sich mit GitHub auto)
- **DNS:** bleibt bei do.de (Registrar). MX-Records bleiben unverändert → Mail läuft weiter über do.de. Nur A/CNAME auf Cloudflare Workers umbiegen.

**Bekanntes Risiko (Benutzer informiert):** Storyblok Community-Plan = 1 User. Default-Annahme: geteilter Login zwischen Hauptredakteur(en). Falls Multi-User-Audit relevant wird, ist später Migration zu Sanity (3 User free) oder Bezahltarif nötig.

---

## Architektur-Überblick

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│   Storyblok     │      │   GitHub (priv.) │      │ Cloudflare Worker   │
│  Content + CDN  │─────▶│   Astro Source   │─────▶│  Static Assets      │
│  (Editor-UI)    │ Hook │ + storyblok-     │ Push │  + /api/contact     │
└─────────────────┘      │   loader CL API  │      │                     │
        │                └──────────────────┘      └──────────┬──────────┘
        │ Bilder via Storyblok Image-CDN                       │
        ▼ (srcset, WebP — passthroughImageService)             │
                                                               │ Resend API
                                                               ▼
                                                  ┌──────────────────────┐
                                                  │  Mail @ do.de        │
                                                  │ info@mv-gamshurst.de │
                                                  └──────────────────────┘
```

**Datenfluss (Veröffentlichen eines neuen Beitrags):**
1. Redakteur loggt sich bei Storyblok ein, erstellt einen `post`, klickt „Veröffentlichen".
2. Storyblok-Webhook triggert Cloudflare Workers Build (mit signiertem Webhook-Secret).
3. Astro-Build holt alle Inhalte via Storyblok Content Layer Loader, generiert statisches HTML.
4. Deploy ist nach ~30–60 s live auf der Edge.

**Datenfluss (Kontaktformular):**
1. Besucher submittet Formular → POST an Worker-Route (`/api/contact`).
2. Worker validiert: Method, Honeypot, Turnstile-Token (server-side gegen Siteverify-API), Pflichtfelder, Consent.
3. KV-Rate-Limit prüfen (max 5 Requests/IP/Stunde).
4. Resend-API-Call (`from: noreply@<versand-domain>`, `to: info@mv-gamshurst.de`, `reply-to: <user-email>`).
5. Worker antwortet `200 OK`. Frontend zeigt Erfolgszustand (Design §5.3).

---

## Content-Modell in Storyblok

Direkt abgeleitet aus `design_handoff_mv_gamshurst/README.md` §10. Schema wird über die Storyblok-UI manuell gebaut (1× Aufwand). Nach dem Schema-Bau: `storyblok types generate` produziert `.storyblok/types/<space-id>/storyblok-component.d.ts` — diese Types werden in Astro importiert und garantieren Build-Fehler bei Schema-Drift.

### Content Types (Stories)
| Komponente | Felder | Anmerkung |
|---|---|---|
| `post` | `title` (Text), `slug` (auto), `publishedAt` (Datetime), `category` (Single-Option: Konzert/Verein/Fest/Festwochenende/Brassparty/Sonstiges), `excerpt` (Textarea), `body` (Richtext), `coverImage` (Asset), `externalLink` (URL, optional) | Liegt unter `aktuelles/{slug}`. Sortierung über `publishedAt`. |
| `event` | `title`, `startDate`, `endDate` (optional), `time` (Text), `location` (Text), `category` (Option: Konzert/Auftritt/Fest/Verein/Kirchlich/Sonstiges), `description` (Textarea, opt.), `highlight` (Bool — fürs Jahreskonzert) | Liegt unter `termine/{slug}`. Gruppiert beim Render nach Monat. |
| `boardMember` | `name`, `role`, `instrument`, `photo` (Asset, opt.), `sortOrder` (Int) | Liegt unter `vorstand/{slug}`. |
| `album` | `title`, `date` (Date), `coverImage` (Asset), `photos` (Asset Multi-Select), `featured` (Bool), `sortOrder` (Int) | Liegt unter `galerie/{slug}`. `photos[].filename` liefert Bild-URLs für Lightbox. |

### Singletons (eigene Stories ohne Liste)
| Komponente | Felder | Verwendung |
|---|---|---|
| `siteSettings` | `vereinName`, `address`, `email`, `instagramUrl`, `facebookUrl`, `proben` (Richtext, opt.) | Footer, Kontaktseite. |
| `impressum` | `title`, `body` (Richtext) | Seite `/impressum`. Hoster-Angabe muss "Cloudflare, Inc." enthalten. |
| `datenschutz` | `title`, `body` (Richtext mit Heading-Anchors für Sticky-TOC) | Seite `/datenschutz`. |
| `home` | Sektionsblöcke (siehe unten) | Seite `/`. |

### Nestable Blocks (innerhalb von `home`)
`heroSection`, `aktuellesTeaser`, `terminePreview`, `vereinSection`, `vorstandSection`, `galerieTeaser`.

---

## Astro-Projektstruktur

```
.
├── astro.config.mjs            # passthroughImageService, sitemap, prefetch
├── wrangler.jsonc              # Workers Static Assets + KV + Routes
├── package.json
├── tsconfig.json               # extends astro/tsconfigs/strict
├── .env.example
├── public/
│   ├── favicon.svg
│   └── assets/logo-light.svg
├── src/
│   ├── content.config.ts       # storyblokLoader-Collections (Astro 5 CL API)
│   ├── env.d.ts
│   ├── lib/
│   │   ├── storyblok.ts        # Token-Config, Helper für Bild-URLs/Richtext
│   │   ├── formatters.ts       # Datum (de-DE), Monatsgruppierung
│   │   └── turnstile.ts        # Siteverify-Wrapper für Worker
│   ├── components/
│   │   ├── layout/{Nav.astro,Footer.astro}
│   │   ├── sections/           # Startseiten-Sektionen
│   │   ├── cards/              # PostCard, EventCard, BoardMemberCard
│   │   ├── gallery/{AlbumCard.astro,Masonry.astro,Lightbox.tsx}
│   │   └── forms/ContactForm.tsx
│   ├── layouts/Base.astro      # lang="de", Fonts, OG-Defaults
│   ├── pages/
│   │   ├── index.astro
│   │   ├── aktuelles/[slug].astro
│   │   ├── termine/index.astro
│   │   ├── galerie/{index.astro,[slug].astro}
│   │   ├── kontakt.astro
│   │   ├── impressum.astro
│   │   ├── datenschutz.astro
│   │   ├── 404.astro
│   │   └── robots.txt.ts
│   ├── styles/{tokens.css,global.css}
│   └── types/storyblok.d.ts    # generated by `storyblok types generate`
├── worker/                     # Worker-Code im SELBEN Worker wie Static Assets
│   └── index.ts                # Routet /api/* zur Logik, alles andere → Assets
└── docs/redesign-plan.md       # dieser Plan
```

**Styling:** Plain CSS mit CSS-Custom-Properties (Tokens) + Astro Scoped Styles. Kein Tailwind — die Designsprache hat klare Tokens aus dem Handoff, Tailwind würde nur Overhead bringen.

**Interaktive Inseln** (`client:load`/`client:visible`):
- `Nav`-Burger: pure CSS (`<input type="checkbox">` + Sibling-Selector), nur `<script>` zum Schließen bei Klick auf Link
- `Lightbox.tsx` (React-Insel, weil Tastatur-Listener + Index-State + Fokus-Trap)
- `ContactForm.tsx` (React-Insel, weil Live-Validierung + Turnstile-Widget + Submit-State)

**Astro-Konfiguration (Eckpunkte):**
- `output: 'static'`
- `site: 'https://mv-gamshurst.de'` (für sitemap.xml)
- `image: { service: passthroughImageService(), domains: ['a.storyblok.com'] }` — Storyblok transformiert via URL-Parameter, Astro generiert nur `srcset`-Attribute, **keine Doppel-Transformation**
- `prefetch: { defaultStrategy: 'viewport' }` — leichte Performance ohne View-Transitions-Overhead
- Integrations: `@astrojs/react`, `@astrojs/sitemap`, `@storyblok/astro`

---

## Routing

| Pfad | Quelle | Anmerkung |
|---|---|---|
| `/` | `home` Story + Aggregate (3 neueste Posts, kommende Events …) | Build-Time SSG |
| `/aktuelles/[slug]` | `post` Stories | Build-Time, `getStaticPaths` |
| `/termine` | alle `event` Stories | Build-Time, gefiltert auf `endDate >= today` |
| `/galerie` | alle `album` Stories | Album-Listing + „Alle Fotos"-Masonry |
| `/galerie/[slug]` | `album` Story | Detail-Album mit Lightbox |
| `/kontakt` | statisch + `siteSettings` | Formular submittet an `/api/contact` |
| `/impressum` | `impressum` Story | Hoster: Cloudflare, Inc. |
| `/datenschutz` | `datenschutz` Story | TOC clientseitig aus Headings |
| `/404` | statisch | |
| `/api/contact` | Worker-Route | POST-Only |
| `/sitemap-index.xml` | `@astrojs/sitemap` | |
| `/robots.txt` | `robots.txt.ts` | verlinkt Sitemap |

---

## Design-Umsetzung

- **Tokens** aus Handoff §9 als CSS-Variablen in `src/styles/tokens.css`.
- **Fonts**: `Bricolage Grotesque` (700/800) und `Inter` (300–800) per `@fontsource` selbst-gehostete Subsets (DSGVO-konform, kein Google-Fonts-Tracking).
- **Bilder**: alle CMS-Bilder über Storyblok Image Service (`/m/<width>x<height>/filters:format(webp)`). Out-of-the-box Lazy-Loading via `loading="lazy"`. Astro nutzt `passthroughImageService` → kein Doppel-Transform.
- **Responsive**: Hauptbreakpoint 860 px wie im Handoff. `clamp()` für fluide Typografie.
- **Lightbox**: Keyboard (←/→, Esc), zyklischer Index, Fokus-Trap.
- **Mobile-Burger**: CSS-only Toggle, minimales JS nur fürs Schließen beim Link-Klick.
- **Accessibility-Floor:** sichtbarer Focus-Ring auf allen interaktiven Elementen, ARIA-Landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`), `prefers-reduced-motion`-Respekt.

---

## Kontaktformular (Worker-Route)

`worker/index.ts` routet alle `/api/*`-Requests; Static Assets übernehmen den Rest.

**Verantwortlich für:**
- Method-Check (nur POST mit `Content-Type: application/json`)
- Honeypot-Feld (verstecktes Input — muss leer sein)
- Turnstile-Token verifizieren (POST gegen `https://challenges.cloudflare.com/turnstile/v0/siteverify` mit `TURNSTILE_SECRET`)
- Server-Validierung (gleiche Regeln wie clientseitig, Handoff §6)
- Rate-Limit: max 5 Requests/IP/Stunde via Cloudflare KV
- Resend-API-Call (`from: noreply@<versand-domain>`, `to: info@mv-gamshurst.de`, `reply-to: <user-email>`)
- Audit-Log der Einwilligung (Zeitstempel + IP-Hash) → optional in KV, nur 90 Tage

**Secrets via Wrangler:** `RESEND_API_KEY`, `TURNSTILE_SECRET`, `STORYBLOK_WEBHOOK_SECRET`.
**Public Var:** `TURNSTILE_SITE_KEY` (im Build über `astro.config.mjs` → Frontend).

---

## DNS / Deploy / Domain

**Setup-Schritte (einmalig, manuelle Bestätigung nötig):**

1. **Cloudflare-Account** anlegen (kostenlos), Wrangler CLI installieren.
2. **GitHub-Repo** privat anlegen, Astro-Projekt pushen.
3. **Worker anlegen** über Cloudflare-Dashboard mit GitHub-Verbindung (Workers Builds) → Auto-Build on push. Build-Command `npm run build`, Output `dist/`.
4. **KV-Namespace** für Rate-Limit anlegen, in `wrangler.jsonc` binden.
5. **Storyblok-Space** anlegen (Community-Plan), Schema bauen, Beispielinhalte anlegen, Webhook auf den Deploy-Hook der Workers Builds setzen (mit Secret).
6. **Custom Domain** `mv-gamshurst.de` als Worker-Route eintragen.
7. **DNS bei do.de anpassen** — **der einzige für Mail riskante Schritt**:
   - `A` / `AAAA` / `CNAME` für `mv-gamshurst.de` und `www` → CF-Worker-Endpoints.
   - **MX-Records unverändert lassen** → Mail läuft weiter über do.de.
   - **TXT (SPF/DKIM)** für vorhandene Mail unverändert lassen.
   - Resend-Versand: erst Resend-Sandbox-Domain für Tests, später eigene Versand-Subdomain `mail.mv-gamshurst.de` mit eigenen SPF/DKIM-TXT (kollidiert nicht mit Empfangs-MX).
8. **Cloudflare Turnstile Site** anlegen (gratis), Site-Key in Build-Env, Secret in Worker-Secrets.

---

## Implementierungs-Phasen — Claude-Code-Orchestrierung

**Pro-Phase-Loop (verbindlich):**

```
implementieren → verifizieren → /review → fixes → /commit
```

- **Review-Skill:** `superpowers:requesting-code-review` oder `/review` (code-reviewer-Agent)
- **Fix-Schritt:** Findings einarbeiten, Verifikation erneut laufen lassen
- **Commit:** Conventional Commits, **nur Subject-Zeile**, **kein Body**, **kein Co-Author-Footer**. Schema:
  ```
  <type>(<scope>): <imperative subject>
  ```
  Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `perf`, `test`. Scope optional.

Phasen sind klein und atomar gehalten — jede ist eigenständig review- und commit-bar. Phase 0–10 sind Code/CMS; Phase 11 ist Ops und triggert keinen Repo-Commit.

---

### Phase 0 — Repo-Bootstrap & Tooling
**Deliverables:**
- `npm create astro@latest .` (Template: minimal, TypeScript: strict, Git: skip)
- `tsconfig.json` mit `extends: "astro/tsconfigs/strict"`
- `wrangler.jsonc` mit `assets.directory = "./dist"`, KV-Binding Platzhalter
- `package.json` Scripts: `dev`, `build`, `preview`, `deploy` (= `wrangler deploy`), `types:storyblok`
- `.gitignore`, `.editorconfig`, `.nvmrc` (Node LTS)
- `.env.example` mit `STORYBLOK_DELIVERY_TOKEN`, `STORYBLOK_VERSION=published`, `TURNSTILE_SITE_KEY`, `SITE_URL`
- `README.md` mit Quickstart (Dev-Befehle, ENV-Setup)

**Verifikation:** `npm run dev` zeigt Astro-Default-Seite; `npm run build` produziert `dist/`; `npx wrangler dev` serviert dist/.

**Commit:** `chore: bootstrap astro project with wrangler`

---

### Phase 1 — Design-Tokens, Fonts, Base-Layout
**Deliverables:**
- `src/styles/tokens.css` (komplette Token-Liste aus Handoff §9)
- `src/styles/global.css` (Reset, Typo-Defaults, `prefers-reduced-motion`)
- `@fontsource/bricolage-grotesque` + `@fontsource/inter` (nur benötigte Weights/Subsets)
- `src/layouts/Base.astro` mit `lang="de"`, `<meta viewport>`, OG-Defaults, Favicon, Fonts-Import
- `public/assets/logo-light.svg` aus Handoff einbinden
- Test-Seite `src/pages/index.astro` zeigt Tokens visuell (Color-Swatches, Typo-Demo)

**Verifikation:** Index-Seite zeigt korrekte Farben, Fonts laden ohne CLS, kein externer Google-Fonts-Request.

**Commit:** `chore: add design tokens, fonts, and base layout`

---

### Phase 2 — Nav + Footer (statisch, ohne CMS)
**Deliverables:**
- `src/components/layout/Nav.astro` — Sticky-Pille, CSS-only Burger
- `src/components/layout/Footer.astro` mit Platzhaltern (CMS folgt Phase 3)
- In `Base.astro` integriert
- A11y: ARIA-Landmarks, sichtbarer Focus

**Verifikation:** Lokale Seite zeigt Nav + Footer; Burger toggelt < 860 px; Tastaturnavigation funktioniert.

**Commit:** `feat: add navigation and footer`

---

### Phase 3 — Storyblok-Integration via Content Layer
**Deliverables:**
- Storyblok-Space anlegen (User-Aktion — Anleitung in `docs/storyblok-setup.md` schreiben)
- Schema in Storyblok-UI bauen anhand der Tabelle oben
- `@storyblok/astro` Loader installieren + konfigurieren
- `src/content.config.ts` mit `storyblokLoader`-Collections für `post`, `event`, `boardMember`, `album`, `home`, `siteSettings`, `impressum`, `datenschutz`
- `storyblok types generate` Script + Generated-Types committen
- `src/lib/storyblok.ts` Helper (`imgUrl(asset, width, height)`, `renderRichText`)
- Erstes End-to-End: `Footer.astro` liest `siteSettings` über `getEntry`/`getCollection`

**Verifikation:** Footer zeigt echte Vereinsdaten aus Storyblok; `getEntry('siteSettings', 'global')` returnt Daten; TS-Types sind strict-konform.

**Commit:** `feat: integrate storyblok content layer loader`

---

### Phase 4 — Startseite: Hero, Aktuelles-Teaser, Termine-Preview
**Deliverables:**
- `src/components/sections/Hero.astro`
- `src/components/sections/Aktuelles.astro` (3 neueste Posts via Collection-Query)
- `src/components/sections/Termine.astro` (kommende Events, Monatsgruppierung)
- `src/lib/formatters.ts` — Datum `de-DE`, `groupEventsByMonth`
- `src/components/cards/PostCard.astro`, `EventCard.astro`
- Eingebunden in `src/pages/index.astro`

**Verifikation:** Lokal sind 3 Sektionen mit echten Storyblok-Daten sichtbar; Monatsgruppierung korrekt; Event-Filterung `endDate >= today` funktioniert.

**Commit:** `feat: render homepage hero, news, and events sections`

---

### Phase 5 — Startseite: Verein, Vorstand, Galerie-Teaser
**Deliverables:**
- `src/components/sections/DasSindWir.astro`
- `src/components/sections/Vorstand.astro` (sortiert nach `sortOrder`)
- `src/components/sections/GalerieTeaser.astro` (3 `featured` Alben)
- `src/components/cards/BoardMemberCard.astro`

**Verifikation:** Startseite ist vollständig CMS-getrieben; alle 6 Sektionen rendern; mobile Stacking korrekt.

**Commit:** `feat: render homepage about, board, and gallery sections`

---

### Phase 6 — Bildergalerie
**Deliverables:**
- `src/pages/galerie/index.astro` — Album-Listing + „Alle Fotos"-Masonry-Block
- `src/pages/galerie/[slug].astro` — Album-Detail
- `src/components/gallery/AlbumCard.astro`
- `src/components/gallery/Masonry.astro` (CSS Grid mit `grid-auto-flow: dense`)
- `src/components/gallery/Lightbox.tsx` (React-Insel, `client:visible`)
- Storyblok Image-CDN URLs direkt für `srcset`
- `astro.config.mjs`: `passthroughImageService()`, `domains: ['a.storyblok.com']`

**Verifikation:** Album-Detail zeigt alle Fotos; Lightbox: ←/→/Esc funktionieren, Fokus-Trap aktiv, kein Doppel-Transform der Bilder (Network-Tab: nur Storyblok-URLs).

**Commit:** `feat: add gallery with lightbox`

---

### Phase 7 — Aktuelles-Detail
**Deliverables:**
- `src/pages/aktuelles/[slug].astro` mit Richtext-Render
- `getStaticPaths` aus `post`-Collection
- Layout-Erweiterung sinngemäß aus Featured-Block (siehe Handoff §10.1)
- Vorheriger/Nächster-Post-Navigation am Ende

**Verifikation:** Jeder Post hat eigene URL, Richtext rendert (Listen, Links, Bilder), Cover-Image als OG-Tag.

**Commit:** `feat: add news article detail page`

---

### Phase 8 — Kontaktformular + Worker-Endpoint
**Deliverables:**
- `src/pages/kontakt.astro` — statisches Layout + Form-Insel
- `src/components/forms/ContactForm.tsx` — clientseitige Validierung, Turnstile-Widget einbinden (`@marsidev/react-turnstile` oder vanilla Embed), Success/Error-States
- `worker/index.ts` — Routing-Logik: `/api/contact` → Handler, sonst Assets
- `worker/handlers/contact.ts` — Method-Check, Honeypot, Turnstile-Siteverify, Schema-Validierung, KV-Rate-Limit, Resend-Call
- `src/lib/turnstile.ts` — Siteverify-Wrapper
- `wrangler.jsonc` aktualisieren: KV-Binding aktiv, Secrets-Doku (`wrangler secret put`)
- Lokale Dev-Story: `wrangler dev` für Worker, separate Storyblok-Sandbox-Token

**Verifikation:** Submit mit gültigen Daten → Mail in Inbox; Honeypot-Submit blockiert; ungültiger Turnstile-Token blockiert; 6. Submit von gleicher IP innerhalb Stunde blockiert.

**Commit:** `feat: add contact form with turnstile and resend`

---

### Phase 9 — Rechtstexte
**Deliverables:**
- `src/pages/impressum.astro` (Story `impressum`)
- `src/pages/datenschutz.astro` (Story `datenschutz`, mit TOC-Generierung aus Headings)
- Gelber Hinweis-Banner-Component, der bei `isPlaceholder=true` (Flag in Story) erscheint
- Hinweis im `docs/storyblok-setup.md`: **Hoster ist jetzt Cloudflare, Inc.** — alter do.de-Eintrag MUSS ersetzt werden

**Verifikation:** Beide Seiten rendern aus CMS; TOC scrollt korrekt; Banner sichtbar solange `isPlaceholder=true`.

**Commit:** `feat: add legal pages with placeholder banner`

---

### Phase 10 — SEO + Polish
**Deliverables:**
- `@astrojs/sitemap` Integration
- `src/pages/robots.txt.ts` — Allow-All + Sitemap-Verweis
- `src/pages/404.astro` — passend zum Design
- OG-Tags pro Seite (Title, Description, Image)
- `astro.config.mjs`: `prefetch` enabled
- Lighthouse-Run (Performance/A11y/SEO ≥ 95, Best Practices ≥ 90); Fixes
- `astro check` ohne Fehler

**Verifikation:** `dist/sitemap-index.xml` existiert nach Build; Lighthouse-Score erreicht; `astro check` grün; 404 sieht designkonform aus.

**Commit:** `chore: add sitemap, robots, 404, and seo polish`

---

### Phase 11 — DNS-Switch (Ops, kein Repo-Commit)
**Schritte:**
1. Erst **Subdomain** `neu.mv-gamshurst.de` aufschalten (Wrangler Route + DNS-CNAME bei do.de).
2. Komplett-Smoke-Test: alle Seiten, Kontaktformular, Mail-Empfang.
3. Versand-Domain final: entweder Resend-Sandbox akzeptieren oder `mail.mv-gamshurst.de` mit SPF/DKIM aufsetzen.
4. **Mail-Sanity-Check VOR Cutover:** Test-Mail von extern an `info@mv-gamshurst.de` → kommt an.
5. **Cutover:** A/AAAA/CNAME für Apex und `www` umlegen. MX/TXT unverändert.
6. **Post-Cutover-Check:** erneute Test-Mail von extern → kommt an. Wenn nicht: sofort DNS rollback.
7. Alten WordPress bei do.de deaktivieren (nicht löschen) für 30 Tage.

Kein Commit — Infrastruktur-Aktion.

---

## Offene Punkte / Risiken

1. **Storyblok 1-User-Limit** — geteilter Login als Default. Falls Multi-User-Bedarf entsteht: Migration zu Sanity oder Bezahltarif. Aufwand überschaubar, da Astro CMS-agnostisch ist (Loader austauschbar).
2. **Rechtstexte (Impressum/Datenschutz)** — Platzhalter im Handoff. **Du musst echte Inhalte einpflegen und rechtlich prüfen lassen.** Hoster-Wechsel zu Cloudflare gehört zwingend ins Impressum. Ich liefere die Strukturvorlage, nicht den juristischen Inhalt.
3. **Resend Versand-Domain** — langfristig eigene Subdomain `mail.mv-gamshurst.de` mit SPF/DKIM/DMARC für saubere Zustellbarkeit. Initial OK via Resend-Sandbox.
4. **Logo-Variante für helle Flächen fehlt** (Handoff §11). Wenn kein dunkles Logo nachgeliefert wird: weißes Logo auf hellem Grund vermeiden (Layout-Constraint).
5. **Storyblok Loader-Alpha-Status** — `@storyblok/astro` Content Layer Loader ist alpha. Version in `package.json` pinnen, Lockfile committen. Fallback: notfalls auf direkten SDK-Fetch wechselbar (Schema bleibt gleich).
6. **Webhook-Sicherheit** — Storyblok signiert Webhooks; Build-Trigger muss Secret verifizieren, sonst kann jeder die CF-Builds triggern (DoS-Vektor, Kosten irrelevant, aber Lärm).
7. **„Gesamtkalender" / iCal-Export** — Handoff: „kann später". Nicht in Phase 1–10.

---

## Verifikation (End-to-end)

1. **Lokal:** `npm run dev` → alle Seiten laden mit Storyblok-Inhalt, Lightbox funktioniert, Kontakt-Validierung clientseitig korrekt.
2. **Preview-Deploy:** PR → Workers Build erstellt Preview-URL → Seite lädt, Bilder aus Storyblok-CDN, Worker-Endpoints erreichbar.
3. **Content-Cycle:** in Storyblok neuen Post anlegen → „Veröffentlichen" → Webhook → Workers Build → neuer Post auf `/` in ≤ 60 s.
4. **Kontaktformular:** Submit auf Preview → Mail bei `info@mv-gamshurst.de`. Honeypot-Submit blockiert. Ungültiger Turnstile-Token blockiert. 6. Submit/IP/Stunde blockiert.
5. **Lighthouse** auf `/` und `/galerie` → Performance/A11y/SEO ≥ 95, Best Practices ≥ 90.
6. **Mobile** (DevTools-Emulation oder echtes Gerät): Burger funktioniert, Sektionen stapeln korrekt < 860 px.
7. **Mail-Sanity-Check nach DNS-Switch:** Testmail extern → `info@mv-gamshurst.de` kommt an (MX intakt).
8. **`astro check`** grün, keine TS-Errors, keine ungenutzten Storyblok-Felder.

---

## Was dieser Plan NICHT enthält (bewusst)

- Mehrsprachigkeit — Handoff §12: nicht erforderlich.
- Storyblok Visual Editor / Preview Mode — Tabellen-Modus reicht.
- Suche, Kommentare, User-Accounts — nicht im Scope.
- Mitgliederbereich / interne Dokumente — nicht im Scope.
- Automatischer WordPress-Datenexport — Benutzer hat „Neuanfang" gewählt.
- Analytics — kann später ergänzt werden (Empfehlung: Cloudflare Web Analytics, kostenlos, ohne Cookies).
- Server Islands / View Transitions / SSR — vollständig statisch reicht und ist performanter.

---

## Nächste Aktion nach Plan-Approval

**Phase 0 starten:** Repo-Bootstrap. Astro initialisieren, Wrangler-Config, TS-strict, `.env.example`. Loop ausführen: implementieren → `npm run build` & `wrangler dev` verifizieren → `/review` → Fixes → Commit `chore: bootstrap astro project with wrangler`.

Danach Phase 1 lückenlos. Storyblok-Account-Anlegen ist Teil von Phase 3 und braucht einen Sync-Punkt mit dir (User-Account-Anlage + Schema-Klick).
