// Supabase Edge Function: parse-recipe
// Haalt een recept-URL op en zet die met de Claude API om naar het app-format (2 personen).
//
// Benodigde secret:  ANTHROPIC_API_KEY   (jouw Anthropic API-sleutel)
// Auto-aanwezig:      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy met "Verify JWT" UIT (de functie doet zelf een lichte toegangscheck op basis
// van de gedeelde code/household).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { url, household } = await req.json();
    if (!url || !/^https?:\/\//i.test(url)) return json({ error: "Geen geldige link" }, 400);

    // Lichte toegangscontrole: de gedeelde code moet bestaan in de database
    // (dus iemand is ingelogd met het juiste wachtwoord). Bij twijfel: gewoon doorgaan.
    if (household) {
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data, error } = await admin
          .from("app_kv").select("k").eq("household", household).limit(1);
        if (!error && (!data || data.length === 0)) {
          return json({ error: "Niet ingelogd (onbekende code)" }, 403);
        }
      } catch (_) { /* check faalt -> toch doorgaan */ }
    }

    // Pagina ophalen
    let html = "";
    try {
      const page = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 BoodschappenApp" } });
      if (!page.ok) return json({ error: "Pagina niet bereikbaar (" + page.status + ")" }, 400);
      html = await page.text();
    } catch (_) {
      return json({ error: "Pagina niet bereikbaar" }, 400);
    }

    // og:image (foto van het gerecht) eruit halen
    let image = "";
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (og) image = og[1];

    // HTML strippen naar platte tekst (scheelt tokens)
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 12000);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "AI niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt)" }, 500);

    const sys = `Je zet een recept om naar strikte JSON voor een boodschappen-app. Antwoord UITSLUITEND met JSON, geen uitleg, geen tekst eromheen.
Vorm:
{"title":"...","time":"ca. X min","meal":"ontbijt|lunch|diner|tussendoor","emoji":"één passende emoji","ing":[{"q":getal-of-null,"u":"eenheid-of-lege-string","n":"ingrediëntnaam","c":"groente|vlees|zuivel|pasta|pot|voorraad"}],"steps":["stap 1","stap 2"]}
Regels:
- Reken ALLE hoeveelheden om naar 2 personen (ook de getallen in de bereidingsstappen).
- c = supermarktcategorie: groente (groente & fruit), vlees (vlees & vis), zuivel (zuivel & gekoeld), pasta (pasta, rijst, aardappelen), pot (potten, blikken, sauzen), voorraad (noten, kruiden, olie, voorraad).
- q = getal (decimaal mag, bijv 0.5) of null als er geen hoeveelheid is (bijv "peper naar smaak").
- u = eenheid (g, ml, el, tl, teen, stuks, blik, ...) of lege string.
- Schrijf alles in het Nederlands. Verzin niets wat niet in het recept staat.`;

    let resp: Response;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          system: sys,
          messages: [{ role: "user", content: "Recept van deze pagina (" + url + "):\n\n" + text }],
        }),
      });
    } catch (e) {
      return json({ error: "AI niet bereikbaar" }, 502);
    }
    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: "AI-fout " + resp.status + ": " + t.slice(0, 200) }, 502);
    }
    const data = await resp.json();
    const out = (data.content && data.content[0] && data.content[0].text) || "";
    const s = out.indexOf("{"), e = out.lastIndexOf("}");
    if (s < 0 || e < 0) return json({ error: "AI gaf geen bruikbaar recept terug" }, 502);
    let recipe: any;
    try { recipe = JSON.parse(out.slice(s, e + 1)); }
    catch (_) { return json({ error: "AI-antwoord niet leesbaar" }, 502); }
    if (image && !recipe.image) recipe.image = image;
    recipe.source = url;
    return json({ recipe });
  } catch (e) {
    return json({ error: String(e && (e as Error).message ? (e as Error).message : e) }, 500);
  }
});
