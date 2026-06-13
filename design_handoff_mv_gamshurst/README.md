# Handoff: Website-Redesign Musikverein Gamshurst e.V.

Dieses Paket beschreibt das komplette Design der neuen MV-Gamshurst-Website so, dass es in **einer beliebigen Technologie** (React/Next.js, Vue/Nuxt, Astro, SvelteKit, WordPress-Theme, Laravel/Blade, statischer Generator …) umgesetzt werden kann. Die konkrete Tech-Basis wird in der Claude-Code-Session festgelegt – dieses Dokument ist bewusst **framework-neutral**.

---

## 1. Überblick

Modernisierte, voll responsive Website für einen klassischen Musikverein. Visueller Stil: „Modern & frisch" – kräftige Typografie, runde, weiche Karten, Petrol/Wappen-Blau aus dem Vereinswappen plus Gold & Cyan als Akzent.

Die Seite besteht aus **fünf zusammenhängenden Seiten**:

| Seite | Datei | Zweck |
|---|---|---|
| Startseite | `MV Gamshurst Startseite.dc.html` | Hero, Aktuelles, Termine, Das sind wir, Vorstandschaft, Galerie-Teaser |
| Bildergalerie | `MV Gamshurst Bildergalerie.dc.html` | Alben, Featured-Album, Masonry-Raster, Lightbox |
| Kontakt | `MV Gamshurst Kontakt.dc.html` | Kontaktformular (mit Validierung), Kontaktdaten, Karten-Platzhalter |
| Impressum | `MV Gamshurst Impressum.dc.html` | Rechtstext (Leselayout) |
| Datenschutz | `MV Gamshurst Datenschutz.dc.html` | Rechtstext mit Sticky-Inhaltsverzeichnis |

Zusätzlich liegt `MV Gamshurst Redesign.dc.html` bei – das **Konzept-Board** mit drei Stil-Richtungen und drei Termin-Varianten (nur als Referenz; umgesetzt wurde „Richtung C" + „Termin-Variante 2 / Monats-Karten").

---

## 2. Über die Design-Dateien

Die `.dc.html`-Dateien sind **Design-Referenzen** (gerenderte HTML-Prototypen), **kein** produktiv zu kopierender Code. Aufgabe ist, diese Designs in der gewählten Codebasis **nach deren etablierten Mustern neu aufzubauen** (Komponenten, Routing, Styling-System, Bildpipeline) – nicht das HTML 1:1 zu übernehmen.

- Zum Ansehen im Browser öffnen (sie laden `support.js`, das mitgeliefert ist). Maßgeblich für die Umsetzung sind aber die **Beschreibungen, Maße, Farben und Texte in diesem README** – es ist eigenständig nutzbar, auch ohne die Dateien auszuführen.
- Inline-Styles in den Prototypen dienen nur dem schnellen Rendern. In der echten Umsetzung gehören sie in das Styling-System des Projekts (Utility-Klassen, CSS-Module, Tokens etc.).

---

## 3. Fidelity

**High-Fidelity.** Farben, Typografie, Abstände, Radien und Interaktionen sind final gestaltet und sollen mit den Mitteln der Ziel-Codebasis möglichst **pixelgenau** nachgebaut werden. Alle Foto-Flächen sind Platzhalter (Verlaufsflächen) – sie werden durch echte Bilder ersetzt.

---

## 4. Globale Komponenten

### Sticky-Navigation (alle Seiten)
- Schwebende **Pille** (border-radius 999px), Hintergrund `#16424c`, Schatten `0 16px 34px -16px rgba(15,46,54,.6)`, `position: sticky; top: 0` mit 16px Abstand oben.
- Links: Logo (weiße Wappen-Variante, Höhe 36px). Rechts: Textlinks (`Aktuelles, Termine, Das sind wir, Vorstandschaft, Bildergalerie`) + gold gefüllter **Kontakt**-Button (`#f3c12e`, Text `#143b44`).
- Linkfarbe `#bdd8dd`, Hover → `#ffffff`. Aktiver Menüpunkt: weiß mit goldener Unterstreichung (`border-bottom: 2px solid #f3c12e`).
- **< 860px:** Textlinks ausgeblendet, **Burger-Button** (44×44px Kreis) eingeblendet; Klick öffnet ein Panel unter der Pille mit denselben Links (klappt beim Klick zu).
- Auf der Startseite scrollen die Links per Anker sanft zu den Sektionen (`#aktuelles`, `#termine`, `#verein`, `#vorstand`); Bildergalerie & Kontakt verlinken auf die eigenen Seiten.

