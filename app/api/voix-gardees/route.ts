import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { retirerLaReponse } from "@/lib/reponses-gardees";
import { CHEMIN_VALIDE, lireDansLeSeau, listeDesVoixGardees, resumeVoixGardees, retirerDuSeau, retirerLaPhrase } from "@/lib/voix-gardees";

/* LE STOCK DES VOIX GARDÉES — réservé au code maître.

   GET                      → le résumé et la liste des sons (chemins)
   GET ?chemin=wo/<e>.mp3   → le son lui-même (ou son .json : le texte)
   DELETE ?empreinte=<e>    → retire un son mal prononcé ; il sera refait
                              la prochaine fois qu'on le demandera
   DELETE ?reponse=<e>      → retire une réponse gardée (lib/reponses-gardees.ts)
   POST { texte }           → « Mal dit » : retire tous les sons de cette phrase

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
  const rep = request.nextUrl.searchParams.get("reponse");
  if (rep) {
    const ok = await retirerLaReponse(rep);
    return NextResponse.json({ retire: ok }, { status: ok ? 200 : 400 });
  }
  const e = request.nextUrl.searchParams.get("empreinte") || "";
  const ok = await retirerDuSeau(e);
  return NextResponse.json({ retire: ok }, { status: ok ? 200 : 400 });
}

/* « MAL DIT » — le bouton rouge du maître. La phrase qu'elle vient de dire
   perd ses sons gardés : la prochaine fois, elle est refaite. Si c'est un mot
   que la voix dit toujours mal, c'est data/prononciation.txt qui répare. */
export async function POST(request: NextRequest) {
  if (!maitre(request)) return NextResponse.json({ erreur: "code maître" }, { status: 401 });
  try {
    const { texte } = await request.json() as { texte?: string };
    const retires = await retirerLaPhrase(String(texte || "").slice(0, 4000));
    return NextResponse.json({ retires });
  } catch (e) {
    return NextResponse.json({ erreur: (e as Error).message }, { status: 500 });
  }
}
