import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { noterPanne } from "@/lib/panne";

/* « OU BIEN QU'ELLE NOUS PROPOSE UNE AUTRE FAÇON DE LE DIRE EN WOLOF »

   Idée de Lamine, le 10 septembre 2026. Corriger le wolof de BIA demandait
   jusqu'ici de retaper toute une phrase wolof sur un clavier de téléphone —
   c'est-à-dire que presque personne ne le faisait, et que la seule mécanique
   capable de faire progresser sa langue restait à l'arrêt.

   Ici, elle propose elle-même trois autres façons de dire LA MÊME CHOSE, plus
   proches de la rue. Le correcteur n'écrit plus : il choisit, et il retouche
   un mot s'il veut. Écrire une phrase est un travail ; en reconnaître une
   bonne est immédiat — et un locuteur natif reconnaît toujours.

   Ce n'est pas BIA qui se corrige toute seule : rien n'est gardé tant qu'un
   humain n'a pas choisi. Elle propose, il tranche. */

const CONSIGNE = `Tu redis une phrase en wolof urbain de Dakar, autrement.

On te donne une phrase que tu viens de dire et qu'un locuteur natif juge mal
dite : trop livresque, trop ancienne, ou simplement pas ce qu'on dirait ici.

Propose TROIS autres façons de dire EXACTEMENT LA MÊME CHOSE. Même sens, même
longueur à peu près. Ce qui change, c'est la langue :

1. La première : le wolof de tous les jours, celui d'un taxi ou d'un marché.
2. La deuxième : encore plus relâchée, avec les mots français que les gens
   emploient vraiment au milieu de leur wolof.
3. La troisième : la plus courte possible, sans rien perdre du sens.

RÈGLES. Pas un mot de wolof ancien, savant ou de dictionnaire. Devant le
moindre doute sur un mot, prends le français : c'est ainsi qu'on parle à Dakar
et personne ne te le reprochera. Ne change pas le fond, ne rajoute rien,
n'enlève rien de ce qui est dit.

Réponds UNIQUEMENT par un tableau JSON de trois chaînes, sans un mot avant ni
après, sans balise de code :
["première", "deuxième", "troisième"]`;

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as { texte?: string; question?: string };
    const texte = String(body.texte || "").trim().slice(0, 1200);
    const question = String(body.question || "").trim().slice(0, 600);
    if (!texte) return NextResponse.json({ erreur: "rien à redire" }, { status: 400 });

    const apiKey = process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
    const model = process.env.BIA_LLM_MODEL || "claude-sonnet-5";
    if (!apiKey) return NextResponse.json({ erreur: "clé absente" }, { status: 500 });

    const response = await fetch(
      `${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          system: CONSIGNE,
          messages: [{
            role: "user",
            content: [
              question ? `LA QUESTION POSÉE\n${question}` : "",
              `LA PHRASE À REDIRE AUTREMENT\n${texte}`,
            ].filter(Boolean).join("\n\n"),
          }],
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      noterPanne(response.status, detail, "reformuler");
      return NextResponse.json({ erreur: `modèle ${response.status}` }, { status: 502 });
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const complet = (data.content || []).filter((b) => b.type === "text")
      .map((b) => b.text || "").join("\n").trim();

    /* Le modèle glisse parfois le tableau dans un bloc de code ou ajoute une
       phrase avant. On prend le premier tableau complet et on ignore le reste. */
    const debut = complet.indexOf("[");
    const fin = complet.lastIndexOf("]");
    if (debut < 0 || fin <= debut) return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 });

    let brut: unknown;
    try { brut = JSON.parse(complet.slice(debut, fin + 1)); }
    catch { return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 }); }

    const propositions = (Array.isArray(brut) ? brut : [])
      .map((p) => String(p ?? "").replace(/\s+/g, " ").trim().slice(0, 1200))
      .filter(Boolean)
      .slice(0, 3);
    if (!propositions.length) return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 });

    return NextResponse.json({ propositions });
  } catch (err) {
    console.error("BIA — reformulation :", (err as Error).message);
    return NextResponse.json({ erreur: "inattendue" }, { status: 500 });
  }
}