### Footer (alle Seiten)
- Hintergrund `#0f2e36`, Text `#bcd2d7`. Großes Wappen als sehr dezentes Wasserzeichen (opacity .05) rechts unten.
- Spalten (auto-fit, min 190px): Verein-Kurztext + Logo · Verein-Links · Kontakt (Adresse, `info@mv-gamshurst.de`, Social-Icons Instagram/Facebook).
- Untere Zeile: `© 2026 Musikverein Gamshurst e.V.` + Links Impressum / Datenschutz / Kontakt.

---

## 5. Seiten im Detail

### 5.1 Startseite
Reihenfolge der Sektionen (max. Inhaltsbreite überall **1180px**, zentriert; horizontale Polsterung `clamp(16px,4vw,40px)`):

1. **Hero** – zweispaltig (`1.05fr .95fr`, stapelt < 860px).
   - Links: Eyebrow-Chip „● 100 Jahre Blasmusik · 1925–2025" (weiße Pille, grüner Punkt `#3f8a4f`); H1 „Blasmusik aus **Gamshurst**" (`Bricolage Grotesque` 800, `clamp(40px,6.4vw,68px)`, letter-spacing -0.02em), das Wort „Gamshurst" hat einen **goldenen Marker-Balken** dahinter (`#f3c12e`, 16px hoch, hinter dem Text); Fließtext; Buttons „Termine ansehen" (dunkel `#16424c`) und „Aktuelles" (Outline).
   - Rechts: Foto-Collage aus zwei überlappenden, abgerundeten Kacheln (28px Radius) + gedrehtes Gold-Badge „seit 1925".
2. **Aktuelles** (`id=aktuelles`) – weißer Block, **oben abgerundet** (`border-radius: 36px 36px 0 0`). Eyebrow + H2 „Neuigkeiten & Bekanntmachungen" + Link „Alle Beiträge →". Ein **Featured-Beitrag** (Bild links, Text rechts, 26px Radius) + Raster aus 4 Beitragskarten (auto-fit, min 235px). Jede Karte: Farbfläche mit Kategorie-Badge, Datum, Titel, Auszug.
3. **Termine** (`id=termine`) – Block in `#16424c` mit Gold-Radial-Schimmer. Eyebrow (gold) + H2 „Wann & wo wir spielen" + Gold-Button „Gesamtkalender →". **Monats-Karten** (auto-fit, min 290px): heller Kartenkörper, Kopf mit Petrol-Verlauf + Monatsname + Zähler-Badge; je Eintrag links Tageszahl + Wochentag, rechts Titel + Zeit/Ort. Der **Dezember** ist als Highlight gold umrandet (Jahreskonzert).
4. **Das sind wir** (`id=verein`) – weiß, zweispaltig (Text + Foto-Collage, stapelt < 860px). Geschichte (gekürzt), drei Kennzahl-Kacheln (1925 / 55 / ~30), Link „Unsere ganze Geschichte →".
5. **Vorstandschaft** (`id=vorstand`) – Hintergrund `#eef3f7`. Raster (auto-fit, min 186px) mit **11 Karten**: runder **Personen-Platzhalter** (Silhouette), Rollen-Eyebrow, Name, Instrument.
6. **Galerie-Teaser** (`id=galerie`) – weiß. H2 „100-jähriges Jubiläum" + Link „Alle Fotos ansehen →" (→ Bildergalerie). Quadratisches Kachel-Raster (auto-fit, min 150px) mit Hover-Zoom.
7. **Footer**.

### 5.2 Bildergalerie
1. **Seitenkopf**: Breadcrumb, Eyebrow, H1 „Momente in Bildern", Intro, rechts Kennzahlen (6 Alben / 340+ Fotos). **Jahres-Filter-Chips** (Alle Jahre / 2025 / 2024 / 2023 / Älter – „Alle Jahre" aktiv).
2. **Featured-Album**: breiter Banner (28px Radius), dunkler Verlauf + Abdunkelung unten, Badge „FEATURED ALBUM · 2025", Titel „100 Jahre · Festwochenende", Datum/Anzahl, Button „Album öffnen →".
3. **Alben**: Raster (auto-fit, min 250px) aus Album-Karten: Cover (3:2) mit Foto-Zähler-Badge, Titel, Datum.
4. **Alle Fotos** (`id=fotos`): **Masonry** via CSS-Spalten (`column-width: 248px`), Kacheln in unterschiedlichen Seitenverhältnissen, je Kachel Album-Beschriftung unten. Button „Mehr Fotos laden".
5. **Lightbox** (Overlay): siehe Interaktionen.

