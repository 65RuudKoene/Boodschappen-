# Test-checklist

Er is geen geautomatiseerde test-suite (zie `CLAUDE.md`) — deze checklist is
het handmatige alternatief. Loop 'm door:

- **Altijd** vóór je een PR laat mergen die `index.html`, `sw.js`, of
  `supabase/functions/parse-recipe/index.ts` raakt (in elk geval de punten
  die met je wijziging te maken hebben).
- **Volledig**, af en toe (bijv. na een paar weken updates, of vlak voordat
  je de app aan iemand nieuw geeft), om te checken dat er niets sluipend
  kapot is gegaan.

Gebruik twee toestellen/browservensters tegelijk voor de sync-punten (bijv.
telefoon + laptop, of twee vensters waarvan één incognito).

## 1. Inloggen & toegang
- [ ] Inloggen met het juiste wachtwoord werkt.
- [ ] Eerste keer inloggen: er wordt om je voornaam gevraagd.
- [ ] Uitloggen en opnieuw inloggen: je gedeelde lijst komt terug.
- [ ] Versienummer onderin (of bij "Samen delen") komt overeen met de
      nieuwste `APP_VERSION` in `index.html`.

## 2. Boodschappenlijst
- [ ] Handmatig een item toevoegen, met een categorie.
- [ ] Item afvinken en weer terugzetten.
- [ ] Twee keer hetzelfde ingrediënt met een andere hoofdletter toevoegen
      (bijv. "Ui" en "ui") → moet samengevoegd worden, niet dubbel.
- [ ] Item dat in de voorraad staat, verschijnt niet (of duidelijk gemarkeerd)
      op de lijst.

## 3. Recept toevoegen
- [ ] **Link**: een recept-URL plakken → AI haalt titel, ingrediënten (voor
      2 personen) en ALLE bereidingsstappen correct op.
- [ ] **Foto**: 1-2 foto's van een recept (boek/blaadje) → titel, ingrediënten
      en stappen kloppen; de titel is letterlijk overgenomen (geen rare
      spelfouten of "gecorrigeerde" woorden).
- [ ] **Eigen recept**: zelf tekst typen/plakken, eventueel met eigen foto →
      recept wordt correct gestructureerd.
- [ ] Een (bijna) identiek recept nogmaals toevoegen → je krijgt een
      duplicaat-waarschuwing met de naam van het bestaande recept.
- [ ] Bij een eigen foto: geen foutmelding-pop-up (of, als er wél een
      foutmelding komt, is dat een echt probleem om uit te zoeken — zie
      `docs/BACKUP-RESTORE.md`-achtige aanpak: navragen wat er precies
      staat).
- [ ] De foto van een net toegevoegd recept staat ook echt in de Supabase
      Storage-bucket `recipe-photos` (steekproefsgewijs, niet elke keer).

## 4. Recept beheren
- [ ] Recept hernoemen werkt en de wijziging blijft na een refresh staan.
- [ ] Recept verwijderen werkt.
- [ ] Recept als favoriet markeren/demarkeren werkt.
- [ ] Foto van een AI-fotorecept wordt gebruikt als thumbnail in de
      recepten-lijst.

## 5. Planner & filters
- [ ] Een recept aan de week toevoegen via "Recepten kiezen".
- [ ] Aantal personen per week aanpassen → boodschappenlijst-hoeveelheden
      passen mee aan.
- [ ] Diner-subfilters (bijv. pasta/vlees/vis) tonen de juiste recepten.
- [ ] Lunch-subfilters tonen de juiste recepten.
- [ ] "Wat eten we vandaag?" geeft een zinnig willekeurig recept.

## 6. Live sync tussen toestellen
- [ ] Vink op toestel A een boodschappenlijst-item af → verschijnt
      (bijna) meteen afgevinkt op toestel B.
- [ ] Voeg op toestel A een recept toe → verschijnt op toestel B na een
      refresh (of automatisch).

## 7. PWA / installatie
- [ ] Na een nieuwe deploy: app ververst zichzelf automatisch naar de
      nieuwe versie (geen oude gecachete versie die blijft hangen).
- [ ] Foto uit de telefoon-galerij kiezen werkt (niet geforceerd naar de
      camera-app).

## 8. Backups
- [ ] Workflow **Backup Supabase data** handmatig draaien
      (Actions → Run workflow) → groen vinkje.
- [ ] In de privé-backup-repo: nieuwe `app_kv-JJJJ-MM-DD.json` van vandaag.
- [ ] In de privé-backup-repo: `supabase/photos/` bevat de recept-foto's die
      er in Storage staan (steekproefsgewijs).
- [ ] (Zeldzamer, bijv. 1x per half jaar): oefen een restore met een oude
      back-up op een test-recept, volgens `docs/BACKUP-RESTORE.md`, om te
      checken dat de procedure nog klopt.

## Iets kapot gevonden?
Meld het gewoon zoals altijd (screenshot + wat je deed) — dan pakken we het
op dezelfde manier op als de andere bugs in deze repo: branch, testen, PR,
en pas mergen na jouw akkoord.
