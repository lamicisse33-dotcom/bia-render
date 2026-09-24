import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { CHEMIN_VALIDE, lireDansLeSeau, listeDesVoixGardees, resumeVoixGardees, retirerDuSeau } from "@/lib/voix-gardees";

/* LE STOCK DES VOIX GARDÉES — réservé au code maître.

   GET                      → le résumé et la liste des sons (chemins)
   GET ?chemin=wo/<e>.mp3   → le son lui-même (ou son .json : le texte)
   DELETE ?empreinte=<e>    → retire un son mal prononcé ; il sera refait
                              la prochaine fois qu'on le demandera

   C'est ce que lit outils/sauvegarder-voix-gardees.mjs pour recopier tout
   le stock sur le Mac. */

function maitre(request: NextRequest) {
  const v = verifierCode(request.headers.get("x-bia-code"));
  return v.ok && v.maitre;
}

export async function GET(request: NextRequest) {
  if (!maitre(request)) return NextResponse.json({ erreur: "code maître" }, { status: 401 });
  const chemin = request.nextUrl.searchParams.get("chemin");
  try {
    if (chemin) {
      if (!CHEMIN_VALIDE.test(chemin)) return NextResponse.json({ erreur: "chemin" }, { status: 400 });
      const r = await lireDansLeSeau(chemin);
      if (!r) return NextResponse.json({ erreur: "absent" }, { status: 404 });
      return new NextResponse(Buffer.from(await r.arrayBuffer()), {
        headers: { "content-type": chemin.endsWith(".mp3") ? "audio/mpeg" : "application/json" },
      });
    }
    const liste = await listeDesVoixGardees();
    return NextResponse.json({ resume: resumeVoixGardees(), sons: liste });
  } catch (e) {
    return NextResponse.json({ erreur: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!maitre(request)) return NextResponse.json({ erreur: "code maître" }, { status: 401 });
  const e = request.nextUrl.searchParams.get("empreinte") || "";
  const ok = await retirerDuSeau(e);
  return NextResponse.json({ retire: ok }, { status: ok ? 200 : 400 });
}
