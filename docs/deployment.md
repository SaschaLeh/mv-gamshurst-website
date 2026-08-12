# Deployment — Cloudflare Workers Setup

Schritt-für-Schritt für den ersten Live-Deploy. Macht der Repo-Maintainer **einmal**.

## Phasen-Überblick

In drei klar getrennten Etappen — jede mit eigenem Risikoprofil. Nicht in eine durchziehen.

| Phase | Schritte | Inhalt | Wann starten? |
|---|---|---|---|
| **A — Smoke-Test** | 1–7 | Worker läuft auf `*.workers.dev` mit allen Integrationen (Storyblok, Turnstile, Resend). | Sofort. Iterativ. |
| **B — Custom Domain** | 8–9 | CF wird DNS-Anbieter, `next.mv-gamshurst.de` auf Worker, später Apex. Mail bleibt do.de. | Wenn A grün ist. |
| **C — Auto-Deploy** | 10–11 | GitHub Actions baut + deployed bei Push. Storyblok-Webhook triggert Rebuild. | Wenn B grün ist und Redaktion losgeht. |

## Voraussetzungen

- Cloudflare-Account (kostenlos): <https://dash.cloudflare.com/sign-up>
- Resend-Account (kostenlos, 3000 Mails/Monat): <https://resend.com/signup>
- Wrangler CLI installiert (im Repo bereits als devDep, also: `npx wrangler ...`)
- Storyblok ist eingerichtet (siehe [storyblok-setup.md](./storyblok-setup.md))

---

# Phase A — Smoke-Test

Ziel: Worker läuft auf einer `*.workers.dev`-URL, alle Integrationen funktionieren. Keine eigene Domain, kein DNS-Risiko.

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

1. Cloudflare Dashboard öffnen → linke Sidebar **Application security** → **Turnstile**.
   Direktlink: `https://dash.cloudflare.com/<account-id>/turnstile` (Account-ID aus der URL nach Login).
2. **Add Site**: Name `mv-gamshurst`, Domains: `mv-gamshurst.de`, `www.mv-gamshurst.de`, zusätzlich `localhost` und `127.0.0.1` für Dev.
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

## 6. Erstmaliger manueller Deploy

```bash
npm run build
npx wrangler deploy
```

Konsole gibt die `*.workers.dev`-URL aus, z. B. `https://mv-gamshurst.<account-subdomain>.workers.dev`.
Diese URL ist sofort erreichbar (HTTPS automatisch).

## 7. Smoke-Test auf `*.workers.dev`

Gegen die workers.dev-URL durchgehen:

- Startseite lädt? Storyblok-Inhalte sind da?
- `/aktuelles`, `/galerie`, `/kontakt` rendern?
- Kontaktformular submit → Mail in der Resend-konfigurierten Inbox?
- Honeypot: per DevTools verstecktes Feld füllen → Submit muss 400 zurückgeben.
- Rate-Limit: 6 schnelle Submits → 6. muss 429 sein.
- Lighthouse-Run auf `/` und `/galerie` (Performance/A11y/SEO ≥ 95).

Wenn alles grün: **Phase A abgeschlossen.**
Iterations-Loop bleibt: lokal `npm run build && npx wrangler deploy`.

---

# Phase B — Custom Domain

Ziel: `next.mv-gamshurst.de` zeigt auf den Worker, alles andere (Apex, Mail) bleibt unverändert bei do.de.

## 8. Domain in Cloudflare onboarden (Zone anlegen)

Workers Custom Domains brauchen die Zone in CF. Das geht auf dem Free-Plan nur zonen-weit (= Apex + alle Subdomains). **Das ändert aber nichts an den Zielen** — CF importiert alle bestehenden Records bei do.de und beantwortet DNS-Anfragen identisch, bis du explizit einen Record umlegst.

