// Supabase Edge Function: parse-recipe
// Zet een recept om naar het app-format (2 personen) met de Claude API.
// Werkt met OF een URL (leest de pagina) OF 1-4 foto's (leest de afbeelding via vision).
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

const SYS = `Je zet een recept om naar strikte JSON voor een boodschappen-app. Antwoord UITSLUITEND met JSON, geen uitleg, geen tekst eromheen.
Vorm:
{"title":"...","time":"ca. X min","meal":"ontbijt|lunch|diner|tussendoor","emoji":"één passende emoji","ing":[{"q":getal-of-null,"u":"eenheid-of-lege-string","n":"ingrediëntnaam","c":"groente|vlees|zuivel|pasta|pot|voorraad"}],"steps":["stap 1","stap 2"]}
Regels:
- Reken ALLE hoeveelheden om naar 2 personen (ook de getallen in de bereidingsstappen).
- c = supermarktcategorie: groente (groente & fruit), vlees (vlees & vis), zuivel (zuivel & gekoeld), pasta (pasta, rijst, aardappelen), pot (potten, blikken, sauzen), voorraad (noten, kruiden, olie, voorraad).
- q = getal (decimaal mag, bijv 0.5) of null als er geen hoeveelheid is (bijv "peper naar smaak").
- u = eenheid (g, ml, el, tl, teen, stuks, blik, ...) of lege string.
- Schrijf alles in het Nederlands. Verzin niets wat niet in de bron staat.
- Als er meerdere foto's zijn, horen ze bij hetzelfde recept (bijv. voor- en achterkant); combineer de informatie.`;

const MAX_IMAGES = 4;
const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const url: string | undefined = body?.url;
    const images: Array<{ data: string; mediaType?: string }> | undefined = body?.images;
    const household: string | undefined = body?.household;

    const hasUrl = typeof url === "string" && /^https?:\/\//i.test(url);
    const hasImages = Array.isArray(images) && images.length > 0;
    if (!hasUrl && !hasImages) return json({ error: "Geen link of foto meegegeven" }, 400);

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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "AI niet geconfigureerd (ANTHROPIC_API_KEY ontbreekt)" }, 500);

    let userContent: any;
    let ogImage = "";

    if (hasImages) {
      const picked = images!.slice(0, MAX_IMAGES);
      const blocks: any[] = [];
      for (const im of picked) {
        if (!im || typeof im.data !== "string" || !im.data) continue;
        const mediaType = ALLOWED_MEDIA.has(im.mediaType || "") ? im.mediaType! : "image/jpeg";
        blocks.push({ type: "image", source: { type: "base64", media_type: mediaType, data: im.data } });
      }
      if (!blocks.length) return json({ error: "Geen bruikbare foto's ontvangen" }, 400);
      blocks.push({ type: "text", text: "Lees het recept op deze foto('s) (bijv. uit een kookboek of tijdschrift) en zet het om naar het gevraagde JSON-format." });
      userContent = blocks;
    } else {
      let html = "";
      try {
        const page = await fetch(url!, { headers: { "User-Agent": "Mozilla/5.0 BoodschappenApp" } });
        if (!page.ok) return json({ error: "Pagina niet bereikbaar (" + page.status + ")" }, 400);
        html = await page.text();
      } catch (_) {
        return json({ error: "Pagina niet bereikbaar" }, 400);
      }

      const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (og) ogImage = og[1];

      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 12000);

      userContent = "Recept van deze pagina (" + url + "):\n\n" + text;
    }

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
          system: SYS,
          messages: [{ role: "user", content: userContent }],
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
    if (hasUrl) {
      if (ogImage && !recipe.image) recipe.image = ogImage;
      recipe.source = url;
    }
    return json({ recipe });
  } catch (e) {
    return json({ error: String(e && (e as Error).message ? (e as Error).message : e) }, 500);
  }
});
