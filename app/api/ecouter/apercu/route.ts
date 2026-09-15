import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { transcrire } from "@/lib/ecoute";
import { motsCorriges } from "@/lib/lexique";
import { pourScribe } from "@/lib/mots-a-entendre";
import { apercu, cleValide } from "@/lib/morceaux-de-parole";

/* ── CE QU'IL EST EN TRAIN DE DIRE, PENDANT QU'ELLE PARLE ───────────────────

   Sa demande du 15 septembre 2026 : quand il reprend la parole pendant
   qu'elle parle, elle doit se taire ET garder ses mots, au lieu de le forcer
   à les redire.

   Pour décider si c'est bien lui — et pas elle qui s'entend dans le
   haut-parleur — il faut des MOTS, pas un niveau sonore. Cette route
   transcrit ce qui est arrivé jusqu'à maintenant, sans attendre qu'il ait
   fini et sans détruire le dépôt : l'enregistrement continue derrière.

   ── ELLE COÛTE DE L'ARGENT, ET C'EST POURQUOI ELLE NE PART PAS SEULE ───────

   Chaque appel est une transcription payée. Elle ne doit donc partir que
   lorsque le guetteur de volume a déjà vu quelque chose couvrir la voix de
   BIA — c'est le rôle du premier étage, dans le téléphone. Le volume ne coupe
   jamais rien ; il décide seulement s'il vaut la peine de demander des mots.

   ── ET SI ELLE ÉCHOUE, IL NE SE PASSE RIEN ─────────────────────────────────

   Pas de panne notée, pas de message à l'écran : on renvoie un texte vide, le
   téléphone n'interrompt pas, et BIA finit sa phrase comme avant. Une
   interruption ratée coûte une phrase de plus à écouter. Une fausse
   interruption la couperait au milieu d'un mot. */

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ texte: "" }, { status: 401 });

    const form = await request.formData();
    const cle = cleValide(form.get("tour"));
    if (!cle) return NextResponse.json({ texte: "" }, { status: 400 });

    const vu = apercu(cle);
    if (!vu.ok) return NextResponse.json({ texte: "", motif: vu.motif });
    /* Trop court pour contenir des mots : on ne paie pas pour du silence. */
    if (vu.son.octets < 2000) return NextResponse.json({ texte: "", motif: "trop court" });

    let mots: string[] = [];
    try { mots = pourScribe(await motsCorriges(60)); } catch { mots = []; }

    const indice = String(form.get("indice_langue") || "") || null;
    const reco = await transcrire(vu.son.blob, vu.son.nom, indice, mots);
    return NextResponse.json({ texte: reco.texte || "", morceaux: vu.son.morceaux });
  } catch (err) {
    console.error("BIA — aperçu de ce qu'il dit :", (err as Error).message);
    return NextResponse.json({ texte: "" });
  }
}
