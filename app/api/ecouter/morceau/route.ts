import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { cleValide, poserMorceau } from "@/lib/morceaux-de-parole";

/* ── OÙ LES MORCEAUX ARRIVENT PENDANT QU'IL PARLE ───────────────────────────

   Cette route ne transcrit rien et n'appelle aucun service payant. Elle
   reçoit un morceau d'enregistrement et le range, c'est tout. La
   transcription reste à /api/ecouter, qui n'a pas changé.

   ELLE DOIT ÊTRE LA PLUS RAPIDE DE TOUTE L'APPLICATION : pendant que Lamine
   parle, elle est appelée toutes les 400 ms. Tout ce qu'on ferait ici de plus
   qu'écrire en mémoire se paierait en rafales.

   Le code d'accès est vérifié comme partout ailleurs — c'est de la voix qu'on
   dépose, et personne d'autre que les porteurs de code n'a à en déposer. */

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const form = await request.formData();
    const cle = cleValide(form.get("tour"));
    if (!cle) return NextResponse.json({ erreur: "identifiant de tour invalide" }, { status: 400 });

    const morceau = form.get("morceau");
    if (!(morceau instanceof Blob)) {
      return NextResponse.json({ erreur: "aucun morceau" }, { status: 400 });
    }
    const indice = Number(form.get("indice"));
    const type = String(form.get("type") || morceau.type || "audio/webm");
    const nom = String(form.get("nom") || "parole.webm").slice(0, 80);

    const octets = new Uint8Array(await morceau.arrayBuffer());
    const pose = poserMorceau(cle, indice, octets, type, nom);
    if (!pose.ok) return NextResponse.json({ erreur: pose.motif }, { status: 400 });

    /* Le COMPTE des morceaux n'est pas annoncé ici. Il arrive avec la requête
       de transcription, et c'est voulu : un seul endroit qui décide qu'un
       enregistrement est complet. Deux endroits auraient fini par ne plus dire
       la même chose, et on aurait recousu un son amputé sans le savoir. */
    return NextResponse.json({ recu: indice });
  } catch (err) {
    console.error("BIA — dépôt d'un morceau de parole :", (err as Error).message);
    /* On ne note pas de panne ici : un morceau perdu n'est pas une panne, le
       téléphone repart sur l'envoi complet et Lamine ne voit rien. Une panne
       criée à chaque hoquet de réseau rendrait le tableau illisible. */
    return NextResponse.json({ erreur: "morceau refusé" }, { status: 500 });
  }
}