1. **In CF Account-Home** (NICHT im Worker!) → linke Sidebar **Domains** → **„+ Add" / „Connect a domain"**.
2. Domain: `mv-gamshurst.de`. Plan: **Free**.
3. CF scannt deine Records bei do.de und zeigt eine Import-Liste + zwei Nameserver (z. B. `xxx.ns.cloudflare.com` / `yyy.ns.cloudflare.com`).
4. **STOPP — vor dem Nameserver-Switch bei do.de:** in CF unter `mv-gamshurst.de` → **DNS** alle importierten Records prüfen.

### Mail-Record-Checkliste (Pflicht vor Nameserver-Switch)

| Record | Was du suchst | Konsequenz wenn fehlt |
|---|---|---|
| **MX** | Zeigt auf do.de-Mailserver (z. B. `mx-ha01.do.de`) | Mail-Empfang bricht |
| **TXT (SPF)** | beginnt mit `v=spf1`, enthält do.de | Mails aus Verein werden als Spam markiert |
| **TXT (DKIM)** | unter `*._domainkey.…` | Mails aus Verein werden als Spam markiert |
| **TXT (DMARC)** | unter `_dmarc.…` (falls do.de eins gesetzt hat) | DMARC-Policy weg |
| **SRV (`_imap`, `_submission`)** | Autodiscover-Records (Outlook) | Outlook findet Mailserver nicht mehr automatisch |

Fehlende Records **manuell in CF nachpflegen**, BEVOR du die Nameserver bei do.de umlegst. CF-Scan ist nicht zu 100 % verlässlich.

5. **Sanity-Check direkt vor Switch:** Test-Mail von extern an `info@mv-gamshurst.de` → kommt an? (= aktueller Zustand stimmt)
6. **Bei do.de** im Domain-Verwaltungs-Panel: Nameserver für `mv-gamshurst.de` auf die zwei CF-Nameserver umstellen. **NICHT** einzelne A/CNAME-Records umbiegen.
7. Warten bis CF die Zone als **„Active"** markiert (5 Min – 2 Std).
8. **Sanity-Check direkt nach Switch:** zweite Test-Mail von extern → kommt an?
   - Wenn nein: bei do.de Nameserver sofort zurückstellen (Rollback dauert auch wieder bis zu 2 Std).
   - Wenn ja: weiter zu Schritt 9.

> ⚠️ **Registrar bleibt do.de.** Du wechselst nur den DNS-Anbieter, nicht den Domain-Besitzer. Domain-Vertrag bei do.de unverändert.

## 9. Custom Domain am Worker anhängen

Erst die Test-Subdomain, später der Apex.

In Cloudflare Dashboard → **Workers & Pages** → `mv-gamshurst` Worker → **Domains-Tab** (in der oberen Tab-Leiste, zwischen `Observability` und `Settings`) → **„Connect domain"**:

1. **Phase B.1 — Test-Subdomain:** `next.mv-gamshurst.de` eintragen.
   - CF legt automatisch den passenden DNS-Record an (kein Eingriff bei do.de nötig — die Zone liegt jetzt ja in CF).
   - Smoke-Test auf `https://next.mv-gamshurst.de` wiederholen (siehe Schritt 7).
   - Mail-Sanity-Check: extern an `info@mv-gamshurst.de` → kommt an?
2. **Phase B.2 — Apex-Cutover (eigener Schritt, eigener Tag):**
   - `mv-gamshurst.de` und `www.mv-gamshurst.de` als zusätzliche Custom Domains am Worker eintragen.
   - WordPress @ do.de bleibt im Hintergrund 30 Tage aktiv (nicht löschen) als Rollback-Option.
   - Erneut Mail-Sanity-Check.

> Hinweis: Der frühere Pfad **Settings → Triggers → Custom Domain** existiert nicht mehr. „Trigger events" unter Settings ist nur für Cron Jobs / Queues.

> ⚠️ **MX-Records und Mail-TXT (SPF/DKIM) in CF-DNS NICHT anfassen** — Mail bleibt do.de.

---

# Phase C — Auto-Deploy (optional)

Bis hierher deployst du manuell mit `wrangler deploy`. Für laufenden Redaktionsbetrieb soll jeder Push auf `main` und jede Storyblok-Veröffentlichung automatisch live gehen.

