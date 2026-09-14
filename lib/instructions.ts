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

/* ── DEUX FOIS, ET C'EST LUI QUI L'A TROUVÉ ─────────────────────────────────

   Lamine, le 14 septembre 2026 : « les instructions, je dois les répéter au
   moins deux fois. Stop stop pour qu'elle s'arrête. Corrige corrige pour
   qu'elle corrige. Supprime supprime pour qu'elle supprime. Mémorise mémorise
   pour qu'elle mémorise. »

   C'est la meilleure garde de tout ce fichier, et elle vient de lui.

   Je lui avais dit ma seule inquiétude sur la version d'avant : « stop » et
   « non » sont trop courts. Quelqu'un qui raconte sa journée dit « non » vingt
   fois ; il aurait effacé une mémoire en parlant de son voisin. Je n'avais pas
   de bonne réponse — allonger les tournures les rend pénibles à dire en
   conduisant, et les enlever aurait retiré les mots qui lui viennent.

   SA RÉPONSE EST MEILLEURE QUE TOUT CE QUE J'AVAIS. « Stop stop » ne se dit
   pas par accident. Personne ne redouble un mot au milieu d'une phrase, et
   celui qui le fait le fait exprès. Un mot seul ne déclenche donc plus rien :
   c'est le REDOUBLEMENT qui est l'ordre.

   ── CE QUI MARCHE ENCORE SANS DOUBLER ───────────────────────────────────────

   Les tournures LONGUES, parce qu'elles ne peuvent pas arriver par hasard :
   « efface ça de ta mémoire », « c'est bon mémorise », « on a fini ». Personne
   ne les prononce sans le vouloir. On n'enlève jamais une façon de dire qui
   marchait — on retire seulement les mots nus, qui étaient le danger.        */

/** Les mots qu'il faut redoubler. « stop » ne fait rien ; « stop stop » agit. */
const A_DOUBLER: Array<[Quoi, string[]]> = [
  /* ── « DÉSORMAIS ÇA DOIT S'APPELER APPRENTISSAGE APPRENTISSAGE » ────────
     Lamine, le 14 septembre 2026 au soir : « si j'ai dit apprentissage deux
     fois, elle doit se mettre en mode apprentissage automatiquement. »
     C'est SON mot, et c'est le bon : « apprends » est un mot qu'on emploie
     sans y penser dans une phrase ordinaire, « apprentissage » non. On garde
     les anciens — ne jamais retirer une de ses formulations — mais celui-ci
     est celui qu'il emploiera. */
  ["apprendre", ["apprentissage", "apprends", "apprend"]],
  ["encore", ["stop", "corrige", "recommence", "redis", "non"]],
  ["retiens", ["memorise", "retiens", "garde"]],
  ["fini", ["fini", "termine"]],
  ["oublie", ["supprime", "efface", "oublie"]],
  ["repete", ["repete"]],
  /* SES MOTS, LE 14 SEPTEMBRE AU SOIR : « pour la coupure du micro c'est
     pareil — je dis coupe le micro deux fois, elle doit exécuter tout de
     suite. » La tournure longue marche toujours ; le redoublement s'y ajoute,
     parce que c'est devenu SA façon de donner un ordre, et qu'une règle qui
     souffre une exception n'est plus une règle qu'on retient. */
  ["micro", ["coupe le micro"]],
  ["silence", ["silence", "chut"]],
];

/** Les tournures qui se suffisent : trop longues pour tomber par hasard. */
const ENTIERES: Array<[Quoi, string[]]> = [
  ["apprendre", [
    "on apprend", "je vais t apprendre", "on va apprendre",
    "mode apprentissage", "repete apres moi", "repete avec moi",
  ]],
  ["encore", [
    "stop corrige", "non corrige", "corrige ca",
    "c est a corriger", "il faut corriger", "non stop",
    "non c est mal parle", "c est mal parle", "tu as mal parle", "tu parles mal",
    "ce n est pas ca", "c est pas ca", "non ce n est pas ca", "non c est pas ca",
    "tu as mal dit", "non recommence",
  ]],
  ["retiens", [
    "c est bon memorise", "memorise ca", "c est bon memorise ca",
    "voila memorise", "oui memorise",
    "c est bon retiens ca", "ca c est bon retiens ca", "c est bon retiens",
    "retiens ca", "garde ca", "c est bon garde ca",
    "voila c est bon", "oui c est ca retiens",
  ]],
  ["fini", ["on a fini", "c est fini", "arrete d apprendre", "on arrete", "fin de la lecon"]],
  ["oublie", [
    "efface ca de ta memoire", "efface de ta memoire", "supprime ca",
    "efface ca", "retire ca de ta memoire",
    "oublie ca", "ne retiens pas ca", "annule ca",
  ]],
  ["repete", ["redis le", "dis le encore", "repete ca"]],
  ["micro", ["coupe le micro", "ferme le micro", "arrete le micro", "coupe ton micro"]],
  ["silence", ["tais toi", "arrete de parler"]],
];

