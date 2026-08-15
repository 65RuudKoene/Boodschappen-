# Edge Function: usage-report

Haalt kosten op bij de Anthropic **Usage & Cost Admin API** en geeft alleen
samengevatte bedragen per project terug aan de token-status-pagina. De
Admin-sleutel en de ruwe workspace-/API-key-ID's verlaten deze functie nooit.

## Eenmalig instellen

1. **Admin API-sleutel aanmaken** (dit is een ánder type sleutel dan de
   gewone `ANTHROPIC_API_KEY` van `parse-recipe` — die werkt hier niet)
   - Ga naar https://platform.claude.com/settings/admin-keys (je moet
     **admin**-rol hebben in de organisatie)
   - **Create key** → naam geven → **Create**
   - Kopieer de sleutel (begint met `sk-ant-admin01-...`) meteen, hij wordt
     maar één keer getoond.

2. **Workspace- of API-key-ID's opzoeken** voor elk project
   - Console → **Settings → Workspaces** (of **API Keys**) → open elk
     project se werkruimte/sleutel → kopieer het ID
     (begint met `wrkspc_...` resp. `apikey_...`).

3. **Secrets toevoegen in Supabase**
   Supabase-dashboard → **Edge Functions → Secrets**:

   | Naam | Waarde |
   |---|---|
   | `ANTHROPIC_ADMIN_API_KEY` | de sleutel uit stap 1 |
   | `TOKEN_STATUS_PASSWORD` | een zelfgekozen wachtwoord — vul je straks in op de token-status-pagina |
   | `PROJECT_MAP` | JSON die ID's koppelt aan een project, bv.:<br>`{"wrkspc_xxx":"boodschappen","wrkspc_yyy":"kennisbank"}` |

   Alles dat niet in `PROJECT_MAP` staat, wordt getoond als "overig".

4. **Functie aanmaken**
   - Edge Functions → **Create a new function** → naam exact: `usage-report`.
   - Plak de inhoud van `index.ts` in de editor.
   - **Zet "Verify JWT" UIT** (de functie doet zelf een wachtwoordcheck).
   - **Deploy**.

5. **Pagina koppelen**
   - Open de token-status-pagina → **Live vanuit Anthropic Console** →
     vul de functie-URL in (Supabase-dashboard → Edge Functions →
     `usage-report` → **Details** voor de exacte URL, iets als
     `https://xxxxx.supabase.co/functions/v1/usage-report`) en het
     wachtwoord uit stap 3.

## Kosten & verversing

Het aanroepen van deze functie kost zelf niets extra bij Anthropic (het is
alleen een rapportage-endpoint). Nieuwe API-aanroepen zijn na ongeveer 5
minuten zichtbaar in het rapport.
