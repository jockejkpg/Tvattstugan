# Tvättcykel-hanterare v4 (GitHub Pages + Supabase)

Nyheter i v2
- PIN-lås på brandkårssidan (kod **8310**)
- PIN-lås på admin-sidan (kod **8300**)
- Tvättcykel: **4x VANLIGT TVÄTPROGRAM** + **1x IMPREGNERING** (steg 1–5)
- Renare, kontrastrikt “kubistiskt” UI med pilmarkering av aktuell rad
- Dropdownen på stationssidan visar alla benämningar (people.id). `users` finns kvar för framtida bruk.

> Viktigt: PIN i frontend är en **UI-spärr**, inte ett fullständigt säkerhetsskydd för databasen.
> För riktig åtkomstkontroll behöver ni Supabase Auth + RLS eller Edge Function för admin.

## 1) Supabase: skapa/uppdatera tabeller
Kör `supabase/db.sql` i Supabase SQL Editor.

## 2) Lägg in Supabase URL + anon/publishable key
Öppna `src/supabaseClient.js` och fyll i:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Finns i Supabase → Settings → API.

## 3) Kör lokalt
```bash
python -m http.server 5173
```
Öppna http://localhost:5173

## 4) Admin
Öppna `/admin.html` och ange admin-PIN.

## 5) Deploy på GitHub Pages
Lägg repo i GitHub och aktivera Pages från branch.

---

### Filer
- `index.html` – brandkårssida (PIN 8310)
- `admin.html` – adminpanel (PIN 8300)
- `src/app.js` – huvudapp
- `src/admin.js` – adminpanel
- `src/pinGate.js` – gemensam PIN-gate
- `src/styles.css` – tema
- `supabase/db.sql` – schema + startdata


## v4
- Ny projektikon: stiliserad brandman (svart clipart/SVG)
- Ikonen används som favicon och i övre vänstra hörnet
