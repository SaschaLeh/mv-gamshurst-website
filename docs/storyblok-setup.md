# Storyblok Setup — Schritt für Schritt

Dieses Dokument ist die Anleitung für die einmalige Einrichtung des Storyblok-Spaces für **mv-gamshurst.de**. Du machst das **einmal** vor Phase 3 der Implementierung.

> **Zeitaufwand:** ~60 Minuten (Account + Space + Schema klicken).
> **Voraussetzung:** Keine. Storyblok ist kostenlos im Community-Plan.

---

## 1. Account anlegen

1. Öffne <https://www.storyblok.com/> → **Sign up** (oben rechts).
2. Wähle **Community Plan** (kostenlos, 1 User, 1000 Inhalts-Entries — reicht).
3. Bei der Region-Wahl: **EU (Frankfurt)** wählen → DSGVO-konformer Datenstandort.
4. E-Mail bestätigen, Account ist live.

> **Bekannte Einschränkung:** Community = 1 User. Bedeutet: alle Redakteure teilen sich einen Login. Falls später Multi-User-Audit nötig wird → Migration zu Sanity (3 User frei) oder Bezahltarif.

---

## 2. Space anlegen

1. Im Storyblok-Dashboard auf **Create a new space**.
2. **Name:** `MV Gamshurst`
3. **Server location:** `EU (Frankfurt)` — muss zur Account-Region passen.
4. **Use case:** `Website` auswählen.
5. **Skip the demo content** (wir bauen das Schema selbst).

Nach Anlegen siehst du das leere Dashboard.

---

## 3. Access Tokens beschaffen

**Settings (Zahnrad links) → Access Tokens.**

Es gibt zwei relevante Tokens — beide kopieren und sicher ablegen (Passwortmanager):

| Token | Zweck | Wert in `.env` |
|---|---|---|
| **Preview Token** (Default) | Dev-Build, sieht auch ungesicherte Drafts | `STORYBLOK_DELIVERY_TOKEN` (für lokal) |
| **Public Token** | Production-Build, sieht nur Published | `STORYBLOK_DELIVERY_TOKEN` (in Cloudflare-Worker-Secret) |

**Wichtig:** Die Tokens sind nur _Read_-Tokens und dürfen im Frontend-Bundle landen — sie geben aber Zugriff auf alle Inhalte des Space, also trotzdem nicht öffentlich in Repos committen.

Ergänze die `Space-ID` (siehst du oben links im Dashboard, z. B. `123456`) — wird für `storyblok types generate` gebraucht.

---

## 4. Content-Schema bauen

**Block Library (Würfel-Symbol links) → New Block.**

Lege folgende Komponenten an. Felder genau wie in der Tabelle — Reihenfolge ist egal, Slug bleibt automatisch.

### 4.1 `post` — Aktuelles-Beiträge (Content Type)

> Beim Erstellen: **„Content type"** wählen, nicht „Nestable".

| Feld | Typ | Pflicht | Hinweise |
|---|---|---|---|
| `title` | Text | ✔ | |
| `publishedAt` | Date/Time | ✔ | Sortier-Feld |
| `category` | Single-Option | ✔ | Optionen (Name = Value): `Konzert`, `Verein`, `Fest`, `Festwochenende`, `Brassparty`, `Sonstiges` |
| `excerpt` | Textarea | ✔ | Max-Länge 280 empfohlen |
| `body` | Richtext | ✔ | Headings 2/3, Bold, Italic, Link, Image, Bullet-List zulassen |
| `coverImage` | Asset (Single) | ✔ | Image only |
| `externalLink` | Link | optional | Für Ticket-URLs etc. |

### 4.2 `event` — Termine (Content Type)

| Feld | Typ | Pflicht | Hinweise |
|---|---|---|---|
| `title` | Text | ✔ | |
| `startDate` | Date/Time | ✔ | |
| `endDate` | Date/Time | optional | Für mehrtägige Veranstaltungen |
| `time` | Text | optional | Freitext, z. B. „19:30 Uhr" |
| `location` | Text | optional | |
| `category` | Single-Option | ✔ | Optionen: `Konzert`, `Auftritt`, `Fest`, `Verein`, `Kirchlich`, `Sonstiges` |
| `description` | Textarea | optional | |
| `highlight` | Boolean | optional | Default false; true = Jahreskonzert-Highlight |

