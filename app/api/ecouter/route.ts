import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { transcrire } from "@/lib/ecoute";

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const form = await request.formData();
    const fichier = form.get("audio");
    if (!(fichier instanceof Blob)) return NextResponse.json({ erreur: "Aucun enregistrement." }, { status: 400 });
    if (fichier.size > 20 * 1024 * 1024) return NextResponse.json({ erreur: "Enregistrement trop long." }, { status: 413 });

    const indice = String(form.get("indice_langue") || "") || null;
    const reco = await transcrire(fichier, "parole.webm", indice);
    return NextResponse.json(reco);
  } catch (err) {
    console.error("BIA — l'écoute a échoué :", (err as Error).message);
    return NextResponse.json({ texte: "", erreur: (err as Error).message }, { status: 502 });
  }
}
