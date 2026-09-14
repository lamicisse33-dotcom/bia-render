/* ── LUI APPRENDRE À PARLER, À LA VOIX ──────────────────────────────────────

   Lamine, le 14 septembre 2026 :

     « Sur mon compte, avec ma clé maître, il faut que je puisse donner des
       instructions à BIA. Lui dire directement qu'elle a mal parlé, elle doit
       corriger. Je dois pouvoir lui apprendre directement par vocal : je lui
       dis quelque chose et je lui dis que je veux qu'elle le retienne, elle
       doit le retenir. »

     « Quand elle parle mal, je dois lui dire que c'est mal parlé, et je dois
       lui dire exactement ce qu'il faut dire, jusqu'à ce qu'elle le répète.
       Une fois que c'est bon, je lui dis : ça c'est bon, retiens ça. »

   ── LA BOUCLE, ET ELLE TIENT EN QUATRE MOTS ─────────────────────────────────

     on apprend  →  il dit une phrase  →  ELLE LA RÉPÈTE  →  il écoute
                    ↑                                          │
                    └──── « non, c'est mal parlé » ────────────┤
                                                               │
                              « c'est bon, retiens ça » ───────┘

   Rien d'autre. Pas de mode à régler, pas d'écran : quatre phrases qu'il dit
   à voix haute, en conduisant s'il veut.

   ── CE QU'ON GARDE QUAND IL DIT « RETIENS ÇA » ──────────────────────────────

   ON GARDE CE QU'IL VIENT D'ENTENDRE, et c'est le point délicat de tout ce
   fichier. Deux choses peuvent clocher quand elle répète : les MOTS (le micro
   a mal écrit) ou la PRONONCIATION (les mots sont justes, le moteur de voix
   les dit mal). On ne sait pas laquelle des deux il corrige, et lui demander
   en conduisant serait absurde.

   On n'a pas besoin de le savoir. S'il dit « c'est bon », c'est que ce qu'il
   a ENTENDU était juste — donc le texte qui a produit ce son est le bon
   texte, quelle qu'ait été la faute d'avant. La validation attrape le son tel
   qu'il l'a entendu. C'est la seule façon honnête de fermer la boucle sans
   l'alourdir.

   ── LE CODE MAÎTRE EST LA SERRURE, PAS SA VOIX ──────────────────────────────

   Il demandait qu'elle reconnaisse sa voix. Un moteur qui distingue une voix
   d'une autre se trompe dans une voiture, avec un rhume, dans la rue — et se
   laisse tromper par un enregistrement. Son code, lui, est sur son téléphone,
   un testeur ne l'a pas, et personne ne peut le prononcer à sa place. La
   garantie qu'il voulait, obtenue par la serrure au lieu du timbre.

   ── ET C'EST UNE LISTE FERMÉE, EXPRÈS ───────────────────────────────────────

   Une phrase mal entendue ne doit JAMAIS couper un micro ni effacer une
   mémoire par accident. On ne reconnaît donc que des tournures déclarées, en
   entier, et au moindre doute on laisse passer la question au modèle : ne pas
   comprendre un ordre coûte une répétition ; en inventer un coûte un dégât.

   LES TOURNURES WOLOF SONT DE SA MAIN, PAS DE LA MIENNE. Je n'écris pas de
   wolof. Celles du français couvrent la boucle dès aujourd'hui ; il ajoutera
   les siennes dans SIENNES, ci-dessous, et elles marcheront sans toucher au
   reste.                                                                    */

import { normaliser } from "@/lib/repertoire";

export type Quoi =
  | "apprendre"    // « on apprend » — elle répète tout ce qu'il dit
  | "encore"       // « non, c'est mal parlé » — il va redire
  | "retiens"      // « c'est bon, retiens ça » — on garde
  | "fini"         // « on a fini » — on sort
  | "oublie"       // « oublie ça » — on retire la dernière retenue
  | "repete"       // « répète » — hors apprentissage aussi
  | "micro"        // « coupe le micro »
  | "silence";     // « tais-toi »

