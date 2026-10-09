import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { CONSIGNE_DOCUMENT, nettoyer, nettoyerEmetteur, totauxDe, numeroDevis } from "@/lib/documents";
import type { Sorte } from "@/lib/documents";
import { noterPanne } from "@/lib/panne";

/* Fabrique le document à partir de la conversation.

   Un appel à part, et pas un morceau de /api/chat : la conversation doit
   rester rapide et parlée, tandis qu'un document se fabrique une seule fois,
   prend plus de jetons, et n'a pas à passer par la voix. */
export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as {
      sorte?: string;
      history?: Array<{ role: string; text: string }>;
      emetteur?: unknown;
      tva?: boolean;
    };
    const sorte: Sorte = body.sorte === "lettre" ? "lettre"
      : body.sorte === "facture" ? "facture"
      : body.sorte === "mail" ? "mail"
      : body.sorte === "message" ? "message" : "devis";

    const provider = (process.env.BIA_LLM_PROVIDER || "anthropic").toLowerCase();
    const compatible = provider === "cerebras" || provider === "groq";
    const apiKey = compatible ? (provider === "cerebras" ? process.env.CEREBRAS_API_KEY : process.env.GROQ_API_KEY)
      : process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
    const model = process.env.BIA_LLM_MODEL || "claude-sonnet-5";
    if (!apiKey) return NextResponse.json({ erreur: "clé absente" }, { status: 500 });

    /* Toute la conversation, pas seulement la dernière phrase : les
       renseignements d'un devis se donnent en plusieurs fois — le nom du
       client au début, le prix trois questions plus loin. */
    const fil = (body.history || []).slice(-24)
      .map((m) => `${m.role === "bia" ? "BIA" : "La personne"} : ${String(m.text || "").slice(0, 1200)}`)
      .join("\n");
    if (!fil.trim()) return NextResponse.json({ erreur: "rien à écrire" }, { status: 400 });

    const response = compatible ? await fetch(
      provider === "cerebras" ? "https://api.cerebras.ai/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST", signal: AbortSignal.timeout(45000),
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: provider === "cerebras" ? (process.env.CEREBRAS_MODEL || "gpt-oss-120b") : (process.env.GROQ_MODEL || "openai/gpt-oss-120b"),
          max_completion_tokens: 4096,
          ...(provider === "cerebras" ? { reasoning_format: "hidden" } : {}),
          messages: [{role: "system", content: CONSIGNE_DOCUMENT}, {role: "user", content: `LA CONVERSATION\n${fil}\n\nFabrique le ${sorte}.`}],
        }),
      },
    ) : await fetch(
      `${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST", signal: AbortSignal.timeout(45000),
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: 1600,
          system: CONSIGNE_DOCUMENT,
          messages: [{ role: "user", content: `LA CONVERSATION\n${fil}\n\nFabrique le ${sorte}.` }],
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      noterPanne(response.status, detail, "document");
      return NextResponse.json({ erreur: `modèle ${response.status}` }, { status: 502 });
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; content?: Array<{ type: string; text?: string }> };
    const complet = compatible ? String(data.choices?.[0]?.message?.content || "").trim() : (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n").trim();

    /* Le modèle glisse parfois le JSON dans un bloc de code, ou ajoute une
       phrase avant. On prend le premier objet complet et on ignore le reste. */
    /* CES TROIS ÉCHECS ÉTAIENT MUETS, ET C'ÉTAIT LE VRAI DÉFAUT.

       Le 10 septembre 2026, « Le papier n'a pas pu être fabriqué » s'affichait
       sans que rien n'apparaisse dans les journaux : le modèle avait répondu,
       donc aucune panne n'était notée, et il n'y avait aucun moyen de savoir
       ce qu'il avait dit. On note désormais le début de sa réponse — c'est la
       seule chose qui permette de comprendre, après coup, pourquoi le papier
       n'est pas sorti. */
    const debut = complet.indexOf("{");
    const fin = complet.lastIndexOf("}");
    if (debut < 0 || fin <= debut) {
      noterPanne(`${sorte} : pas de JSON`, complet.slice(0, 400) || "(réponse vide)", "document");
      return NextResponse.json({ erreur: "pas de document" }, { status: 502 });
    }

    let brut: unknown;
    try { brut = JSON.parse(complet.slice(debut, fin + 1)); }
    catch {
      noterPanne(`${sorte} : JSON illisible`, complet.slice(debut, debut + 400), "document");
      return NextResponse.json({ erreur: "document illisible" }, { status: 502 });
    }

    const doc = nettoyer(brut, sorte);
    if (!doc) {
      /* Le JSON était bon mais vide de ce qui compte : pas une seule ligne
         pour un devis, pas un paragraphe pour une lettre. C'est presque
         toujours que la conversation ne disait pas encore de quoi écrire. */
      noterPanne(`${sorte} : rien à mettre dedans`, complet.slice(debut, debut + 400), "document");
      return NextResponse.json({ erreur: "document vide" }, { status: 502 });
    }
    if (doc.type === "devis" && doc.nature !== "facture" && !doc.numero) doc.numero = numeroDevis();

    /* SES RENSEIGNEMENTS À LUI VIENNENT DE L'APPAREIL, PAS DU MODÈLE.
       Le nom, le métier, le téléphone, le NINEA, le registre de commerce : il
       les a donnés une fois, ils sont gardés sur son téléphone, et ils sont
       posés ici tels quels. Laisser un modèle les répéter de mémoire, c'est
       accepter qu'un chiffre de NINEA change d'un devis à l'autre. */
    const sien = nettoyerEmetteur(body.emetteur);
    if (sien) {
      if (doc.type === "devis") doc.emetteur = sien;
      else if (doc.type === "lettre") doc.expediteur = sien;
      // Un message ne porte pas d'en-tête : il n'a personne à qui l'attacher.
    }
    // De même pour la TVA : un réglage de l'émetteur, jamais une décision du modèle.
    if (doc.type === "devis") doc.tva = Boolean(body.tva);

    // Les totaux sont calculés ICI, jamais par le modèle.
    const totaux = doc.type === "devis" ? totauxDe(doc) : null;
    return NextResponse.json({ document: doc, totaux });
  } catch (err) {
    console.error("BIA — document :", (err as Error).message);
    return NextResponse.json({ erreur: "inattendue" }, { status: 500 });
  }
}