/* Toutes les formes reconnues, une fois pour toutes : les entières, plus
   chaque mot redoublé. On accepte aussi le triplement — quelqu'un qui doute
   en dit trois, et le refuser serait absurde. */
const FRANCAIS: Array<[Quoi, string[]]> = (() => {
  const par = new Map<Quoi, string[]>();
  for (const [quoi, formes] of ENTIERES) par.set(quoi, [...(par.get(quoi) || []), ...formes]);
  for (const [quoi, mots] of A_DOUBLER) {
    const suite = par.get(quoi) || [];
    for (const m of mots) { suite.push(`${m} ${m}`); suite.push(`${m} ${m} ${m}`); }
    par.set(quoi, suite);
  }
  /* ── CE N'EST PAS LE MOT QU'IL REDOUBLE, C'EST CE QU'IL DIT ─────────────

     Le 14 septembre 2026 au soir, il a dit « garde garde » et rien ne s'est
     passé. J'ai d'abord cru que le mot manquait à la liste — il y était. Le
     registre a rendu ce que l'oreille avait vraiment écrit :

       « Garde ça »            → ordre pris, phrase rangée
       « Garde ça, garde ça »  → aucun ordre

     La première leçon de toute l'histoire du projet venait d'entrer par la
     première ; la seconde, dite deux secondes plus tard, est repartie au
     modèle. La liste connaissait « garde garde » mais pas « garde ça garde
     ça », et c'est lui qui a raison : QUAND IL REDOUBLE, IL REDOUBLE SA
     TOURNURE, pas un mot isolé.

     On redouble donc aussi les tournures courtes. Trois mots au plus, pour
     que le résultat tienne encore sous la limite de sept — au-delà, la
     tournure se suffisait déjà largement à elle-même. */
  for (const [quoi, formes] of ENTIERES) {
    const suite = par.get(quoi) || [];
    for (const f of formes) {
      if (f.split(" ").length <= 3) suite.push(`${f} ${f}`);
    }
    par.set(quoi, suite);
  }
  return [...par.entries()];
})();

/* ── LA PLACE DE SES TOURNURES WOLOF ────────────────────────────────────────

   À remplir par Lamine, et par lui seul. Elles passent AVANT les françaises :
   quand il aura écrit les siennes, ce sont elles qui feront foi.

   MÊME RÈGLE POUR LES SIENNES : un mot nu ne doit pas déclencher un ordre. Si
   c'est un mot court, écris-le déjà redoublé — « … … » — comme il le fait en
   français. Si c'est une tournure de plusieurs mots, elle se suffit.

   La forme attendue (le texte est à lui, pas à moi) :
     ["retiens", ["..."]],                                                  */
export const SIENNES: Array<[Quoi, string[]]> = [
];

/* Un ordre n'est jamais long. Au-delà, c'est une phrase qui CONTIENT le mot,
   pas un ordre — « je ne sais pas si je dois retenir ce qu'il m'a dit » ne
   doit rien déclencher. */
const MOTS_AU_PLUS = 7;

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
  const nu = sansLesBords(dit);
  for (const [quoi, formes] of [...SIENNES, ...FRANCAIS]) {
    for (const f of formes) {
      const forme = normaliser(f);
      if (dit === forme || (nu && nu === forme)) return { quoi, dit: texte.trim() };
    }
  }
  return null;
}

/* ── CE QU'IL Y A AUTOUR DE L'ORDRE ─────────────────────────────────────────

   Le 14 septembre 2026, le rangement disait 73 lignes et « sans auteur : 73 ».
   Pas UNE de ses leçons à la voix n'était arrivée. La liste ci-dessus n'était
   pas en cause : la comparaison, elle, l'était.

   Elle exigeait la phrase ENTIÈRE, au mot près. Or personne ne parle au mot
   près. Entre le verbe et le point, il met ce que tout le monde met :

     « voilà, mémorise ça »          « bon, retiens ça »
     « ok mémorise ça »              « mémorise ça, hein »

   Chacune de ces quatre phrases contient un ordre déjà écrit dans la liste, et
   chacune repartait au modèle. Il entendait une réponse aimable, croyait sa
   leçon rangée, et découvrait le trou une heure plus tard.

   ON RETIRE DONC LES BORDS, ET RIEN QUE LES BORDS. Ces mots-là ne changent le
   sens d'aucun ordre quand ils sont AUTOUR ; au milieu, ils ne sont pas
   touchés — « mémorise bon ça » n'existe pas et ne doit rien déclencher.

   ET ON N'ÉLARGIT PAS PLUS. La comparaison reste EXACTE sur ce qui reste, et
   la limite de sept mots tient. Une phrase qui CONTIENT « retiens » sans être
   un ordre — « je ne sais pas si tu dois retenir ça » — n'est toujours pas un
   ordre : elle est trop longue, et ce qui l'entoure n'est pas dans cette
   liste. Rater coûte une répétition ; inventer coûte un dégât. On rate
   volontiers, mais plus sur « voilà ».                                     */