### 5.3 Kontakt
- Kopf: Breadcrumb, H1 „Schreib uns", Intro.
- Zweispaltig (`1.25fr .9fr`, stapelt < 860px):
  - **Formularkarte** (weiß, 26px Radius): Felder **Name*** & **E-Mail*** (zweispaltig), **Betreff**, **Nachricht*** (Textarea), **Datenschutz-Checkbox*** (Pflicht, mit Link zur Datenschutzseite), Button „Nachricht senden", Hinweis „* Pflichtfelder". Nach Absenden: **Erfolgszustand** (grüner Haken-Kreis, „Vielen Dank!", Button „Neue Nachricht").
  - **Info-Spalte**: dunkle Kontaktkarte (Verein, Adresse, E-Mail, Social) + Karten-Platzhalter „Karte / Anfahrt".

### 5.4 Impressum & 5.5 Datenschutz
- Leselayout, weiße Karte (24px Radius). Impressum: einspaltig, Lesebreite **820px**. Datenschutz: zweispaltig mit **Sticky-Inhaltsverzeichnis** (260px) + Inhalt; stapelt < 860px.
- Oben ein **gelber Hinweis-Banner** (`#fff8e6` / Rand `#f3dca0`), dass `[Platzhalter]` zu füllen und die Texte rechtlich zu prüfen sind.
- **Wichtig:** Beide Seiten enthalten nur Standard-Textbausteine + Platzhalter (`[Straße]`, `[VR-Nummer]`, `[Name des Hosters]`, `[Stand]` …). Diese Inhalte sind **rechtlich relevant** und müssen vom Verein mit echten Angaben gefüllt und geprüft werden – nicht erfinden.

---

## 6. Interaktionen & Verhalten

- **Sticky-Nav + Mobile-Menü:** Burger < 860px, State `menuOpen` (toggle/close).
- **Anker-Navigation (Startseite):** `scroll-behavior: smooth`, `scroll-margin-top: 96px` auf Sektionen.
- **Galerie-Lightbox:** Klick auf Kachel öffnet Vollbild-Overlay (`position: fixed; inset:0; background: rgba(8,18,22,.93)`). Enthält Album-Name, Zähler (`n / gesamt`), Vor/Zurück-Buttons, Schließen-Button. **Tastatur:** ← / → blättern, **Esc** schließt. Index läuft zyklisch (modulo). State: `lb` (aktueller Index oder null).
- **Kontaktformular-Validierung (clientseitig):**
  - Name: nicht leer.
  - E-Mail: nicht leer + Regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
  - Nachricht: nicht leer + min. 10 Zeichen.
  - Consent-Checkbox: muss gesetzt sein.
  - Fehler erscheinen inline (Farbe `#d23b53`). Bei Erfolg → Erfolgszustand; „Neue Nachricht" setzt alles zurück.
- **Hover-States:** Karten heben sich (`translateY(-3…4px)` + stärkerer Schatten), Galerie-Kacheln skalieren (`scale(1.012…1.04)`), Buttons `translateY(-2px)`, Nav-Links Farbwechsel. Übergänge ~.15–.22s ease.
- **Input-Focus:** Rahmen `#1f6573` + Ring `0 0 0 3px rgba(31,101,115,.15)`.

---

## 7. Responsives Verhalten

- Hauptbreakpoint **860px**. Darunter: Nav→Burger, Hero/Das-sind-wir/Kontakt/Datenschutz stapeln einspaltig.
- Schriftgrößen fluid über `clamp()`; keine festen Desktop-only-Größen.
- Karten-Raster über `grid-template-columns: repeat(auto-fit, minmax(<min>, 1fr))` → reflowen automatisch. Galerie nutzt CSS-Spalten (`column-width`).
- Inhaltsbreite max. 1180px (Rechtsseiten schmaler).

---

## 8. State Management

Pro Seite minimal:
- `menuOpen: boolean` (alle Seiten).
- Galerie: `lb: number | null` (Lightbox-Index) + Keyboard-Listener (mount/unmount).
- Kontakt: `name, email, subject, message, consent, errors, submitted`. Validierung beim Absenden; Erfolgszustand ersetzt das Formular.

