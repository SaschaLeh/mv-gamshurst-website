# Deployment — Cloudflare Workers Setup

Schritt-für-Schritt für den ersten Live-Deploy. Macht der Repo-Maintainer **einmal**.

## Voraussetzungen

- Cloudflare-Account (kostenlos): <https://dash.cloudflare.com/sign-up>
- Resend-Account (kostenlos, 3000 Mails/Monat): <https://resend.com/signup>
- Wrangler CLI installiert (im Repo bereits als devDep, also: `npx wrangler ...`)
- Storyblok ist eingerichtet (siehe [storyblok-setup.md](./storyblok-setup.md))

## 1. Wrangler authentifizieren

```bash
npx wrangler login
```

Browser öffnet sich, OAuth → fertig.

## 2. KV-Namespace anlegen (Rate-Limit + DSGVO-Consent-Log)

> ⚠️ **Kritisch.** Ohne KV-Binding läuft `/api/contact` ohne Rate-Limit (ein Bot könnte das Resend-Quota leerziehen) UND ohne DSGVO-Einwilligungs-Log (Art. 7(1) verlangt Nachweisbarkeit). Beides darf NICHT in Production fehlen.


```bash
npx wrangler kv namespace create RATE_LIMIT
npx wrangler kv namespace create RATE_LIMIT --preview
```

Beide Befehle geben jeweils eine ID aus (z. B. `id = "abc123..."`).
Diese IDs in `wrangler.jsonc` eintragen:

```jsonc
"kv_namespaces": [
  {
    "binding": "RATE_LIMIT",
    "id": "<aus dem ersten Befehl>",
    "preview_id": "<aus dem zweiten Befehl>"
  }
]
```

## 3. Cloudflare Turnstile einrichten

1. <https://dash.cloudflare.com> → **Turnstile** im Sidebar.
2. **Add Site**: Name `mv-gamshurst`, Domain `mv-gamshurst.de` (kannst `localhost` für Dev erlauben).
3. Widget Mode: **Managed** (Cloudflare entscheidet automatisch wann Challenge erscheint).
4. Anlegen → 2 Keys werden generiert:
   - **Site Key** (öffentlich) → `PUBLIC_TURNSTILE_SITE_KEY` in Astro `.env`
   - **Secret Key** (geheim) → siehe Schritt 5

## 4. Resend einrichten

1. Resend-Account anlegen.
2. **API Keys** → **Create API Key**, Name `mv-gamshurst-worker`.
3. **Domain hinzufügen** (langfristig: `mail.mv-gamshurst.de`, kurzfristig: Resend-Sandbox `onboarding@resend.dev`).
4. Für eigene Domain: SPF + DKIM TXT-Records bei do.de eintragen, dann in Resend „Verify".

## 5. Secrets im Worker setzen

```bash
npx wrangler secret put RESEND_API_KEY
# Prompt: API-Key aus Resend einfügen

npx wrangler secret put TURNSTILE_SECRET
# Prompt: Secret-Key aus Turnstile einfügen

npx wrangler secret put STORYBLOK_DELIVERY_TOKEN
# Prompt: Storyblok Public-Token (NICHT Preview!) — für Production-Builds
```

> Secrets sind nach `wrangler deploy` verfügbar. Lokal werden sie aus `.dev.vars` gelesen.

## 6. Custom Domain einrichten

In Cloudflare Dashboard → **Workers & Pages** → `mv-gamshurst` Worker:
- **Settings → Triggers → Add Custom Domain**: `mv-gamshurst.de` + `www.mv-gamshurst.de`.

Cloudflare zeigt, welche DNS-Records bei do.de gesetzt werden müssen (CNAME oder A).

> ⚠️ **MX-Records bei do.de NICHT anfassen** — Mail bleibt do.de.

## 7. GitHub-Repo mit Workers Builds verknüpfen

In Cloudflare Dashboard → Worker → **Settings → Builds → Connect to GitHub**:
- Repo wählen, Branch `main`.
- Build-Command: `npm run build`.
- Output: `dist/`.

Bei jedem Push auf `main` → automatischer Deploy.

## 8. Storyblok-Webhook für Auto-Rebuild

In Cloudflare Worker-Settings → **Build Hooks** → **Create**, URL kopieren.
In Storyblok: **Settings → Webhooks** → URL eintragen, Events: `story.published`, `story.unpublished`.

## 9. Erstmaliger Manual-Deploy

```bash
npm run build
npx wrangler deploy
```

Worker ist live unter der workers.dev-URL und nach DNS-Switch auch unter mv-gamshurst.de.

## 10. Smoke-Test

- Startseite lädt? Mail-Empfang noch bei do.de? Kontaktformular funktioniert?
- Test-Submit auf Live-Site → Mail bei `info@mv-gamshurst.de` angekommen?
- Honeypot: per DevTools verstecktes Feld füllen → Submit muss 400 zurückgeben.
- Rate-Limit: 6 schnelle Submits → 6. muss 429 sein.

## 11. Lokale Entwicklung (für mich, den Maintainer)

```bash
cp .dev.vars.example .dev.vars
# Werte ergänzen (TURNSTILE_SECRET = Test-Secret, RESEND leer für Dev)

npm run build         # erst Astro-Build
npm run wrangler:dev  # Worker + Static Assets aus dist/

# Kontaktformular testen auf http://localhost:8787/kontakt
```

`npm run dev` (Astro Dev) ist für Astro-Komponenten-Iteration; der Worker
läuft dort NICHT — Kontaktformular schlägt deshalb fehl unter :4321.
