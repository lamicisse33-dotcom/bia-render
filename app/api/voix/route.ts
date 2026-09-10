import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { decouper, synthetiser } from "@/lib/voix";
import { detecterLangue } from "@/lib/langue";
import { pourLaVoix } from "@/lib/nombres";

/* Rend UN morceau de la réponse en audio. Le client demande le morceau 0,
   le joue, et réclame le suivant pendant qu'il parle : la voix démarre donc
   sans attendre que toute la réponse soit synthétisée. */
export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as {
      texte?: string; partie?: number; langue?: string;
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
    const parole = await synthetiser(morceaux[partie], langue, {
      exaggeration: body.exaggeration,
      temperature: body.temperature,
      cfgWeight: body.cfgWeight,
      vitesse: body.vitesse,
      audioPrompt: body.audioPrompt,
    });
    if (!parole) return NextResponse.json({ parties: morceaux.length, audio: null, moteur: "navigateur", langue });

    return NextResponse.json({
      parties: morceaux.length,
      partie,
      langue,
      moteur: parole.moteur,
      type_mime: parole.typeMime,
      audio: parole.audio.toString("base64"),
    });
  } catch (err) {
    // Une voix qui échoue ne doit pas rendre BIA muette : le téléphone prend
    // le relais avec sa propre voix, et la raison reste dans les journaux.
    console.error("BIA — la voix a échoué :", (err as Error).message);
    return NextResponse.json({ audio: null, moteur: "navigateur", erreur: (err as Error).message });
  }
}
