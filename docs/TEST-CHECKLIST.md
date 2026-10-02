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

## 6b. Producten (catalogus + streepjescode)
- [ ] Home → **Producten** opent de catalogus-tab; handmatig een product
      toevoegen ("Opslaan + op lijst") → staat in de catalogus én onder
      "Zelf toegevoegd" bij Boodschappen.
- [ ] **Streepjescode scannen** op de telefoon (Safari/iOS én Chrome/Android):
      camera-toestemming, code wordt herkend, naam/categorie/foto komen uit
      Open Food Facts, je kunt ze nog aanpassen vóór opslaan.
- [ ] Onbekende code → leeg formulier met de code erin; zelf de naam invullen.
- [ ] Zelfde code nogmaals scannen → staat al in de catalogus, wordt gewoon
      op de lijst gezet (geen dubbel product).
- [ ] Code typen in de scanner (zonder camera) werkt ook.
- [ ] Tik op "✓ Op lijst" haalt het product weer van de lijst; product
      verwijderen uit de catalogus laat bestaande lijst-items staan.
- [ ] Catalogus verschijnt op een tweede toestel (sync, sleutel `products-v1`).
- [ ] Categorie klopt: gescand product (bijv. zalm, melk, cola, wc-papier) krijgt
      de juiste categorie; bij handmatig typen verandert de categorie mee
      met de naam, tot je 'm zelf kiest.
- [ ] Losse producten staan op de boodschappenlijst in winkelvolgorde:
      Groente > Vlees > Vis > Zuivel > Brood > Pasta > Potten > Voorraad >
      Dranken > Diepvries > Huishouden.
- [ ] Filterknoppen in Producten: Alles, Op de lijst en per categorie (alleen
      categorieën met producten); combineert met het zoekveld.
- [ ] Categorie-gok (Producten, handmatig typen): "gehakte knoflook" → groente, "sushirijst" → pasta, "speculoospasta" en "agavesiroop" → pot, "appelsiensap" → dranken, "gehakte tomaten" → pot; "rundergehakt" blijft vlees en "sushi zalm" vis.

## 6c. Foto-uploads (privacy)
- [ ] Voeg een recept met een eigen foto toe: de foto laadt, en de
      foto-link in het recept bevat **geen** `hh_...` (huishoud-id) maar een
      pad als `.../recipe-photos/p/<24 tekens>.jpg`.

## 6d. AI-import van een recept in een andere taal
- [ ] Plak een Engels recept (bijv. met cups, oz, tbsp en °F) bij
      "Eigen recept": titel, ingrediënten en stappen komen in het
      **Nederlands**, maten zijn metrisch (g/ml/el/tl) en temperaturen in °C
      (ook in de stappen), en `tbsp` is `el` en `tsp` is `tl`.
- [ ] Een Nederlands recept: de titel blijft **letterlijk** zoals in de bron.
- [ ] (Na wijziging aan `parse-recipe`: handmatig deployen, zie CLAUDE.md.)
- [ ] Bij **Foto** en **Eigen recept** staat een optioneel veld "Link naar origineel"; vul je een https-link in, dan staat na toevoegen "Bekijk origineel recept ↗" onder het recept. Een ongeldige link (zonder https://) geeft een melding; het veld leeg laten werkt gewoon. Bij **Link** is het veld niet zichtbaar.

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
