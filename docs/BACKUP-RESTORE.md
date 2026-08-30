# Backup herstellen

Deze app bewaart alle gedeelde data (boodschappenlijst, recepten, planner, etc.)
in de Supabase-tabel `app_kv`, met één rij per `household` + `k` (databundel-naam).
Elke nacht om 04:05 UTC zet de GitHub Action `.github/workflows/backup-supabase.yml`
een volledige export van die tabel weg in de privé-repo
**`65RuudKoene/Backup-Supabase-boodschappen-`**, als
`supabase/app_kv-JJJJ-MM-DD.json`. De laatste 90 dagen worden bewaard.

Gebruik dit alleen als er echt iets fout is gegaan (data kwijt/corrupt) — het
overschrijft de huidige data met een oudere versie.

## Stap 1 — het juiste back-upbestand vinden

1. Ga naar de repo `65RuudKoene/Backup-Supabase-boodschappen-` op GitHub.
2. Open de map `supabase/`.
3. Kies het bestand van de dag vóórdat het misging, bijv. `app_kv-2026-08-29.json`.
4. Open het bestand, klik op **Raw**, en kopieer de volledige inhoud (het hele
   JSON-array, van `[` tot `]`).

## Stap 2 — (optioneel) uitzoeken welk `household` je nodig hebt

Er is meestal maar één huishouden actief. Twijfel je, check het dan eerst in de
Supabase **SQL Editor**:

```sql
select distinct household from app_kv;
```

## Stap 3 — data terugzetten

Ga naar het Supabase-dashboard van dit project → **SQL Editor** → nieuwe query.

**Optie A — alles terugzetten** (hele tabel overschrijven met de back-up):

```sql
insert into app_kv (household, k, v, updated_at)
select
  (elem->>'household')::text,
  (elem->>'k')::text,
  (elem->'v'),
  (elem->>'updated_at')::timestamptz
from jsonb_array_elements('PLAK_HIER_DE_HELE_JSON_ARRAY'::jsonb) as elem
on conflict (household, k) do update
set v = excluded.v, updated_at = excluded.updated_at;
```

**Optie B — alleen één huishouden terugzetten** (bijv. als alleen jouw lijst
kapot is, maar er zijn ook andere huishoudens actief):

```sql
insert into app_kv (household, k, v, updated_at)
select
  (elem->>'household')::text,
  (elem->>'k')::text,
  (elem->'v'),
  (elem->>'updated_at')::timestamptz
from jsonb_array_elements('PLAK_HIER_DE_HELE_JSON_ARRAY'::jsonb) as elem
where (elem->>'household') = 'hh_xxxxxxxxxxxxxxxx'
on conflict (household, k) do update
set v = excluded.v, updated_at = excluded.updated_at;
```

**Optie C — alleen één specifieke lijst terugzetten** (bijv. alleen de
boodschappenlijst, niet de recepten):

```sql
insert into app_kv (household, k, v, updated_at)
select
  (elem->>'household')::text,
  (elem->>'k')::text,
  (elem->'v'),
  (elem->>'updated_at')::timestamptz
from jsonb_array_elements('PLAK_HIER_DE_HELE_JSON_ARRAY'::jsonb) as elem
where (elem->>'household') = 'hh_xxxxxxxxxxxxxxxx'
  and (elem->>'k') = 'boodschappen-checks-v3'
on conflict (household, k) do update
set v = excluded.v, updated_at = excluded.updated_at;
```

Vervang `PLAK_HIER_DE_HELE_JSON_ARRAY` door de inhoud die je in stap 1
gekopieerd hebt (laat de aanhalingstekens `'...'` eromheen wel staan).

## Stap 4 — controleren

Open de app. Dankzij de live-sync (Supabase realtime) komt de herstelde data
er vanzelf in, of ververs de pagina eenmalig als dat niet direct gebeurt.

## Wat wordt hersteld, wat niet

- **Wel**: boodschappenlijst, recepten, planner, favorieten, voorraad, etc. —
  alles wat in `app_kv` staat (zie `SYNC_KEYS` in `index.html`).
- **Niet**: foto's in de Storage-bucket `recipe-photos`. Die vallen buiten
  deze back-up. Een recept-tekst komt terug, maar als de bijbehorende foto
  in de bucket zelf verwijderd is, komt die foto niet automatisch terug.
