/* ── RECONNAÎTRE SA PROPRE VOIX DANS LE MICRO ───────────────────────────────

   Lamine, le 15 septembre 2026 : « le micro doit avoir le comportement du
   micro de ChatGPT vocal. Même quand elle parle, si je parle, le micro doit
   automatiquement saisir ce que j'ai dit, elle doit se taire. »

   ── CE QUI EXISTE DÉJÀ, ET CE QUI MANQUE ───────────────────────────────────

   BIA sait déjà se faire couper la parole : un guetteur mesure le micro
   pendant qu'elle parle, exige qu'on la COUVRE et qu'on TIENNE un quart de
   seconde (voir couvreSaVoix dans lib/micro.ts). C'est sa demande du
   12 septembre, et elle marche.

   Ce qui manque, c'est que l'enregistreur est arrêté pendant ce temps-là. Le
   micro l'entend, mais ne garde rien : ses mots sont perdus et il doit les
   redire. Pour les garder, il faut enregistrer pendant qu'elle parle — et
   alors elle s'enregistre elle-même.

   ── POURQUOI LE VOLUME NE PEUT PAS TRANCHER SEUL ───────────────────────────

   L'annulation d'écho du navigateur aide, mais elle n'est pas garantie : elle
   ne connaît que le son qu'elle voit sortir, et BIA décode son MP3 pour le
   jouer par createBufferSource(). Selon le téléphone, le haut-parleur et la
   pièce, elle marche bien, mal, ou pas du tout. On peut s'en servir ; on ne
   peut pas bâtir dessus.

   Alors on ajoute la défense qui, elle, ne dépend d'aucun matériel : ELLE
   SAIT CE QU'ELLE VIENT DE DIRE. Si ce que le micro rapporte ressemble à sa
   propre phrase, c'est elle. Sinon, c'est lui.

   ── DEUX PIÈGES, ET COMMENT ON LES ÉVITE ───────────────────────────────────

   1. NE PAS COMPARER MOT POUR MOT. L'oreille n'écrit pas comme la voix
      prononce : « Maa ngi fi rekk » revient en « mangi fi rek ». Une égalité
      stricte échouerait toujours. On normalise — la même normalisation que le
      répertoire, pas une deuxième qui finirait par diverger — et on mesure
      une ressemblance.

   2. NE PAS COMPARER À TOUTE SA RÉPONSE, mais à ce qu'elle a RÉELLEMENT
      prononcé ces dernières secondes. Sa voix est découpée : le texte du
      modèle peut faire trois phrases quand le haut-parleur n'en a sorti
      qu'une. Comparer à l'ensemble ferait passer pour de l'écho une vraie
      interruption qui, par malchance, emploierait un mot de la suite.

   ── LE PRIX D'UNE ERREUR, DANS LES DEUX SENS ───────────────────────────────

   Prendre sa voix pour la sienne : elle se coupe toute seule au milieu d'une
   phrase, et c'est pire que le défaut d'aujourd'hui.

   Prendre la sienne pour la voix de Lamine : elle se tait alors qu'il n'a
   rien dit, et repart sur ce qu'elle croit avoir entendu — elle se répond à
   elle-même, en payant une transcription à chaque tour.

   Les deux sont graves. C'est pour ça qu'on demande TROIS choses avant de la
   faire taire : la couvrir, tenir, et ne pas ressembler à ce qu'elle dit. */

import { normaliser } from "./normaliser";

/* ── L'INTERRUPTEUR ─────────────────────────────────────────────────────────

   Si ça se coupe tout seul chez lui, il remet `false` et BIA revient au
   comportement d'hier en une ligne. Tant que ce n'est pas éprouvé sur son
   téléphone, dans sa voiture, avec son haut-parleur, ça vaut mieux qu'une
   certitude écrite ici. */
export const GARDER_CE_QUIL_DIT_PENDANT_QUELLE_PARLE = true;

/** Combien de temps en arrière on regarde ce qu'elle a prononcé. */
export const FENETRE_DE_SON_ECHO = 2500;

/** En dessous de deux mots, on ne coupe rien : « mm », une toux, un klaxon. */
export const MOTS_AU_MOINS = 2;

/** Au-dessus, c'est elle qu'on entend. Voir plus bas comment il a été choisi. */
export const RESSEMBLANCE_QUI_TRAHIT_LECHO = 0.5;

export type Prononce = { texte: string; quand: number };

/* ── CE QUI EST SORTI DU HAUT-PARLEUR, ET QUAND ─────────────────────────────

   Une liste courte, tenue par le téléphone. On n'y met que ce qui a
   VRAIMENT commencé à se jouer — pas ce que le modèle a écrit. */
export function fenetreDeSonEcho(dits: Prononce[], maintenant = Date.now()): string {
  return dits
    .filter((d) => maintenant - d.quand <= FENETRE_DE_SON_ECHO)
    .map((d) => d.texte)
    .join(" ")
    .trim();
}

