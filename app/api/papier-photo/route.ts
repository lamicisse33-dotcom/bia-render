import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { noterPanne } from "@/lib/panne";

/* ── PHOTOGRAPHIER UN PAPIER, L'ENTENDRE EN WOLOF ───────────────────────────

   Demandé par Lamine le 10 septembre 2026 : « BIA doit être capable de
   photographier un document, pour le traduire à haute voix en wolof, ou pour
   le scanner et le garder. Par exemple un dossier, ou un papier qu'on te
   donne : tu le photographies et elle te le traduit en wolof. »

   C'est le même service que le texte collé, mais pour ce qui arrive sur du
   papier — et ici, presque tout arrive sur du papier. Une convocation, une
   ordonnance, un bulletin scolaire, un contrat, une facture d'électricité,
   une lettre d'huissier. Aujourd'hui la personne attend le soir que
   quelqu'un le lui lise, et parfois elle n'ose pas demander.

   DEUX CHOSES REVIENNENT, ET C'EST VOULU. Le français, mot pour mot : c'est
   la trace, elle sera gardée et pourra être relue, corrigée, envoyée. Et le
   wolof, qui sera dit à voix haute. Ne renvoyer que le wolof reviendrait à
   perdre le document lui-même. */

const CONSIGNE = `Tu lis un papier photographié et tu le dis en wolof de Dakar.

Quelqu'un a reçu ce papier — une convocation, une ordonnance, un bulletin, un
contrat, une facture, une lettre — et il ne le lit pas bien. Tu le lui lis.

CE QUE TU RENDS
Un objet JSON, rien d'autre, sans un mot avant ni après, sans balise de code :
{
  "titre": "de quel papier il s'agit, en trois mots",
  "francais": "ce que le papier dit, en français",
  "wolof": "la même chose, dite en wolof de Dakar"
}

LE FRANÇAIS. Tu RECOPIES ce qui est écrit, tu ne résumes pas et tu
n'interprètes pas. Garde tous les montants, dates, heures, noms, numéros de
dossier, adresses et échéances, exactement comme ils sont écrits. Garde les
paragraphes. Si un mot est illisible sur la photo, écris [illisible] à sa
place — n'invente jamais un chiffre ni un nom : sur un papier
d'administration, un chiffre inventé peut coûter très cher à quelqu'un.

LE WOLOF. Le même contenu, dit comme on parle à Dakar aujourd'hui : phrases
courtes, virgules là où l'on respire, car ce sera lu à voix haute. Les mots de
l'administration, de la banque, de l'école, de la médecine et du droit se
disent EN FRANÇAIS au milieu du wolof — rendez-vous, dossier, ordonnance,
échéance, virement — comme tout le monde le fait ici. Les chiffres et les
dates aussi. Pas un mot de wolof ancien ou de dictionnaire ; au moindre doute,
le français.

CE QUE TU N'AJOUTES JAMAIS. Aucun conseil, aucun avis, aucun commentaire, ni
en français ni en wolof. Tu n'es pas en train de discuter : tu lis. Si le
papier est inquiétant, il reste inquiétant — ce n'est pas à toi de rassurer ni
d'alarmer. Si la personne veut ton avis, elle te le demandera après.

SI CE N'EST PAS UN PAPIER. Si la photo ne montre aucun texte lisible, réponds
{"titre":"", "francais":"", "wolof":"Xool naa nataal bi, waaye gisuma benn
mbind bu leer. Jéemal jël ko bu baax, ci leer gu neex."}`;

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as { image?: string; type?: string };
    const image = String(body.image || "");
    /* Le téléphone envoie du JPEG réduit : on n'accepte que ce que le modèle
       sait lire, et on refuse ce qui est manifestement trop lourd avant même
       de payer l'appel. */
    const type = ["image/jpeg", "image/png", "image/webp"].includes(String(body.type))
      ? String(body.type) : "image/jpeg";
    if (!image) return NextResponse.json({ erreur: "pas d'image" }, { status: 400 });
    if (image.length > 7_000_000) {
      return NextResponse.json({ erreur: "photo trop lourde" }, { status: 413 });
    }

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
          max_tokens: 2400,
          system: CONSIGNE,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: type, data: image } },
              { type: "text", text: "Lis ce papier." },
            ],
          }],
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      noterPanne(response.status, detail);
      return NextResponse.json({ erreur: `modèle ${response.status}` }, { status: 502 });
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const complet = (data.content || []).filter((b) => b.type === "text")
      .map((b) => b.text || "").join("\n").trim();

    const debut = complet.indexOf("{");
    const fin = complet.lastIndexOf("}");
    if (debut < 0 || fin <= debut) return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 });

    let brut: unknown;
    try { brut = JSON.parse(complet.slice(debut, fin + 1)); }
    catch { return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 }); }

    const o = (brut ?? {}) as Record<string, unknown>;
    const propre = (v: unknown, max: number) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
    const wolof = propre(o.wolof, 6000);
    if (!wolof) return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 });

    return NextResponse.json({
      titre: propre(o.titre, 120),
      francais: propre(o.francais, 8000),
      wolof,
    });
  } catch (err) {
    console.error("BIA — papier photographié :", (err as Error).message);
    return NextResponse.json({ erreur: "inattendue" }, { status: 500 });
  }
}
