import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { noterPanne } from "@/lib/panne";

/* LIRE EN WOLOF UN MESSAGE ÉCRIT EN FRANÇAIS.

   Demandé par Lamine le 10 septembre 2026 : « elle doit pouvoir aussi copier
   un message qui parle français, le coller, pour que ça soit traduit en wolof
   à haute voix ».

   C'est le pendant exact du message qu'elle écrit : là, quelqu'un qui parle
   très bien mais lit mal le français reçoit un SMS de sa banque, de l'école,
   de l'hôpital. Aujourd'hui il attend le soir que quelqu'un le lui lise.
   Ici il colle, et il entend.

   Ce n'est PAS une conversation : elle ne répond pas, elle ne commente pas,
   elle ne conseille pas. Elle dit en wolof ce que le papier dit en français.
   Rien de plus — un mot ajouté dans un courrier d'administration peut coûter
   cher à quelqu'un. */

const CONSIGNE = `Tu dis en wolof de Dakar ce qu'un texte français raconte.

Quelqu'un a reçu ce texte — un SMS, un courriel, une lettre, un message
WhatsApp — et il ne le lit pas bien. Tu le lui dis à voix haute, dans sa
langue.

CE QUE TU FAIS
Tu rends TOUT le sens, sans rien enlever : les montants, les dates, les
heures, les noms, les numéros, ce qu'il faut faire et avant quand. Ce sont
précisément les choses qui coûtent cher quand on les manque.

CE QUE TU N'AJOUTES JAMAIS
Pas de commentaire, pas de conseil, pas d'avis, pas de « à mon avis », pas de
« tu devrais ». Tu n'es pas en train de discuter : tu lis. Si le texte est
inquiétant, il reste inquiétant ; ce n'est pas à toi de le rassurer ou de
l'aggraver.

TA LANGUE
Le wolof de la rue à Dakar, celui d'aujourd'hui — pas celui des livres, pas de
mots anciens ni de dictionnaire. Les mots de l'administration, de la banque,
de l'école, de la médecine et de la technique se disent EN FRANÇAIS au milieu
du wolof, comme tout le monde le fait ici : rendez-vous, virement, dossier,
ordonnance, facture, échéance. Les chiffres et les dates aussi, en français.
Au moindre doute sur un mot wolof, prends le français.

Phrases COURTES, avec des virgules là où l'on reprend son souffle : ce texte
sera lu à voix haute.

Commence directement, sans préambule. Réponds seulement par le texte en
wolof, rien d'autre.`;

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as { texte?: string };
    const texte = String(body.texte || "").trim().slice(0, 4000);
    if (!texte) return NextResponse.json({ erreur: "rien à lire" }, { status: 400 });

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
          max_tokens: 1400,
          system: CONSIGNE,
          messages: [{ role: "user", content: `LE TEXTE REÇU\n${texte}` }],
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      noterPanne(response.status, detail);
      return NextResponse.json({ erreur: `modèle ${response.status}` }, { status: 502 });
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const wolof = (data.content || []).filter((b) => b.type === "text")
      .map((b) => b.text || "").join("\n").trim();
    if (!wolof) return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 });

    return NextResponse.json({ wolof });
  } catch (err) {
    console.error("BIA — traduction :", (err as Error).message);
    return NextResponse.json({ erreur: "inattendue" }, { status: 500 });
  }
}