Keine globale Datenhaltung im Prototyp – in der echten Umsetzung kommen die Inhalte aus dem Backend (siehe §10).

---

## 9. Design-Tokens

### Farben
| Rolle | Hex |
|---|---|
| Primär / Nav / Buttons dunkel | `#16424c` |
| Petrol tief | `#143b44` |
| Petrol am tiefsten / Footer | `#0f2e36` |
| Petrol mittel (Akzent/Label) | `#1f6573` |
| Petrol-Verlauf hell | `#27788a`, `#34889a` |
| Cyan-Akzent | `#57c7d6` |
| Wappen-Blau | `#2f62b0` |
| Gold (CTA/Akzent) | `#f3c12e` |
| Gold tief | `#b78a12`, `#7a5a08` |
| Grün (Kategorie „Fest") | `#3f8a4f` / hell `#2e7d4f` |
| Beere (Kategorie „Brassparty") | `#a23b86` |
| Text-Überschrift | `#14303f` |
| Text-Body | `#44535f` |
| Text gedämpft | `#5d6b78`, `#6b7884` |
| Text sehr hell | `#8a97a3`, `#9aa6b1` |
| Seiten-Hintergrund | `#eef3f7` |
| Karten-Weiß / Alt | `#ffffff`, `#fbfdfe`, `#f3f7fa` |
| Rahmen | `#e4e9ef`, `#d7dee5`, `#edf1f4` |
| Fehler | `#d23b53` |
| Erfolg (BG/Text) | `#e1f1e4` / `#2e7d4f` |
| Hinweis-Banner (BG/Rand/Text) | `#fff8e6` / `#f3dca0` / `#7a5a08` |

### Typografie
- **Headlines:** `Bricolage Grotesque` (700/800). **Body/UI:** `Inter` (300–800). Beide z. B. via Google Fonts.
- Hero-H1 `clamp(40px,6.4vw,68px)`, 800, ls -0.02em, lh ~0.98.
- Sektion-H2 `clamp(28px,4vw,40px)`, 700.
- Kartentitel 17–18px, 700 (Bricolage).
- Body 15–17px, lh 1.6 (Inter).
- Eyebrow-Label: 13px, ls .18em, UPPERCASE, `#1f6573`, 700.

### Spacing / Radien / Schatten
- Sektion-Polsterung vertikal `clamp(48px,6vw,76px)`, horizontal `clamp(16px,4vw,40px)`. Inhaltsbreite 1180px.
- Radien: Pille 999px (Nav/Buttons/Chips); Karten 16–26px; abgerundete Sektion-Kanten 30–36px; Inputs 12px.
- Schatten: Nav `0 16px 34px -16px rgba(15,46,54,.6)`; Karten `0 14–22px 32–50px -26/-34px rgba(20,40,60,.6–.7)`; Buttons `0 14px 26px -14px rgba(15,46,54,.7)`.

---

## 10. Content-Modell & Backend (zentral)

Heute sind alle Inhalte fest verdrahtet. Für die echte Seite sollten die folgenden Inhalte **dynamisch über ein Backend / CMS** verwaltbar sein, damit der Verein sie ohne Entwickler pflegen kann. Vorschlag für Entitäten (Feldnamen englisch, code-freundlich):

### 10.1 Beiträge / Aktuelles (`Post`) — **dynamisch**
- `id`, `title`, `slug`, `publishedAt` (Datum), `category` (Enum: `Konzert | Verein | Fest | Festwochenende | Brassparty | Sonstiges`), `excerpt`, `body` (Rich-Text/HTML), `coverImage` (Bildref), `externalLink` (optional, z. B. Ticket-URL).
- Sortierung: `publishedAt` absteigend. Startseite zeigt die neuesten 5 (1 Featured + 4). **Empfehlung:** zusätzliche Detailseite pro Beitrag (`/aktuelles/{slug}`) – im Design noch nicht enthalten, aber sinnvoll (Layout kann aus dem Featured-Block abgeleitet werden).

### 10.2 Termine (`Event`) — **dynamisch**
- `id`, `title`, `startDate`, `endDate` (optional, für Zeiträume wie „Probenwochenende 13.–15."), `time` (optional, Text wie „19:00 Uhr"), `location` (optional), `category` (Enum: `Konzert | Auftritt | Fest | Verein | Kirchlich | Sonstiges`), `description` (optional).
- Darstellung gruppiert nach **Monat** (Monats-Karten). Vergangene Termine ausblenden/archivieren. „Gesamtkalender" kann später eine eigene Termine-Seite/Export (iCal) werden.

### 10.3 Vorstandschaft (`BoardMember`) — **dynamisch**
- `id`, `name`, `role` (z. B. „1. Vorstandsteam", „Schriftführer", „Kassier", „1. Beisitzer"…), `instrument`, `photo` (optional – aktuell neutrale Silhouette als Fallback), `sortOrder`.
- 11 Einträge; Reihenfolge fix über `sortOrder`. Fallback-Avatar nötig, da Fotos evtl. fehlen.

### 10.4 Bildergalerie — **dynamisch** (`Album` + `Photo`)
- `Album`: `id`, `title`, `date`, `coverImage`, `photoCount` (berechnet), `sortOrder`, `featured` (bool).
- `Photo`: `id`, `albumId`, `image` (Vollauflösung), `thumb` (Vorschau), `caption`, `width`/`height` (für Masonry-Seitenverhältnis), `sortOrder`.
- Ansichten: Album-Karten, „Alle Fotos" (gemischter Feed), Lightbox (braucht Voll- + Vorschaubild). **Bild-Pipeline beachten:** responsive `srcset`, Lazy-Loading, Thumbnails generieren.

### 10.5 Kontaktanfragen (`ContactMessage`) — **Backend nötig**
- Felder: `name`, `email`, `subject`, `message`, `consent` (bool), `createdAt`, optional `ipHash`.
- Backend muss: das Formular **entgegennehmen** (Endpoint), eine **E-Mail an den Verein** senden (`info@mv-gamshurst.de`) und/oder speichern, **Spam-Schutz** (Honeypot/Captcha/Rate-Limit), **DSGVO**: Einwilligung protokollieren, Daten nur zweckgebunden speichern. Serverseitige Validierung wie clientseitig (§6).

### 10.6 Vereins-/Konfigurationsdaten — **dynamisch (Settings)**
- `vereinName`, `address`, `email`, `instagramUrl`, `facebookUrl`, evtl. Probenzeiten. Wird in Footer & Kontaktseite verwendet (heute teils Platzhalter „Anschrift bitte ergänzen").

### 10.7 Rechtstexte (Impressum / Datenschutz) — **statisch oder CMS**
- Können als gepflegte Seiteninhalte (CMS-Richtext) oder statisch hinterlegt werden. Enthalten Platzhalter, die mit echten Angaben gefüllt und rechtlich geprüft werden müssen.

### Statisch (kein Backend nötig)
- Sektion „Das sind wir" (Vereinsgeschichte) – selten geändert; optional CMS.
- Layout, Navigation, Designsystem.

---

## 11. Assets

- `assets/logo-light.svg` – **weiße/inverse Wappen-Variante** (für dunkle Flächen: Nav, Footer). Wappen: blau-weiß geteilter Schild, drei Goldscheiben, dunkle Tanne, Gold-Trompete, weißer Schriftzug „Musikverein Gamshurst e.V.". Für helle Flächen wird ggf. eine dunkle Variante benötigt (derzeit nicht vorhanden – Logo sitzt im Design immer auf dunklem Grund).
- Alle Fotos sind **Platzhalter** (Verlaufsflächen). Echte Bilder: Gruppenbild, Konzerte, Auftritte, Jubiläum, Vorstands-Porträts.
- Icons: einfache Inline-SVGs (Mail, Pin, Instagram, Facebook, Haken, Info) – in der Umsetzung durch das Icon-Set des Projekts ersetzbar (z. B. Lucide).
- Schriften: Google Fonts „Bricolage Grotesque" + „Inter".

---

## 12. Dateien in diesem Paket

- `MV Gamshurst Startseite.dc.html`
- `MV Gamshurst Bildergalerie.dc.html`
- `MV Gamshurst Kontakt.dc.html`
- `MV Gamshurst Impressum.dc.html`
- `MV Gamshurst Datenschutz.dc.html`
- `MV Gamshurst Redesign.dc.html` (Konzept-Board, optionale Referenz)
- `assets/logo-light.svg`
- `support.js` (Laufzeit, damit die `.dc.html`-Dateien im Browser rendern)

> Sprache der Website: **Deutsch** (du-Form). Keine Mehrsprachigkeit erforderlich; Texte sollten aber redaktionell pflegbar sein.
