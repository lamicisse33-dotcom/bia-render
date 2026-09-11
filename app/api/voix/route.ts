import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { decouper, synthetiser } from "@/lib/voix";
import { detecterLangue } from "@/lib/langue";
import { pourLaVoix } from "@/lib/nombres";
import { noterPanne } from "@/lib/panne";
import { noterVoix } from "@/lib/depense";

/* Rend UN morceau de la réponse en audio. Le client demande le morceau 0,
   le joue, et réclame le suivant pendant qu'il parle : la voix démarre donc
   sans attendre que toute la réponse soit synthétisée. */
export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as {
      texte?: string; partie?: number; langue?: string; ou?: string;
      exaggeration?: number; temperature?: number; cfgWeight?: number; vitesse?: number;
      audioPrompt?: string | null;
    };
    /* LES NOMBRES PASSENT EN LETTRES AVANT TOUT LE RESTE. Le moteur de voix
       épelle « 300 000 » chiffre par chiffre — « 3.0.0.0 » — parce qu'il ne
       sait pas lire un nombre. On l'écrit donc en toutes lettres AVANT de
       découper : après, les morceaux seraient déjà calibrés sur un texte plus
       court, et « ñetti téeméeri junni » les ferait déborder de la limite de
       Soynade. Ce qui s'affiche à l'écran, lui, garde ses chiffres. */
    const brut = String(body.texte || "");
    const langueDuTexte = body.langue === "fr" || body.langue === "wo"
      ? body.langue
      : detecterLangue(brut);
    const morceaux = decouper(pourLaVoix(brut, langueDuTexte));
    const partie = Math.max(0, Math.floor(Number(body.partie) || 0));
    if (!morceaux.length || partie >= morceaux.length) {
      return NextResponse.json({ parties: morceaux.length, audio: null });
    }

    const langue = body.langue === "fr" || body.langue === "wo"
      ? body.langue
      : detecterLangue(morceaux[partie]);

    // Les réglages ne viennent de la requête que depuis la page /reglage ;
    // ailleurs, ce sont ceux du serveur qui s'appliquent.
    /* CE QUI PART VRAIMENT CHEZ SOYNADE, compté ici et nulle part ailleurs :
       c'est ce morceau-ci, après la mise en lettres des nombres, et c'est
       exactement ce qu'ils facturent. L'étiquette dit d'où il vient, pour
       qu'on sache enfin QUI mange le crédit — la réponse, une attente, un
       devis lu à voix haute, ou la page de réglage. */
    noterVoix(morceaux[partie].length, String(body.ou || "").slice(0, 24) || "réponse");

    const parole = await synthetiser(morceaux[partie], langue, {
      exaggeration: body.exaggeration,
      temperature: body.temperature,
      cfgWeight: body.cfgWeight,
      vitesse: body.vitesse,
      audioPrompt: body.audioPrompt,
    });
    if (!parole) {
      /* Aucun fournisseur de voix n'est configuré : le téléphone lira
         lui-même. Ce n'est pas une panne, mais il faut pouvoir le VOIR —
         sinon on cherche pendant une heure pourquoi elle a une voix de
         robot. */
      noterPanne("aucune voix configurée", "Le téléphone lit avec sa propre voix.", "voix");
      return NextResponse.json({ parties: morceaux.length, audio: null, moteur: "navigateur", langue });
    }

    return NextResponse.json({
      parties: morceaux.length,
      partie,
      langue,
      moteur: parole.moteur,
      type_mime: parole.typeMime,
      audio: parole.audio.toString("base64"),
    });
  } catch (err) {
    /* ── UNE VOIX QUI ÉCHOUE NE LAISSAIT AUCUNE TRACE ────────────────────

       Trouvé le 10 septembre 2026, en cherchant pourquoi BIA ne parlait
       plus : cette route était la SEULE à ne pas noter ses pannes. Soynade
       pouvait refuser chaque phrase de la journée sans qu'il en reste rien
       — /api/etat affichait « 0 panne », et il n'y avait rien à regarder
       hors des journaux de Render.

       Le téléphone prend toujours le relais avec sa propre voix, comme
       avant : ce qui change, c'est qu'on sait maintenant POURQUOI. */
    const motif = (err as Error).message;
    console.error("BIA — la voix a échoué :", motif);
    noterPanne("la voix a échoué", motif, "voix");
    return NextResponse.json({ audio: null, moteur: "navigateur", erreur: motif });
  }
}
