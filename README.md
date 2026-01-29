# Tvättcykel-hanterare (GitHub Pages + Supabase)

En liten statisk webbapp (HTML/CSS/JS) som visar personer (t.ex. 25, 27, JE, MO) med 6 steg:
- Steg 1–5: Normal tvätt
- Steg 6: Impregnering

Appen:
- Laddar aktuell status från Supabase-tabellen `people`
- Loggar varje “Klar” i `wash_log`
- Uppdaterar `next_step` (6 -> 1)
- Realtidsuppdaterar UI via Supabase Realtime (Postgres Changes)

## 1) Skapa tabeller i Supabase

Kör filen `supabase/db.sql` i Supabase SQL Editor.

## 2) Aktivera Realtime
I Supabase: Database → Replication → slå på för tabellerna `people` och `wash_log` (om inte redan aktiverat).

## 3) Lägg in dina Supabase-nycklar
Öppna `src/supabaseClient.js` och fyll i:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Finns i Supabase: Settings → API.

## 4) Kör lokalt
Du kan köra med valfri statisk server, t.ex.:

```bash
python -m http.server 5173
```

Öppna: http://localhost:5173

## 5) Deploy på GitHub Pages
- Lägg allt i repo
- Settings → Pages → Deploy from branch → root

## Säkerhet (MVP)
`db.sql` sätter RLS policies “allow all” (alla får läsa/skriva). För intern station-MVP kan det vara OK.
När ni vill låsa ned: inför auth och policies per station/användare.

---

### Filstruktur
- `index.html` – startsida
- `src/app.js` – UI + logik
- `src/supabaseClient.js` – Supabase client
- `src/styles.css` – styling
- `supabase/db.sql` – schema + policies + startdata
