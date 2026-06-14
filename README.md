# MV Gamshurst — Vereinswebsite

Repo für die Website des Musikverein Gamshurst e.V.

Astro 5 (SSG) + Storyblok (CMS) + Cloudflare Workers (Static Assets + `/api/contact`).

## Quickstart

```bash
nvm use            # Node 22 LTS
npm install
cp .env.example .env   # Werte ergänzen
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
| `npm run types:storyblok` | Storyblok-Schema → TS-Types |

## Verzeichnisstruktur

```
src/         Astro-Quellen (Pages, Components, Layouts, Styles)
public/      Statische Assets (Favicon, Logo)
worker/      Cloudflare Worker (/api/contact)
docs/        Setup-Anleitungen
design_handoff_mv_gamshurst/   Designreferenz (nicht in dist/)
```
