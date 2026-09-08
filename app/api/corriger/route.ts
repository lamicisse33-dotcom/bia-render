import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { ajouterCorrection } from "@/lib/lexique";

/* Un locuteur natif donne la bonne formulation. C'est la brique la plus utile
   du projet : chaque correction améliore les réponses suivantes. */
export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as {
      source?: string; proposee?: string; corrigee?: string; langue?: string; auteur?: string;
    };
    const source = String(body.source || "").trim().slice(0, 1200);
    const corrigee = String(body.corrigee || "").trim().slice(0, 1200);
    if (!source || !corrigee) {
      return NextResponse.json({ erreur: "Il faut la question et la bonne formulation." }, { status: 400 });
    }

    await ajouterCorrection({
      source, corrigee,
      proposee: String(body.proposee || "").slice(0, 1200) || null,
      langue: body.langue || null,
      auteur: String(body.auteur || "").slice(0, 60) || null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("BIA — la correction n'a pas été gardée :", (err as Error).message);
    return NextResponse.json({ erreur: (err as Error).message }, { status: 502 });
  }
}