const BORDS = [
  /* Les tournures de plusieurs mots d'abord : « d accord » se retire en
     entier, sinon « accord » resterait tout seul et ne voudrait plus rien
     dire. */
  "d accord", "ca y est", "s il te plait",
  "voila", "bon", "ok", "okay", "oui", "alors", "donc", "et", "ben", "eh",
  "hein", "la", "papa", "allez",
];

function sansLesBords(dit: string): string {
  let reste = dit;
  let encore = true;
  while (encore) {
    encore = false;
    for (const b of BORDS) {
      /* On ne retire jamais le dernier mot : une phrase entièrement faite de
         bords n'est pas un ordre, c'est un acquiescement. */
      if (reste.startsWith(`${b} `) && reste.length > b.length + 1) {
        reste = reste.slice(b.length + 1); encore = true;
      }
      if (reste.endsWith(` ${b}`) && reste.length > b.length + 1) {
        reste = reste.slice(0, -(b.length + 1)); encore = true;
      }
    }
  }
  return reste === dit ? "" : reste;
}

/* ── CE QU'ELLE RÉPOND, ET POURQUOI C'EST SI COURT ──────────────────────────

   En apprentissage, chaque mot qu'elle ajoute est un mot qui n'est pas la
   phrase qu'on lui apprend. Trois syllabes suffisent à dire qu'on a compris.

   Ces phrases-là sont FRANÇAISES et de ma main : ce sont des accusés de
   réception, pas du wolof. Le jour où il en voudra en wolof, il les écrira,
   et elles remplaceront celles-ci. */
/* ── « D'ACCORD PAPA » ──────────────────────────────────────────────────────

   Lamine, le 14 septembre 2026 : « ensuite elle doit dire d'accord papa. Il
   faut enregistrer ce mot-là — d'accord papa — pour qu'elle puisse le servir
   tout de suite. »

   UNE SEULE PHRASE POUR TOUS LES ORDRES, et c'est mieux que cinq. Il donne un
   ordre en conduisant : ce qu'il attend, ce n'est pas un compte rendu, c'est
   la preuve en trois syllabes qu'elle a entendu. « C'est mémorisé », « effacé
   de ma mémoire », « d'accord on arrête » — trois façons de dire la même
   chose, trois sons à enregistrer, et trois occasions de se tromper de
   réponse. Une seule, toujours la même, s'enregistre une fois et se reconnaît
   sans écouter.

   DEUX ORDRES RESTENT MUETS, et ce n'est pas un oubli : « tais-toi » et
   « répète ». Répondre « d'accord papa » à « tais-toi » serait se contredire
   dans la même seconde ; et « répète » n'a rien à annoncer, puisqu'elle
   répète.                                                                  */
const ACCORD = "D'accord papa.";

export const ACCUSES: Record<Quoi, string> = {
  apprendre: ACCORD,
  encore: ACCORD,
  retiens: ACCORD,
  fini: ACCORD,
  oublie: ACCORD,
  repete: "",
  micro: ACCORD,
  silence: "",
};

/* ── LA CLÉ DU SON DÉJÀ FABRIQUÉ ────────────────────────────────────────────

   « Elle doit dire d'accord papa — pour qu'elle puisse le servir tout de
   suite. » Un accusé qu'on fabrique à la voix met une seconde et coûte deux
   centimes ; enregistré une fois, il part instantanément et ne coûte plus
   rien. C'est exactement ce que le répertoire fait déjà pour les salutations.

   Le texte vit dans lib/services-textes.ts sous cette clé, pour être
   enregistré avec les autres, au même passage et au même bouton.           */
export const CLE_ACCORD = "ordre-daccord";

/* ── DANS QUELLE LANGUE ON VA CHERCHER LE SON ───────────────────────────────

   « D'accord papa » n'a qu'un texte, le français, et c'est SA décision du 14
   septembre 2026 : « ce n'est pas la peine de l'écrire en wolof, d'accord
   papa ça suffit largement. » Voir SANS_WOLOF_VOULU dans
   lib/services-textes.ts.

   Or la langue du son se décidait sur la langue de SA QUESTION. Donc dès
   qu'il donnait un ordre en wolof, on allait chercher « wo/ordre-daccord.mp3 »
   — un fichier qui n'existe pas, parce qu'un texte vide ne s'enregistre pas —
   et le téléphone retombait sur la voix fabriquée. Une seconde d'attente et
   deux centimes, à chaque ordre, pour une phrase qu'on venait justement
   d'enregistrer pour qu'elle soit instantanée.

   ON VA DONC CHERCHER LE SON DANS LA LANGUE QUI A UN TEXTE, pas dans celle où
   il a parlé. Le jour où il écrit le wolof, cette fonction rend « wo » toute
   seule, et rien d'autre ne bouge. */
export function langueDeLAccord(wolofEcrit: string): "wo" | "fr" {
  return wolofEcrit.trim() ? "wo" : "fr";
}
