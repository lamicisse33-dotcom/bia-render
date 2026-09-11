import { NextRequest, NextResponse } from "next/server";
import { montrer, vitrine, vitrineActive } from "@/lib/vitrine";

/* Ce que la page demande quand BIA a posé une balise [[voir:…]].

   PAS DE CODE DE TESTEUR ICI, et c'est voulu : les adresses rendues sont
   publiques de toute façon — c'est un seau public chez Supabase. Mettre une
   barrière devant une porte ouverte n'ajoute aucune sécurité, seulement une
   panne de plus quand le code expire au mauvais moment.

   Rien n'est calculé à la demande : le catalogue est déjà en mémoire côté
   serveur, gardé cinq minutes. Cette route ne fait que le recopier. */

export async function GET(request: NextRequest) {
  const voir = request.nextUrl.searchParams.get("voir");

  if (voir) {
    const sujet = await montrer(voir);
    return NextResponse.json({ sujet });
  }

  const sujets = await vitrine();
  return NextResponse.json({
    active: vitrineActive(),
    sujets: sujets.map((s) => ({ cle: s.cle, nom: s.nom, combien: s.pieces.length })),
  });
}
