import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { chercherImages, chercherVideos, imagesActives, videosActives, CITATION_IMAGES } from "@/lib/trouver";

/* ── CHERCHER UNE IMAGE OU UNE VIDÉO, DEPUIS LES DEUX MOTEURS ─────────────

   Lamine, 24 octobre 2026 : « Recherche vocale et recherche d'images/vidéos :
   vérifier, réparer. »

   VÉRIFIÉ : Khalam cherche des images et des vidéos depuis septembre, par les
   balises [[cherche-image]] et [[regarde]], et lib/trouver.ts porte les
   quotas, le cache et les deux fournisseurs. Khalam Rapide n'avait RIEN.

   CETTE ROUTE NE DUPLIQUE RIEN. Elle appelle les mêmes fonctions, donc les
   mêmes quotas journaliers et le même cache de trente minutes — deux
   personnes qui demandent la même chose dans l'heure ne paient qu'une
   recherche, et c'est vrai des deux moteurs ensemble.

   ÇA SE PAIE, ET C'EST POUR ÇA QUE LE MODÈLE DOIT LE DEMANDER EXPRÈS.
   Chaque recherche d'image coûte chez le fournisseur, et les quotas de
   lib/trouver.ts sont là pour que ça ne file pas. L'outil n'est donc pas
   ouvert à chaque phrase : c'est le modèle qui décide, comme sur Khalam.

   LECTURE SEULE : rien n'est écrit, rien n'est gardé en mémoire. */

export async function POST(request: NextRequest) {
  if (!verifierCode(request.headers.get("x-bia-code"), false).ok)
    return NextResponse.json({ erreur: "code" }, { status: 401 });

  const corps = await request.json().catch(() => ({})) as { quoi?: string; sorte?: string };
  const quoi = String(corps.quoi || "").trim().slice(0, 160);
  const sorte = corps.sorte === "video" ? "video" : "image";
  if (!quoi)
    return NextResponse.json({ trouve: false, raison: "Dis-moi d'abord ce qu'elle veut voir." });

  /* Dire CE QUI manque, pas « indisponible ». Sans clé, une recherche
     d'images ne peut pas partir — et le modèle doit l'annoncer au lieu de
     promettre une image qui n'arrivera jamais. */
  if (sorte === "image" && !imagesActives())
    return NextResponse.json({ trouve: false, raison: "La recherche d'images n'est pas branchée sur ce serveur. Dis-le simplement, et ne promets pas d'image." });
  if (sorte === "video" && !videosActives())
    return NextResponse.json({ trouve: false, raison: "La recherche de vidéos n'est pas branchée sur ce serveur. Dis-le simplement, et ne promets pas de vidéo." });

  try {
    const pieces = sorte === "video" ? await chercherVideos(quoi) : await chercherImages(quoi);
    if (!pieces.length)
      return NextResponse.json({ trouve: false, sorte, requete: quoi, raison: `Rien trouvé pour « ${quoi} ». Propose de dire autrement ce qu'elle cherche.` });
    return NextResponse.json({
      trouve: true, sorte, requete: quoi,
      /* Borné : un plein écran ne montre pas trente images, et le modèle n'a
         pas besoin de les lire toutes pour en parler. */
      pieces: pieces.slice(0, 8),
      citation: sorte === "image" ? CITATION_IMAGES : undefined,
      consigne: "L'écran les montre déjà. Dis en UNE phrase ce qu'elle va voir — ne décris pas les images une par une, elle les regarde.",
    });
  } catch {
    return NextResponse.json({ trouve: false, raison: "La recherche n'a pas répondu. Dis-le et propose de réessayer." });
  }
}
