import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { synthetiser } from "@/lib/voix";
import { noterEssaiVoix } from "@/lib/etapes";

/* ── LE TEST QUI DÉCIDE DU RESTE ─────────────────────────────────────────────

   Lamine, le 15 septembre 2026, après avoir lu « tout arrive d'un coup » :

     « Il faut maintenant tester la durée de fabrication en fonction de la
       longueur du texte. C'est capital. Demande à Claude de faire cinq appels
       isolés à Soynade : 20, 50, 100, 200, 400 caractères. […] Ces deux
       résultats changent complètement la décision. […] C'est, à mon avis, le
       test le plus important à faire maintenant. »

   IL A RAISON, ET VOICI POURQUOI CE TEST TRANCHE TOUT.

   La voix ne coule pas : on l'a mesuré, premier octet et dernier octet
   tombent ensemble. Il reste donc une seule question, et elle a deux réponses
   possibles qui mènent à deux chantiers opposés :

     — SI LA DURÉE SUIT LA LONGUEUR (20 signes → 0,7 s, 400 → 4 s), alors on
       garde Soynade et on fabrique le streaming nous-mêmes : la première
       phrase part seule, BIA la dit pendant qu'on fabrique la suivante. Le
       verrou des 120 signes devient alors le prochain obstacle à enlever.

     — SI MÊME VINGT SIGNES DEMANDENT TROIS SECONDES, il y a une latence fixe
       incompressible, découper ne servira à rien, et la seule voie est un
       autre moteur. Toute optimisation autour serait du temps perdu.

   Découper avant de savoir, c'est risquer d'écrire une architecture entière
   pour rien. D'où ce test, et d'où le fait qu'il passe avant tout le reste.

   ── POURQUOI CETTE ROUTE PLUTÔT QU'UN SCRIPT ───────────────────────────────

   La clé de Soynade vit sur le serveur, et elle doit y rester : elle ne passe
   ni par la conversation, ni par une ligne de commande, ni par moi. Le seul
   endroit d'où l'on peut mesurer le vrai appel est donc le serveur lui-même.

   Lamine appuie sur un bouton dans /vitesse, le serveur fait les cinq appels
   avec sa propre clé, et rend les chiffres. Personne n'a rien à coller nulle
   part.

   ── CE QU'ON ENVOIE ────────────────────────────────────────────────────────

   Du français, de ma main. Pas du wolof : je n'en écris pas, et pour une
   mesure de LATENCE la langue ne change rien d'utile — c'est la longueur
   qu'on fait varier, et elle seule.

   RÉSERVÉ AU CODE MAÎTRE, et pour une raison qui n'est pas la discrétion :
   cinq synthèses se paient. Un testeur ne doit pas pouvoir ouvrir le robinet
   en rechargeant une page.                                                 */

const PHRASE = "Je regarde ce que tu me demandes et je te réponds tout de suite, "
  + "sans attendre, parce que c'est exactement ce qu'il faut faire quand quelqu'un "
  + "pose une question simple et qu'il attend la réponse en face de toi, dans la rue, "
  + "un matin ordinaire, alors que le marché commence à peine à se remplir de monde "
  + "et que chacun a mieux à faire que d'attendre une machine qui réfléchit trop.";

const LONGUEURS = [20, 50, 100, 200, 400];

export async function POST(request: NextRequest) {
  const verdict = verifierCode(request.headers.get("x-bia-code"));
  if (!verdict.ok || !verdict.maitre) {
    return NextResponse.json({ erreur: "Réservé au code maître." }, { status: 401 });
  }

  const resultats: Array<{ signes: number; premier_ms: number; fin_ms: number;
    octets: number; ms_par_signe: number; motif?: string }> = [];

  for (const n of LONGUEURS) {
    const texte = PHRASE.slice(0, n);
    const parti = Date.now();
    try {
      /* On passe par synthetiser(), le VRAI chemin — pas une requête écrite
         pour l'occasion. Mesurer un chemin parallèle donnerait un chiffre
         juste sur quelque chose que BIA n'emprunte jamais. */
      const parole = await synthetiser(texte, "fr");
      const fin = Date.now();
      resultats.push({
        signes: n,
        /* synthetiser() note déjà ses trois instants dans lib/etapes.ts ; ce
           qu'on rend ici est le total vu d'ici, qui suffit à répondre à la
           question posée : est-ce que ça DÉPEND de la longueur ? */
        premier_ms: 0,
        fin_ms: fin - parti,
        octets: parole?.audio.length || 0,
        ms_par_signe: Math.round((fin - parti) / n),
      });
    } catch (err) {
      resultats.push({ signes: n, premier_ms: 0, fin_ms: 0, octets: 0, ms_par_signe: 0,
        motif: (err as Error).message.slice(0, 160) });
    }
  }

  /* ── LA LECTURE, FAITE ICI UNE FOIS POUR TOUTES ──────────────────────────
     Deux nombres suffisent à trancher : ce que coûte le plus court, et ce
     que coûte chaque signe en plus. Le premier est la latence fixe ; le
     second dit s'il y a quelque chose à gagner à découper. */
  const bons = resultats.filter((r) => r.fin_ms > 0);
  let plancher = 0, parSigne = 0, verdictTexte = "aucun appel n'a abouti";
  if (bons.length >= 2) {
    const petit = bons[0], grand = bons[bons.length - 1];
    parSigne = (grand.fin_ms - petit.fin_ms) / (grand.signes - petit.signes);
    plancher = Math.max(0, Math.round(petit.fin_ms - parSigne * petit.signes));
    verdictTexte = parSigne * 100 < 400
      ? `latence FIXE d'environ ${(plancher / 1000).toFixed(1)} s : découper ne rendra presque rien, `
        + "il faut un autre moteur de voix"
      : `la durée SUIT la longueur (${Math.round(parSigne)} ms par signe, plancher `
        + `${(plancher / 1000).toFixed(1)} s) : découper par phrase fera parler BIA plus tôt`;
  }

  const essai = { quand: new Date().toISOString(), resultats, plancher_ms: plancher,
    ms_par_signe: Math.round(parSigne * 10) / 10, verdict: verdictTexte };
  noterEssaiVoix(essai);
  return NextResponse.json(essai);
}