/** Les mots utiles d'une phrase, normalisés une fois pour toutes. */
function mots(texte: string): string[] {
  const n = normaliser(texte);
  return n ? n.split(" ").filter(Boolean) : [];
}

/* ── LA RESSEMBLANCE ────────────────────────────────────────────────────────

   Quelle part des mots entendus se retrouve dans ce qu'elle vient de dire.
   On compte dans CE SENS et pas l'autre, et c'est le point délicat.

   Le micro attrape un fragment : deux ou trois mots d'une phrase qui en fait
   vingt. Si on demandait quelle part de SA phrase se retrouve dans le
   fragment, un écho parfait donnerait 0,15 et passerait pour une voix. En
   comptant la part du FRAGMENT retrouvée chez elle, un écho donne 1, et une
   vraie interruption donne presque zéro — sauf mots outils, et c'est
   exactement ce que le seuil laisse passer.

   POURQUOI 0,5. « Non attends, je parle de demain » dans une réponse sur la
   Corniche : « de » peut-être, « je » peut-être. Deux mots sur six, 0,33 — on
   coupe. Un écho de « waaw maa ngi fi rekk » rend ses propres mots : 1,0 — on
   ignore. Entre les deux il y a de la marge, et c'est ce qui compte : le
   chiffre juste n'est pas 0,5, c'est n'importe quoi entre 0,4 et 0,7. */
export function ressemblance(entendu: string, prononce: string): number {
  const a = mots(entendu);
  if (!a.length) return 0;
  const b = new Set(mots(prononce));
  if (!b.size) return 0;
  let retrouves = 0;
  for (const m of a) if (b.has(m)) retrouves++;
  return retrouves / a.length;
}

export type Verdict =
  | { couper: false; motif: string }
  | { couper: true; dit: string };

/**
 * Faut-il la faire taire ?
 *
 * `entendu` est ce que l'oreille a rapporté du micro pendant qu'elle parlait.
 * `dits` est ce qui est sorti du haut-parleur, avec l'instant de chaque
 * morceau.
 */
export function faut_il_se_taire(
  entendu: string, dits: Prononce[], maintenant = Date.now(),
): Verdict {
  const dit = String(entendu || "").trim();
  const combien = mots(dit).length;
  /* On ne coupe pas sur un souffle. Et on ne coupe pas non plus sur du vide :
     une oreille qui rend une chaîne vide n'a rien entendu, ce n'est pas une
     raison de la faire taire. */
  if (combien < MOTS_AU_MOINS) {
    return { couper: false, motif: `${combien} mot(s) — il en faut ${MOTS_AU_MOINS}` };
  }
  const sien = fenetreDeSonEcho(dits, maintenant);
  const r = ressemblance(dit, sien);
  if (r >= RESSEMBLANCE_QUI_TRAHIT_LECHO) {
    return { couper: false, motif: `son propre écho (ressemblance ${r.toFixed(2)})` };
  }
  return { couper: true, dit };
}

/* ── RECOLLER SA PHRASE EN DEUX MORCEAUX ────────────────────────────────────

   Voilà le piège qu'on évite ici, et il aurait coûté cher.

   Il la coupe au milieu : « Non attends, je parle de demain. » Les trois
   premiers mots sont dans le guetteur — c'est ce qu'on vient de récupérer. Le
   reste part dans le micro ordinaire, qui vient de se rouvrir, et arrivera
   quand il aura fini de parler.

   Deux morceaux, donc. Si on envoyait le premier tout de suite, elle
   répondrait à « Non attends, je parle » puis une deuxième fois à « de
   demain » : deux réponses pour une phrase, et deux fois le prix. On garde
   donc le premier morceau de côté et on le recolle devant le second.

   ET SI LE SECOND EST VIDE — il l'a coupée d'un mot puis s'est tu — le
   premier morceau devient la phrase entière. Il n'aura toujours rien à
   redire, et c'est tout ce qu'on lui a promis.

   LE DÉLAI. Un morceau gardé trop longtemps finirait par se coller devant une
   phrase sans rapport, dite bien plus tard. Passé ce délai, on l'oublie. */
export const DUREE_DU_RATTRAPAGE = 15_000;

/**
 * Recolle ce qu'on a rattrapé pendant qu'elle parlait devant ce que le micro
 * vient d'entendre. Rend `entendu` inchangé s'il n'y a rien à recoller.
 */
export function recoller(
  rattrape: Prononce | null | undefined, entendu: string, maintenant = Date.now(),
): string {
  const suite = String(entendu || "").trim();
  const debut = String(rattrape?.texte || "").trim();
  if (!debut) return suite;
  if (maintenant - (rattrape?.quand || 0) > DUREE_DU_RATTRAPAGE) return suite;
  if (!suite) return debut;
  /* Les deux enregistreurs se chevauchent d'une fraction de seconde : le
     début peut se retrouver en tête des deux. On ne le dit pas deux fois. */
  if (normaliser(suite).startsWith(normaliser(debut))) return suite;
  return `${debut} ${suite}`;
}
