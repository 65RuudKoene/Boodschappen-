# Boodschappen & Recepten

Persoonlijke PWA (boodschappenlijst + recepten) voor huishoudelijk gebruik.
Geen build-stap: `index.html` (markup + CSS + JS, alles inline) + `sw.js`
(service worker) + `manifest.json`, gehost via GitHub Pages. Backend is
Supabase (tabel `app_kv` + Storage-bucket `recipe-photos` + Edge Function
`parse-recipe`).

## Belangrijk om als eerste te lezen

- **Back-up herstellen**: zie [`docs/BACKUP-RESTORE.md`](docs/BACKUP-RESTORE.md)
  voor de volledige procedure (en kant-en-klare SQL) om een oude back-up
  terug te zetten als er iets misgaat met de data.
- **Testen vóór je mergt**: zie [`docs/TEST-CHECKLIST.md`](docs/TEST-CHECKLIST.md)
  voor de handmatige regressie-checklist (er is geen geautomatiseerde
  test-suite). Loop de relevante punten langs bij elke wijziging aan
  `index.html`/`sw.js`/`parse-recipe`, en de hele lijst zo nu en dan.

## Hoe alles samenhangt

- Er zijn geen echte gebruikersaccounts. Een gedeeld wachtwoord bepaalt de
  `household`-sleutel (`householdFromPass()` in `index.html`) waaronder alle
  data in Supabase wordt gesynchroniseerd (tabel `app_kv`, realtime via
  `postgres_changes`).
- Recepten toevoegen kan via link, foto('s), of eigen getypte tekst — de
  Edge Function `supabase/functions/parse-recipe/index.ts` laat de Claude
  API dat omzetten naar het app-format (JSON, 2 personen).
- Foto's bij eigen/handmatige recepten gaan naar de publieke Storage-bucket
  `recipe-photos` (`uploadRecipePhoto()` in `index.html`), met een fallback
  naar inline base64 als de upload om wat voor reden dan ook mislukt.
- Dagelijkse back-up van `app_kv` naar de privé-repo
  `65RuudKoene/Backup-Supabase-boodschappen-` via
  `.github/workflows/backup-supabase.yml`.

## Werkconventies in deze repo

- **`APP_VERSION`** (in `index.html`) **altijd ophogen** bij een zichtbare
  wijziging, en **`CACHE`** (in `sw.js`) meeverhogen — anders blijven
  toestellen op een oude gecachete versie hangen (`cache:'no-store'` en een
  auto-reload-bij-nieuwe-service-worker zijn al aanwezig, maar de
  versie/cache-naam moet je zelf blijven ophogen).
- **Supabase Edge Functions worden niet automatisch gedeployed.** Na elke
  wijziging aan `supabase/functions/parse-recipe/index.ts` moet de inhoud
  handmatig gekopieerd worden naar het Supabase-dashboard
  (Edge Functions → parse-recipe → code vervangen → Deploy). Er is geen
  CI/CD-koppeling tussen GitHub en Supabase.
- Ontwikkel op een feature-branch, open een (draft) PR, en merge pas na
  expliciete goedkeuring — niet automatisch mergen.
- Er is geen geautomatiseerde test-suite; verifieer wijzigingen door de app
  lokaal te draaien (`python3 -m http.server` + headless browser) of door
  de gebruiker live te laten testen.
