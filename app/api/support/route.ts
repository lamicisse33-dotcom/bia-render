import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { compter, consigneSupport, estModele, nettoyerSupport } from "@/lib/supports";
import type { ModeleSupport } from "@/lib/supports";
import { noterPanne } from "@/lib/panne";

/* ── BIA BUSINESS : LA FABRICATION D'UN SUPPORT ─────────────────────────────

   La route jumelle de /api/document, et pour la même raison : la conversation
   doit rester rapide et parlée, tandis qu'un tableau se fabrique une fois,
   coûte plus de jetons, et n'a pas à passer par la voix.

   Une route à part de /api/document, et pas une sorte de plus : la consigne
   change entièrement d'un modèle à l'autre (les colonnes d'une fiche de stock
   n'ont rien à voir avec celles d'un calendrier), et les calculs sont faits
   par un autre fichier. Les mélanger aurait donné une route que personne ne
   peut plus lire. */
export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as {
      modele?: string;
      history?: Array<{ role: string; text: string }>;
      boutique?: string;
    };
    if (!estModele(body.modele)) {
      return NextResponse.json({ erreur: "modèle inconnu" }, { status: 400 });
    }
    const modele: ModeleSupport = body.modele;

    const apiKey = process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
    const model = process.env.BIA_LLM_MODEL || "claude-sonnet-5";
    if (!apiKey) return NextResponse.json({ erreur: "clé absente" }, { status: 500 });

    /* Toute la conversation, comme pour le devis : un commerçant donne son
       stock produit par produit, sur plusieurs tours de parole. La dernière
       phrase seule ne contient presque jamais le tableau entier. */
    const fil = (body.history || []).slice(-30)
      .map((m) => `${m.role === "bia" ? "BIA" : "La personne"} : ${String(m.text || "").slice(0, 1200)}`)
      .join("\n");
    if (!fil.trim()) return NextResponse.json({ erreur: "rien à écrire" }, { status: 400 });

    const response = await fetch(
      `${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          /* Plus large que pour un devis : un inventaire de trente produits
             avec ses notes en wolof ne tient pas dans 1600 jetons, et une
             réponse coupée au milieu du JSON ne se rattrape pas. */
          max_tokens: 3000,
          system: consigneSupport(modele),
          messages: [{
            role: "user",
            content: `LA CONVERSATION\n${fil}\n\nFabrique le support.`,
          }],
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      noterPanne(response.status, detail, "support");
      return NextResponse.json({ erreur: `modèle ${response.status}` }, { status: 502 });
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const complet = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n").trim();

    /* Les trois échecs sont notés séparément, avec le début de ce que le
       modèle a répondu : sans ça, « le tableau n'a pas pu être fabriqué » est
       un mur, et on ne sait jamais lequel des trois s'est produit. */
    const debut = complet.indexOf("{");
    const fin = complet.lastIndexOf("}");
    if (debut < 0 || fin <= debut) {
      noterPanne(`${modele} : pas de JSON`, complet.slice(0, 400) || "(réponse vide)", "support");
      return NextResponse.json({ erreur: "pas de document" }, { status: 502 });
    }

    let brut: unknown;
    try { brut = JSON.parse(complet.slice(debut, fin + 1)); }
    catch {
      noterPanne(`${modele} : JSON illisible`, complet.slice(debut, debut + 400), "support");
      return NextResponse.json({ erreur: "document illisible" }, { status: 502 });
    }

    const support = nettoyerSupport(brut, modele);
    if (!support) {
      noterPanne(`${modele} : aucune ligne`, complet.slice(debut, debut + 400), "support");
      return NextResponse.json({ erreur: "document vide" }, { status: 502 });
    }

    /* Le nom de la boutique vient de l'appareil quand il y est, comme le
       NINEA sur un devis : c'est un renseignement donné une fois, et un
       modèle qui le répète de mémoire finit par l'écrire autrement. */
    const sien = String(body.boutique || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (sien) support.boutique = sien;

    /* Les calculs sont faits ICI, jamais par le modèle — reste de stock,
       marge, encaissé, à recouvrer. Ils repartent avec le tableau pour que le
       premier affichage soit déjà juste, et ils sont refaits dans le
       téléphone à chaque correction. */
    return NextResponse.json({ document: support, compte: compter(support) });
  } catch (err) {
    console.error("BIA — support :", (err as Error).message);
    return NextResponse.json({ erreur: "inattendue" }, { status: 500 });
  }
}
