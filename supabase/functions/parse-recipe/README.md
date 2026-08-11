# Edge Function: parse-recipe

Zet een recept-URL om naar het app-format met de Claude API.

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

Klaar. In de app: **Recepten → ➕ Recept toevoegen via link** → link plakken → **Ophalen met AI**.

## Model wijzigen (optioneel)
In `index.ts` staat `model: "claude-haiku-4-5-20251001"` (snel en goedkoop).
Wil je nóg iets betere kwaliteit, gebruik dan een Sonnet-model.

## Kosten
Je betaalt per uitgelezen recept een paar cent via je eigen Anthropic-tegoed.
De gratis Supabase-laag is ruim voldoende voor dit gebruik.
