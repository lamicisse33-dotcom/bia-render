import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { decouper, synthetiser } from "@/lib/voix";
import { detecterLangue } from "@/lib/langue";
import { pourLaVoix } from "@/lib/nombres";
import { noterPanne } from "@/lib/panne";
import { noterOctetsDeVoix, noterVoix } from "@/lib/depense";
import { versMp3 } from "@/lib/mp3";

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
      /* Le telephone dit s'il s'agit de la PREMIERE phrase — celle qu'on
         attend pour ouvrir la bouche — ou de la suite, fabriquee pendant
         qu'elle parle. Voir synthetiser() dans lib/voix.ts : melanger les
         deux dans une mediane donne un chiffre qui ne decrit ni l'un ni
         l'autre. */
      tete?: boolean;
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

    const partiFabriquer = Date.now();
    const parole = await synthetiser(morceaux[partie], langue, {
      exaggeration: body.exaggeration,
      temperature: body.temperature,
      cfgWeight: body.cfgWeight,
      vitesse: body.vitesse,
      audioPrompt: body.audioPrompt,
    }, body.tete && partie === 0 ? "voix-tete" : "voix");
    if (!parole) {
      /* Aucun fournisseur de voix n'est configuré : le téléphone lira
         lui-même. Ce n'est pas une panne, mais il faut pouvoir le VOIR —
         sinon on cherche pendant une heure pourquoi elle a une voix de
         robot. */
      noterPanne("aucune voix configurée", "Le téléphone lit avec sa propre voix.", "voix");
      return NextResponse.json({ parties: morceaux.length, audio: null, moteur: "navigateur", langue });
    }

    /* ── SIX FOIS MOINS D'OCTETS VERS LE TÉLÉPHONE ─────────────────────────

       Trouvé le 19 septembre 2026 en cherchant la lenteur. Chaque réponse
       partait vers le téléphone en WAV PCM 24 kHz 16 bits — 48 ko par
       seconde de parole — puis en base64, qui ajoute un tiers. Mesuré : quatre
       secondes de voix font 256 ko. En mp3 à 64 kbit/s : 43 ko.

       Sur le wifi du Mac ça ne se voit pas. Sur un téléphone à Dakar, c'est
       jusqu'à une seconde et demie par phrase — et c'est aussi la bande
       passante de Render qui était à 70 % de son plafond.

       L'encodage coûte 120 à 300 ms ici, mesuré. C'est le prix, il est dit,
       et il est compté avec le reste : si un jour Soynade sait rendre du mp3
       directement, cette ligne disparaît et on le verra sur `encodage_ms`.

       Même procédé que pour les 270 fichiers du seau (lib/mp3.ts) : c'est
       sa décision du 12 septembre — « vas-y, il faut le convertir en MP3 » —
       appliquée aux réponses vivantes, qu'elle n'avait jamais touchées. */
    let audio = parole.audio;
    let typeMime = parole.typeMime;
    let encodageMs = 0;
    if (typeMime === "audio/wav") {
      const t = Date.now();
      try {
        const brut = parole.audio.buffer.slice(parole.audio.byteOffset, parole.audio.byteOffset + parole.audio.byteLength) as ArrayBuffer;
        const mp3 = versMp3(brut);
        encodageMs = Date.now() - t;
        noterOctetsDeVoix(parole.audio.length, mp3.length, encodageMs);
        audio = Buffer.from(mp3.buffer, mp3.byteOffset, mp3.byteLength);
        typeMime = "audio/mpeg";
      } catch (e) {
        /* L'encodeur a échoué : on envoie le wav, comme avant. Une voix
           lourde vaut mieux qu'une voix absente — et ça se voit au compteur. */
        noterOctetsDeVoix(parole.audio.length, 0, Date.now() - t);
        console.error("BIA — l'encodage mp3 a échoué, wav envoyé :", (e as Error).message);
      }
    }

    return NextResponse.json({
      parties: morceaux.length,
      partie,
      langue,
      moteur: parole.moteur,
      type_mime: typeMime,
      audio: audio.toString("base64"),
      /* Ce que le serveur a mis à fabriquer ce morceau, Soynade et encodage
         compris. Le téléphone en déduit ce que le RÉSEAU lui a coûté. */
      fabrication_ms: Date.now() - partiFabriquer,
      encodage_ms: encodageMs,
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
