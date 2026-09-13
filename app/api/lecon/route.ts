import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { noterPanne } from "@/lib/panne";
import {
  Lecon, ceQuiCloche, cleDepuis, deposerLecon, lecconQuiRepond, lecconsActives, listerLecons,
  nettoyer, retirerLecon,
} from "@/lib/lecons";

/* ── LA PORTE DE LA PAGE D'APPRENTISSAGE ────────────────────────────────────

   Lamine, le 13 septembre 2026 : « je veux que moi uniquement je puisse lui
   donner ces instructions-là, avec mon compte maître. Les testeurs n'auront
   pas accès à cette partie. »

   Donc : code maître exigé sur les TROIS gestes, pas seulement sur celui qui
   écrit. Lire les leçons, c'est lire ce qu'il est en train d'apprendre à BIA —
   ça ne regarde pas un testeur non plus.

   Et la vérification est ici, côté serveur. Cacher le bouton dans la page ne
   protège rien : qui connaît l'adresse de la route s'en passe.            */
function refusePourLesAutres(request: NextRequest): NextResponse | null {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "Cette page est réservée au code maître." }, { status: 401 });
  }
  return null;
}

/* Le message à afficher quand le seau n'existe pas encore. Il vaut mieux
   qu'il lise la marche à suivre que « 404 ». */
const SANS_SEAU = "Le seau « lecons » n'existe pas encore dans Supabase."
  + " Storage → New bucket → nom « lecons », public ÉTEINT. Rien d'autre à faire.";

export async function GET(request: NextRequest) {
  const refus = refusePourLesAutres(request);
  if (refus) return refus;
  if (!lecconsActives()) {
    return NextResponse.json({ erreur: "Supabase n'est pas configuré sur ce serveur.", lecons: [] });
  }
  try {
    const lecons = await listerLecons();
    /* « ESSAIE » — voir lecconQuiRepond(). Le téléphone ne refait PAS le
       calcul de son côté : un double dirait « elle retrouve » là où BIA ne
       retrouvera pas. */
    const essai = new URL(request.url).searchParams.get("essai");
    if (essai !== null) {
      const trouve = lecconQuiRepond(essai, lecons);
      return NextResponse.json({
        essai,
        trouve: trouve ? { cle: trouve.lecon.cle, titre: trouve.lecon.titre, forme: trouve.forme } : null,
      });
    }
    return NextResponse.json({ lecons });
  } catch (err) {
    const motif = (err as Error).message;
    console.error("BIA — les leçons ne se lisent pas :", motif);
    noterPanne("lecture des leçons", motif.slice(0, 300), "lecon");
    return NextResponse.json(
      { erreur: /404|not found|Bucket/i.test(motif) ? SANS_SEAU : motif, lecons: [] },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const refus = refusePourLesAutres(request);
  if (refus) return refus;
  try {
    const recu = await request.json() as Partial<Lecon>;
    /* LA CLÉ SE FABRIQUE ICI, PAS DANS LE TÉLÉPHONE. Elle sert de nom de
       fichier et de nom de son : si deux endroits la calculaient, ils
       finiraient par ne plus calculer la même, et une leçon corrigée
       s'écrirait à côté de l'ancienne au lieu de la remplacer. */
    const titre = String(recu.titre || "").trim();
    const lecon = nettoyer({
      cle: String(recu.cle || "").trim() || cleDepuis(titre),
      titre,
      dit: Array.isArray(recu.dit) ? recu.dit : [],
      repond: Array.isArray(recu.repond) ? recu.repond : [],
      quand: new Date().toISOString(),
      version: Number(recu.version || 0) + 1,
    });
    const griefs = ceQuiCloche(lecon);
    if (griefs.length) return NextResponse.json({ erreur: griefs.join(" ; ") }, { status: 400 });

    await deposerLecon(lecon);
    return NextResponse.json({ lecon });
  } catch (err) {
    const motif = (err as Error).message;
    console.error("BIA — la leçon n'a pas pu être gardée :", motif);
    noterPanne("dépôt d'une leçon", motif.slice(0, 300), "lecon");
    return NextResponse.json(
      { erreur: /404|not found|Bucket/i.test(motif) ? SANS_SEAU : motif },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const refus = refusePourLesAutres(request);
  if (refus) return refus;
  const cle = new URL(request.url).searchParams.get("cle") || "";
  if (!cle) return NextResponse.json({ erreur: "Quelle leçon ?" }, { status: 400 });
  try {
    await retirerLecon(cle);
    return NextResponse.json({ retiree: cle });
  } catch (err) {
    return NextResponse.json({ erreur: (err as Error).message }, { status: 502 });
  }
}
