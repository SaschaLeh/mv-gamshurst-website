# MV Gamshurst — Vereinswebsite

Astro 5 (SSG) + Storyblok (CMS) + Cloudflare Workers (Static Assets + `/api/contact`).
Vollständiger Plan: [docs/redesign-plan.md](docs/redesign-plan.md).

## Quickstart

```bash
nvm use            # Node 22 LTS
npm install
cp .env.example .env   # Werte ergänzen, sobald Phase 3+ relevant
npm run dev            # http://localhost:4321
```

## Scripts

| Befehl | Zweck |
|---|---|
| `npm run dev` | Astro Dev-Server (Hot Reload) |
| `npm run build` | Statischer Build nach `dist/` |
| `npm run preview` | Astro-Preview des Build |
| `npm run check` | `astro check` (TypeScript + Astro) |
| `npm run wrangler:dev` | Wrangler Dev (Workers Static Assets aus `dist/`) |
| `npm run deploy` | Deploy zu Cloudflare Workers (`wrangler deploy`) |
| `npm run types:storyblok` | Storyblok-Schema → TS-Types (ab Phase 3) |

## Phasen-Status

- [x] **Phase 0** — Repo-Bootstrap & Tooling
- [ ] Phase 1 — Design-Tokens, Fonts, Base-Layout
- [ ] Phase 2 — Nav + Footer
- [ ] Phase 3 — Storyblok-Integration
- [ ] Phase 4–7 — Startseite, Galerie, Aktuelles-Detail
- [ ] Phase 8 — Kontaktformular + Worker
- [ ] Phase 9 — Rechtstexte
- [ ] Phase 10 — SEO + Polish
- [ ] Phase 11 — DNS-Switch (Ops)

## Verzeichnisstruktur (Soll, siehe Plan §Astro-Projektstruktur)

```
src/         Astro-Quellen (Pages, Components, Layouts, Styles)
public/      Statische Assets (Favicon, Logo)
worker/      Cloudflare Worker (ab Phase 8 — /api/contact)
docs/        Plan + Setup-Anleitungen
design_handoff_mv_gamshurst/   Designreferenz (nicht in dist/)
```

## Voraussetzungen pro Phase

- **Phase 3+:** Storyblok-Space + Delivery-Token
- **Phase 8:** Cloudflare-Account (Turnstile-Keys, KV-Namespace), Resend-Account
- **Phase 11:** DNS-Zugriff bei do.de
