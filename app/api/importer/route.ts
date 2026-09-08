import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { ajouterCorrection, correctionExacte } from "@/lib/lexique";

/* Verse dans la table commune les corrections déjà accumulées ailleurs —
   le data/lexique.json de l'Interprète, par exemple. Réservé au code maître.

   Les doublons sont écartés : réimporter le même fichier deux fois ne gonfle
   pas la base. */
export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok || !verdict.maitre) {
      return NextResponse.json({ erreur: "Réservé au code maître." }, { status: 403 });
    }

    const body = await request.json() as {
      entrees?: Array<{ source?: string; corrigee?: string; langue_source?: string; langue?: string; auteur?: string }>;
      application?: string;
    };
    const entrees = (body.entrees || []).slice(0, 2000);
    if (!entrees.length) return NextResponse.json({ erreur: "Aucune entrée." }, { status: 400 });

    let ajoutees = 0, deja = 0, ignorees = 0;
    for (const e of entrees) {
      const source = String(e.source || "").trim();
      const corrigee = String(e.corrigee || "").trim();
      if (!source || !corrigee) { ignorees += 1; continue; }
      if (await correctionExacte(source)) { deja += 1; continue; }
      await ajouterCorrection({
        source, corrigee,
        langue: e.langue_source || e.langue || null,
        auteur: e.auteur || null,
        application: body.application || "interprete",
      });
      ajoutees += 1;
    }
    return NextResponse.json({ ajoutees, deja, ignorees });
  } catch (err) {
    return NextResponse.json({ erreur: (err as Error).message }, { status: 502 });
  }
}
