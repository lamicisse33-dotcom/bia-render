import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { transcrire } from "@/lib/ecoute";
import { motsCorriges } from "@/lib/lexique";
import { pourScribe } from "@/lib/mots-a-entendre";
import { noterPanne } from "@/lib/panne";

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const form = await request.formData();
    const fichier = form.get("audio");
    if (!(fichier instanceof Blob)) return NextResponse.json({ erreur: "Aucun enregistrement." }, { status: 400 });
    if (fichier.size > 20 * 1024 * 1024) return NextResponse.json({ erreur: "Enregistrement trop long." }, { status: 413 });

    const indice = String(form.get("indice_langue") || "") || null;
    /* LE NOM DU FICHIER VIENT DU TÉLÉPHONE, PAS D'ICI.

       Il était écrit en dur : « parole.webm », quel que soit ce qu'on
       recevait vraiment. Safari — Mac et iPhone — enregistre en MP4 : on
       annonçait donc du webm à ElevenLabs en lui tendant du MP4, et il
       refusait. Le format d'un enregistrement ne se décide pas sur le
       serveur : il se constate. */
    const nom = (fichier instanceof File && fichier.name) ? fichier.name : "parole.webm";
    /* ── LES MOTS QU'ON LUI DONNE D'AVANCE ─────────────────────────────

       Sa règle du 12 septembre au soir : « les mots corrigés doivent être
       prioritaires si leur équivalent n'existe pas sur les phrases
       enregistrées. » Les corrections viennent de Supabase (déjà en cache
       d'une minute) ; si elles ne répondent pas, on envoie la liste sans
       elles plutôt que de ne rien envoyer. */
    let mots: string[] = [];
    try {
      mots = pourScribe(await motsCorriges(60));
    } catch (err) {
      console.error("BIA — mots corrigés indisponibles :", (err as Error).message);
      try { mots = pourScribe([]); } catch { mots = []; }
    }
    const reco = await transcrire(fichier, nom, indice, mots);
    return NextResponse.json(reco);
  } catch (err) {
    /* ── UNE ÉCOUTE QUI ÉCHOUE NE LAISSAIT AUCUNE TRACE ──────────────────

       Le 12 septembre 2026 à deux heures du matin, Lamine : « elle répète
       toujours : je ne t'entends pas bien, répète s'il te plaît. »

       Cette route était la DERNIÈRE à ne pas noter ses pannes — la voix avait
       été corrigée le 10 septembre, pas elle. Elle renvoyait { texte: "" }, et
       le téléphone lisait ce vide comme « je n'ai rien entendu ». Le vrai
       motif — une clé refusée, un quota épuisé, un format rejeté — mourait
       dans un console.error que personne ne lit. /api/etat affichait
       « 0 panne » pendant que chaque phrase se perdait.

       Maintenant ça se voit dans /api/etat, et le téléphone reçoit « panne »
       pour dire à la personne que c'est SON OREILLE qui est cassée, pas sa
       voix à elle. Les deux phrases n'appellent pas la même réaction : on ne
       répète pas plus fort devant un micro qui ne transmet rien. */
    const motif = (err as Error).message;
    console.error("BIA — l'écoute a échoué :", motif);
    noterPanne("l'écoute a échoué", motif.slice(0, 300), "ecoute");
    return NextResponse.json({ texte: "", panne: true, motif: motif.slice(0, 200) }, { status: 502 });
  }
}
