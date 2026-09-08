import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";

/* Condense les plus vieux échanges en quelques lignes. Sans ça, une longue
   conversation finirait par ne plus tenir dans ce qu'on peut envoyer au
   modèle, et BIA oublierait le début — c'est-à-dire souvent l'essentiel :
   qui elle a devant elle. */
export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as { echanges?: Array<{ role: string; text: string }>; resume?: string };
    const echanges = (body.echanges || []).slice(0, 60);
    if (!echanges.length) return NextResponse.json({ resume: body.resume || "" });

    const apiKey = process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ resume: body.resume || "" });

    const transcription = echanges
      .map((e) => `${e.role === "bia" ? "BIA" : "Personne"} : ${String(e.text || "").slice(0, 600)}`)
      .join("\n");

    const consigne = `Tu tiens les notes de BIA sur la personne à qui elle parle.
À partir de la conversation, écris en français un mémo court — dix lignes au maximum —
qui garde SEULEMENT ce qui servira dans des conversations futures :
son prénom, sa langue, son travail, sa ville, sa situation, ses projets, ses goûts,
ce qu'elle a demandé et ce qui a été décidé.
Ne garde pas le bavardage, les salutations, ni les explications que BIA a données.
Si des notes antérieures existent, fonds-les avec les nouvelles sans rien perdre
et sans répéter. Réponds par le mémo seul, sans préambule.`;

    const messages = [{
      role: "user",
      content: (body.resume ? `NOTES ANTÉRIEURES\n${String(body.resume).slice(0, 2000)}\n\n` : "")
        + `CONVERSATION\n${transcription}`,
    }];

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.BIA_LLM_MODEL || "claude-sonnet-5",
        max_tokens: 600, temperature: 0.2, system: consigne, messages,
      }),
    });
    if (!r.ok) {
      console.error("BIA — résumé refusé :", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return NextResponse.json({ resume: body.resume || "" });
    }
    const data = await r.json() as { content?: Array<{ type: string; text?: string }> };
    const resume = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n").trim();
    return NextResponse.json({ resume: resume || body.resume || "" });
  } catch {
    return NextResponse.json({ resume: "" });
  }
}