### 4.3 `boardMember` — Vorstandschaft (Content Type)

| Feld | Typ | Pflicht | Hinweise |
|---|---|---|---|
| `name` | Text | ✔ | |
| `role` | Text | ✔ | z. B. „1. Vorstandsteam" |
| `instrument` | Text | optional | |
| `photo` | Asset (Single) | optional | Fallback: Silhouette |
| `sortOrder` | Number | ✔ | Aufsteigend sortiert |

### 4.4 `album` — Bildergalerie (Content Type)

| Feld | Typ | Pflicht | Hinweise |
|---|---|---|---|
| `title` | Text | ✔ | |
| `date` | Date | ✔ | |
| `coverImage` | Asset (Single) | ✔ | |
| `photos` | Asset (Multi) | ✔ | Sortierreihenfolge = Reihenfolge im Album |
| `featured` | Boolean | optional | true = im Galerie-Teaser auf Startseite |
| `sortOrder` | Number | ✔ | |

### 4.5 `siteSettings` — Vereinsdaten (Content Type, Singleton)

| Feld | Typ | Pflicht | Hinweise |
|---|---|---|---|
| `vereinName` | Text | ✔ | „Musikverein Gamshurst e.V." |
| `address` | Textarea | ✔ | Mehrzeilig |
| `email` | Text | ✔ | „info@mv-gamshurst.de" |
| `instagramUrl` | Link | optional | |
| `facebookUrl` | Link | optional | |
| `youtubeUrl` | Link | optional | |
| `proben` | Richtext | optional | Probenzeiten (für Kontaktseite) |

### 4.6 `impressum` und `datenschutz` — Rechtstexte (je 1 Content Type)

| Feld | Typ | Pflicht |
|---|---|---|
| `title` | Text | ✔ |
| `body` | Richtext (mit Headings) | ✔ |
| `isPlaceholder` | Boolean | optional |

> ⚠️ **Hoster im Impressum:** Mit dem Wechsel zu Cloudflare Workers ist der Hoster jetzt
> **Cloudflare, Inc.** (101 Townsend Street, San Francisco, CA 94107, USA — siehe Cloudflare-Impressumshilfe).
> Der alte do.de-Eintrag MUSS ersetzt werden, sobald der DNS-Switch live ist (Phase 11).
>
> **Auftragsverarbeiter in der Datenschutzerklärung** (Pflichtangaben):
> - Cloudflare, Inc. — Hosting + Mail-Versand (Resend läuft über CF Workers)
> - Storyblok GmbH — CMS, EU-Region (Frankfurt)
> - Resend, Inc. — Mailversand-Provider
> - Cloudflare Turnstile — Captcha (Spam-Schutz)

### 4.7 `home` — Startseite (Content Type, Singleton)

Hat ein einziges Feld:

| Feld | Typ | Pflicht | Hinweise |
|---|---|---|---|
| `sections` | Blocks (Multi) | ✔ | Whitelist: `heroSection`, `aktuellesTeaser`, `terminePreview`, `vereinSection`, `vorstandSection`, `galerieTeaser` |

### 4.8 Nestable Blocks für `home.sections`

Lege folgende als **„Nestable"** (NICHT Content type) an. Felder bleiben sehr schlank — der Großteil der Daten kommt aus den Listen-Stories (`post`, `event`, `album`):

