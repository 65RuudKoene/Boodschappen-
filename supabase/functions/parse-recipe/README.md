# Edge Function: parse-recipe

Zet een recept om naar het app-format met de Claude API — via een **link** (leest de
pagina) of via **1-4 foto's** (leest de afbeelding, bijv. een pagina uit een kookboek
of een uitgeprint recept, met "vision").

## Eenmalig instellen (via het Supabase-dashboard)

1. **Anthropic API-key**
   - Maak een account op https://console.anthropic.com → **API Keys** → nieuwe key.
   - Zet wat tegoed op de account (een recept uitlezen kost ~1 cent).

2. **Secret toevoegen in Supabase**
   - Supabase-dashboard → **Edge Functions** → **Secrets** (of Project Settings → Edge Functions).
   - Nieuwe secret: naam `ANTHROPIC_API_KEY`, waarde = je Anthropic key.

3. **Functie aanmaken**
   - Edge Functions → **Create a new function** → naam exact: `parse-recipe`.
   - Plak de inhoud van `index.ts` in de editor.
   - **Zet "Verify JWT" UIT** (de functie doet zelf een lichte toegangscheck).
   - **Deploy**.

Klaar. In de app: **Recepten → ➕ Recept toevoegen (AI)** → kies **Link** of **Foto** →
**Ophalen met AI**.

## Model wijzigen (optioneel)
In `index.ts` staat `model: "claude-haiku-4-5-20251001"` (snel, goedkoop, en
ondersteunt ook foto's/vision). Wil je nóg iets betere kwaliteit, gebruik dan een
Sonnet-model.

## Kosten
Je betaalt per uitgelezen recept een paar cent via je eigen Anthropic-tegoed
(foto's iets meer dan een link, door de extra beeld-tokens). De gratis
Supabase-laag is ruim voldoende voor dit gebruik.