export type Ordre = { quoi: Quoi; dit: string };

/* Les tournures françaises. Écrites en entier : « bon » tout seul ne doit
   rien déclencher, et « retiens » au milieu d'une phrase non plus. */
const FRANCAIS: Array<[Quoi, string[]]> = [
  ["apprendre", [
    "on apprend", "apprends", "je vais t apprendre", "on va apprendre",
    "mode apprentissage", "repete apres moi", "repete avec moi",
  ]],
  ["encore", [
    "non c est mal parle", "c est mal parle", "tu as mal parle", "tu parles mal",
    "ce n est pas ca", "c est pas ca", "non ce n est pas ca", "non c est pas ca",
    "tu as mal dit", "recommence", "non recommence", "redis", "non",
  ]],
  ["retiens", [
    "c est bon retiens ca", "ca c est bon retiens ca", "c est bon retiens",
    "retiens ca", "retiens", "garde ca", "c est bon garde ca",
    "voila c est bon", "oui c est ca retiens",
  ]],
  ["fini", ["on a fini", "c est fini", "arrete d apprendre", "on arrete", "fin de la lecon"]],
  ["oublie", ["oublie ca", "oublie", "efface ca", "ne retiens pas ca", "annule ca"]],
  ["repete", ["repete", "redis le", "dis le encore", "repete ca"]],
  ["micro", ["coupe le micro", "ferme le micro", "arrete le micro", "coupe ton micro"]],
  ["silence", ["tais toi", "silence", "arrete de parler", "chut"]],
];

/* ── LA PLACE DE SES TOURNURES ──────────────────────────────────────────────

   À remplir par Lamine, et par lui seul. Une ligne par tournure, avec l'ordre
   qu'elle déclenche. Elles passent AVANT les françaises : quand il aura écrit
   les siennes, ce sont elles qui feront foi.

   Exemple de la forme attendue (le texte est à lui, pas à moi) :
     ["retiens", ["..."]],                                                  */
export const SIENNES: Array<[Quoi, string[]]> = [
];

/* Un ordre n'est jamais long. Au-delà, c'est une phrase qui CONTIENT le mot,
   pas un ordre — « je ne sais pas si je dois retenir ce qu'il m'a dit » ne
   doit rien déclencher. */
const MOTS_AU_PLUS = 6;

/**
 * L'ordre qu'il vient de donner, ou null si ce n'en est pas un.
 *
 * La correspondance est EXACTE, sur le texte normalisé — la même
 * normalisation que le répertoire, pour qu'un accent ou une majuscule ne
 * change rien. Au moindre doute : null, et la question part au modèle.
 */
export function lireLOrdre(texte: string): Ordre | null {
  const dit = normaliser(texte);
  if (!dit) return null;
  if (dit.split(" ").length > MOTS_AU_PLUS) return null;
  for (const [quoi, formes] of [...SIENNES, ...FRANCAIS]) {
    for (const f of formes) {
      if (dit === normaliser(f)) return { quoi, dit: texte.trim() };
    }
  }
  return null;
}

/* ── CE QU'ELLE RÉPOND, ET POURQUOI C'EST SI COURT ──────────────────────────

   En apprentissage, chaque mot qu'elle ajoute est un mot qui n'est pas la
   phrase qu'on lui apprend. Trois syllabes suffisent à dire qu'on a compris.

   Ces phrases-là sont FRANÇAISES et de ma main : ce sont des accusés de
   réception, pas du wolof. Le jour où il en voudra en wolof, il les écrira,
   et elles remplaceront celles-ci. */
export const ACCUSES: Record<Quoi, string> = {
  apprendre: "D'accord. Dis-moi, je répète.",
  encore: "Redis-le-moi.",
  retiens: "C'est retenu.",
  fini: "D'accord, on arrête.",
  oublie: "Oublié.",
  repete: "",
  micro: "",
  silence: "",
};