- **`heroSection`** — Felder: `eyebrow` (Text, opt., default „● 100 Jahre Blasmusik · 1925–2025"), `headline` (Text, opt., default „Blasmusik aus Gamshurst"), `markerWord` (Text, opt. — Wort der Headline, das den Gold-Marker bekommt; Fallback: letztes Wort), `intro` (Textarea, opt.), `imagePrimary` (Asset, opt.), `imageSecondary` (Asset, opt.), `badgeLabel` (Text, opt., default „seit"), `badgeValue` (Text, opt., default „1925"). Leere Felder fallen auf die Defaults aus dem Design-Handoff zurück.
- **`aktuellesTeaser`** — Feld: `headline` (Text, default „Neuigkeiten & Bekanntmachungen").
- **`terminePreview`** — Feld: `headline` (Text, default „Wann & wo wir spielen").
- **`vereinSection`** — Felder: `headline` (Text), `body` (Richtext), `image` (Asset), `kennzahlen` (Blocks Multi → eigener Nestable `kennzahl` mit `value` + `label`).
- **`vorstandSection`** — Feld: `headline` (Text, default „Vorstandschaft").
- **`galerieTeaser`** — Feld: `headline` (Text, default „100-jähriges Jubiläum").

---

## 5. Ordnerstruktur in Storyblok

**Content (Bücher-Symbol links) → New → Folder.**

Lege folgende Ordner an, damit die Listen-Stories sauber gruppiert sind:

```
aktuelles/   (Default-Content-Type = post)
termine/     (Default-Content-Type = event)
vorstand/    (Default-Content-Type = boardMember)
galerie/     (Default-Content-Type = album)
```

Singletons als Root-Stories:
- `home` (Content-Type = home, **Real path = `/`**)
- `site-settings` (Content-Type = siteSettings, **Real path = `/`** und unsichtbar im Menü)
- `impressum` (Content-Type = impressum)
- `datenschutz` (Content-Type = datenschutz)

> **Tipp:** Pro Ordner unter **Edit Folder → Default Content Type** den passenden Type setzen — dann legt jeder „New Story" im Ordner automatisch den richtigen Type an.

---

## 6. Starter-Content (zum Testen)

Damit Phase 3+ etwas anzeigen kann, leg minimal an:

- `site-settings` mit echten Vereinsdaten (Adresse, E-Mail).
- 2 Posts in `aktuelles/`, beide Veröffentlicht (Status „Published", grünes Häkchen).
- 3 Events in `termine/` mit `startDate` in der Zukunft.
- 3 Board-Members in `vorstand/`.
- 1 Album in `galerie/` (mit ein paar Beispiel-Fotos — Storyblok stellt einen Asset-Manager bereit).
- `home`-Story mit allen 6 Sektionen.
- `impressum`/`datenschutz` mit `isPlaceholder=true` und Platzhalter-Text.

**Veröffentlichen nicht vergessen** — der Public-Token sieht nur `published` Stories.

---

## 7. Webhook für Cloudflare Workers Builds

> Wird relevant, sobald Phase 11 (DNS-Switch + Live-Deploy) ansteht. Für lokale Entwicklung jetzt **noch nicht** nötig.

1. **Settings → Webhooks → Add Webhook.**
2. URL: der Build-Hook von Cloudflare Workers Builds (kriegen wir in Phase 11).
3. **Events:** `Story published`, `Story unpublished`, `Story deleted`.
4. **Secret:** generiere einen Random-String (z. B. `openssl rand -hex 32`), trag ihn als `STORYBLOK_WEBHOOK_SECRET` in Cloudflare Worker-Secrets ein. Der Build verifiziert die Signatur (HMAC SHA-256).

---

## 8. Environment-Variablen ergänzen

Lokal in `.env` (im Projekt-Root):

```bash
STORYBLOK_DELIVERY_TOKEN=<Preview-Token aus Schritt 3>
STORYBLOK_VERSION=draft        # lokal: draft (sieht Drafts); Production: published
STORYBLOK_SPACE_ID=<Space-ID aus Schritt 3>
SITE_URL=https://mv-gamshurst.de
```

> Die `.env`-Datei ist gitignored. Das `STORYBLOK_DELIVERY_TOKEN` ist **ein anderer** als das, was später ins Cloudflare-Worker-Secret kommt — dort kommt das **Public-Token** rein.

---

## 9. Was du mir bei der nächsten Session sagst

Wenn du hier durch bist, brauchst du nur das hier zu posten — den Rest implementiere ich:

```
Storyblok ready:
- Space-ID: 123456
- Preview-Token: <kopiert>
- Stories angelegt: site-settings, 2 posts, 3 events, 3 board, 1 album, home, impressum, datenschutz
```

> **Token darfst du gern hier in den Chat posten** — du kannst ihn jederzeit in Storyblok rotieren, falls du dir das anders überlegst.

---

## Troubleshooting

| Problem | Ursache / Fix |
|---|---|
| Build sagt „401 Unauthorized" | Token falsch / Space-ID nicht zum Token passend |
| Story erscheint nicht auf Live-Site | Status nicht „Published" oder `STORYBLOK_VERSION=published` aber nur Draft existiert |
| Asset-URL liefert 403 | Asset ist nicht Published — in Storyblok unter „Assets" prüfen |
| TS-Build-Fehler nach Schema-Änderung | `npm run types:storyblok` erneut ausführen → generierte Types neu schreiben |
