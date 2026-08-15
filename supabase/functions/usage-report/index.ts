// Supabase Edge Function: usage-report
// Haalt gebruik/kosten op bij de Anthropic Usage & Cost Admin API en geeft
// alleen samengevatte, per-project gelabelde bedragen terug aan de client.
// De Admin-sleutel, workspace-ID's en API-key-ID's verlaten deze functie nooit.
//
// Benodigde secrets (Supabase-dashboard → Edge Functions → Secrets):
//   ANTHROPIC_ADMIN_API_KEY   je Admin API-sleutel (sk-ant-admin01-...)
//   TOKEN_STATUS_PASSWORD     zelfgekozen wachtwoord dat de pagina moet meesturen
//   PROJECT_MAP               JSON, bv. {"wrkspc_abc...":"boodschappen","apikey_def...":"kennisbank"}
//
// Deploy met "Verify JWT" UIT (de functie doet zelf een wachtwoordcheck).

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

const ANTHROPIC_VERSION = "2023-06-01";
const USER_AGENT = "token-status/1.0 (https://github.com/65RuudKoene/token-status)";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// Haalt alle pagina's van het cost_report endpoint op voor de opgegeven periode.
async function fetchCostReport(adminKey: string, startingAt: string, endingAt: string) {
  const results: any[] = [];
  let page: string | undefined;
  for (let i = 0; i < 20; i++) {
    const params = new URLSearchParams({
      starting_at: startingAt,
      ending_at: endingAt,
      bucket_width: "1d",
    });
    params.append("group_by[]", "workspace_id");
    params.append("group_by[]", "description");
    if (page) params.set("page", page);

    const resp = await fetch(
      "https://api.anthropic.com/v1/organizations/cost_report?" + params.toString(),
      {
        headers: {
          "x-api-key": adminKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "User-Agent": USER_AGENT,
        },
      },
    );
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error("Anthropic cost_report " + resp.status + ": " + t.slice(0, 300));
    }
    const data = await resp.json();
    for (const bucket of data.data || []) {
      for (const r of bucket.results || []) {
        results.push({ ...r, starting_at: bucket.starting_at });
      }
    }
    if (!data.has_more || !data.next_page) break;
    page = data.next_page;
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Gebruik POST" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    const expected = Deno.env.get("TOKEN_STATUS_PASSWORD") || "";
    if (!expected || password !== expected) {
      return json({ error: "Onjuist wachtwoord" }, 403);
    }

    const adminKey = Deno.env.get("ANTHROPIC_ADMIN_API_KEY");
    if (!adminKey) return json({ error: "Niet geconfigureerd (ANTHROPIC_ADMIN_API_KEY ontbreekt)" }, 500);

    let projectMap: Record<string, string> = {};
    try {
      projectMap = JSON.parse(Deno.env.get("PROJECT_MAP") || "{}");
    } catch (_) {
      return json({ error: "PROJECT_MAP secret is geen geldige JSON" }, 500);
    }

    let days = parseInt(body?.days, 10);
    if (!Number.isFinite(days) || days <= 0) days = 30;
    days = Math.min(days, 31);

    const ending = new Date();
    ending.setUTCHours(0, 0, 0, 0);
    ending.setUTCDate(ending.getUTCDate() + 1); // t/m vandaag
    const starting = new Date(ending);
    starting.setUTCDate(starting.getUTCDate() - days);

    const startingAt = starting.toISOString();
    const endingAt = ending.toISOString();

    const rows = await fetchCostReport(adminKey, startingAt, endingAt);

    const byProject: Record<string, number> = { boodschappen: 0, kennisbank: 0, overig: 0 };
    const byDayMap: Record<string, Record<string, number>> = {};
    const byModelMap: Record<string, number> = {};
    let totalUSD = 0;

    for (const r of rows) {
      const cents = parseFloat(r.amount) || 0;
      const usd = cents / 100;
      if (usd === 0) continue;

      const project = projectMap[r.workspace_id] || "overig";
      byProject[project] = (byProject[project] || 0) + usd;
      totalUSD += usd;

      const day = dayKey(r.starting_at);
      if (!byDayMap[day]) byDayMap[day] = { boodschappen: 0, kennisbank: 0, overig: 0 };
      byDayMap[day][project] = (byDayMap[day][project] || 0) + usd;

      if (r.model) byModelMap[r.model] = (byModelMap[r.model] || 0) + usd;
    }

    const byDay = Object.keys(byDayMap)
      .sort()
      .map((date) => ({ date, ...byDayMap[date] }));

    const byModel = Object.entries(byModelMap)
      .map(([model, usd]) => ({ model, usd }))
      .sort((a, b) => b.usd - a.usd);

    return json({
      range: { startingAt, endingAt, days },
      totalUSD,
      byProject,
      byDay,
      byModel,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: String(e && (e as Error).message ? (e as Error).message : e) }, 502);
  }
});