> **Hintergrund:** Workers Builds (CF's eigene CI mit GitHub-Verknüpfung im Worker-UI) funktioniert für diesen Worker nicht — Workers, die ursprünglich via `wrangler deploy` deployed wurden, lassen sich nachträglich nicht zuverlässig auf Workers Builds umstellen. Daher GitHub Actions als CI.

## 10. Auto-Deploy via GitHub Actions

Workflow-File anlegen:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
  repository_dispatch:
    types: [storyblok-publish]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          STORYBLOK_DELIVERY_TOKEN: ${{ secrets.STORYBLOK_DELIVERY_TOKEN }}
          STORYBLOK_VERSION: published
          PUBLIC_TURNSTILE_SITE_KEY: ${{ secrets.PUBLIC_TURNSTILE_SITE_KEY }}
          SITE_URL: https://mv-gamshurst.de
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**GitHub Repo Secrets setzen** (Settings → Secrets and variables → Actions → New repository secret):

| Secret | Wert | Wo herbekommen? |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | API-Token mit Worker-Deploy-Permissions | dash.cloudflare.com → My Profile → API Tokens → „Create Token" → Template **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | Account-ID | dash.cloudflare.com → rechte Sidebar oder URL |
| `STORYBLOK_DELIVERY_TOKEN` | Storyblok Public-Token (NICHT Preview!) | Storyblok-Space → Settings → Access Tokens |
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile Site Key | Schritt 3 |

`wrangler deploy` lokal funktioniert weiter als Notfall-Pfad — sinnvoll für Hotfixes wenn die CI mal hängt.

## 11. Storyblok-Webhook (Auto-Rebuild bei Veröffentlichung)

Storyblok's Webhook-Format passt nicht direkt auf GitHub's `repository_dispatch`-Endpoint. Drei Optionen, von simpel zu solide:

### Option 1 — Pragmatisch: kein Webhook

Du klickst nach jeder Veröffentlichung in GitHub Actions auf „Run workflow" (`workflow_dispatch`). Für 1–2 Posts pro Woche absolut tragbar, null Setup-Aufwand.

### Option 2 — Sauber: Worker-Route als Übersetzer

Neue Route `/api/webhook/storyblok` im Worker, die:
1. Storyblok-Signatur via `STORYBLOK_WEBHOOK_SECRET` prüft (Storyblok signiert mit HMAC-SHA1)
2. POST gegen GitHub-API `repos/<owner>/<repo>/dispatches` schickt mit `{"event_type":"storyblok-publish"}`

Setup:
- Storyblok: **Settings → Webhooks** → URL `https://mv-gamshurst.de/api/webhook/storyblok`, Events: `story.published`, `story.unpublished`, Secret setzen.
- Worker: `STORYBLOK_WEBHOOK_SECRET` und `GITHUB_DISPATCH_TOKEN` (fine-grained PAT mit `Actions: write` auf Repo) als Secrets.
- GitHub Actions Workflow oben hat schon `repository_dispatch: types: [storyblok-publish]` als Trigger.

### Option 3 — Hosted: Service wie n8n / Pipedream

Wenn du keinen eigenen Übersetzungs-Code im Worker willst. Storyblok → Service → GitHub. Erzeugt aber externes Abhängigkeit und potentiell Kosten.

**Empfehlung:** Start mit Option 1. Wechsel auf Option 2 wenn der manuelle Klick zur Last wird.

---

# Anhang — Lokale Entwicklung

Für den Maintainer.

```bash
cp .dev.vars.example .dev.vars
# Werte ergänzen (TURNSTILE_SECRET = Test-Secret, RESEND leer für Dev)

npm run build         # erst Astro-Build
npm run wrangler:dev  # Worker + Static Assets aus dist/

# Kontaktformular testen auf http://localhost:8787/kontakt
```

`npm run dev` (Astro Dev) ist für Astro-Komponenten-Iteration; der Worker
läuft dort NICHT — Kontaktformular schlägt deshalb fehl unter :4321.
