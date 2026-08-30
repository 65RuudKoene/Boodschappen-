# Backup herstellen

Deze app bewaart alle gedeelde data (boodschappenlijst, recepten, planner, etc.)
in de Supabase-tabel `app_kv`, met één rij per `household` + `k` (databundel-naam),
plus de recept-foto's in de Storage-bucket `recipe-photos`. Elke nacht om 04:05 UTC
zet de GitHub Action `.github/workflows/backup-supabase.yml` beide weg in de
privé-repo **`65RuudKoene/Backup-Supabase-boodschappen-`**:

- een volledige export van `app_kv` als `supabase/app_kv-JJJJ-MM-DD.json`
  (de laatste 90 dagen worden bewaard);
- een spiegel van alle bestanden uit `recipe-photos` onder `supabase/photos/`
  (geen historie per dag — dit is steeds de meest recente stand).

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

## Stap 4 — foto's terugzetten (indien nodig)

Alleen nodig als de bucket `recipe-photos` zelf leeg/kapot is — niet als
alleen de tabeldata (stap 1-3) het probleem was.

De back-up-repo bevat onder `supabase/photos/` een spiegel van de bucket,
met dezelfde padstructuur (`household/bestand.jpg`) als in Supabase zelf.
Dit is te veel bestanden om één voor één via het dashboard te uploaden; laat
dit script draaien vanuit een checkout van de back-up-repo (bijv. door een
Claude Code-sessie met toegang tot deze repo te vragen dit voor je uit te
voeren, of zelf lokaal met `curl`/`bash`):

```bash
SUPABASE_URL="https://uutvmhoplasohgucxopa.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="plak-hier-de-service-role-sleutel"   # Project Settings > API

cd supabase/photos
find . -type f | while read -r f; do
  path="${f#./}"
  curl -sS -X POST "$SUPABASE_URL/storage/v1/object/recipe-photos/$path" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "x-upsert: true" \
    --data-binary "@$f"
done
```

De `service_role`-sleutel staat in het Supabase-dashboard onder
**Project Settings → API** (dezelfde die ook als GitHub-secret
`SUPABASE_SERVICE_ROLE_KEY` gebruikt wordt voor de back-up zelf).

## Stap 5 — controleren

Open de app. Dankzij de live-sync (Supabase realtime) komt de herstelde data
er vanzelf in, of ververs de pagina eenmalig als dat niet direct gebeurt.

## Wat wordt hersteld, wat niet

- **Wel**: boodschappenlijst, recepten, planner, favorieten, voorraad, etc. —
  alles wat in `app_kv` staat (zie `SYNC_KEYS` in `index.html`) — én de
  recept-foto's uit de bucket `recipe-photos`.
- **Let op**: de foto-spiegel bewaart geen historie per dag, alleen de meest
  recente stand. Een foto die je gisteren zelf verwijderd hebt uit de app,
  staat dus ook niet meer in de back-up van vandaag.
