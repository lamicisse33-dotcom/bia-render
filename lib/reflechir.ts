/* ── « PARFOIS LA NUIT ELLE EST BEAUCOUP PLUS INTELLIGENTE, PARFOIS TROP BÊTE »

   Lamine, le 16 septembre 2026 :

     « J'ai l'impression qu'il y a un système qui la manipule en bas. Donc,
       explique-moi réellement son fonctionnement. »

   Il n'y a pas de système en bas. Il y a CE fichier-ci, qui n'existait pas.

   ── CE QUI SE PASSAIT VRAIMENT ─────────────────────────────────────────────

   Le modèle répondait TOUJOURS du premier jet. `avecReflexion:false` était
   passé en dur sur l'appel principal, et il n'y avait aucun chemin pour le
   mettre à true autrement qu'en rattrapage de panne.

   Sur « naka nga def », c'est parfait : réfléchir à un bonjour ne l'améliore
   pas, ça le ralentit. Sur « si j'achète à 3 500 et que je vends à 5 000, en
   vendant 40 par semaine, je gagne combien par mois », le premier jet se
   trompe d'une étape et sort un chiffre faux avec assurance. Vu de Lamine :
   « parfois elle est trop bête. »

   ── ET POURQUOI C'ÉTAIT PIRE QUE ÇA ────────────────────────────────────────

   `avecReflexion:true` ne faisait RIEN de propre : il se contentait de ne pas
   envoyer `thinking:{type:"disabled"}`. Le modèle retombait alors sur son
   défaut, réflexion comprise — et avec un plafond de 300 jetons, la réflexion
   les mangeait tous AVANT la phrase. C'est exactement la panne du 15
   septembre, notée telle quelle dans le tableau :

       stop_reason max_tokens — blocs reçus : thinking

   Une réponse vide. Donc le seul chemin qui « réfléchissait » était celui qui
   la rendait muette. Il fallait les trois états, nommés, et un plafond qui
   tient compte du budget.

   ── CE QUE CE FICHIER NE FAIT PAS ──────────────────────────────────────────

   Il ne rend pas BIA plus lente sur ce qu'elle fait déjà bien. Sa priorité,
   posée le 15 septembre, reste la vitesse. Une question qui ne gagne rien à
   la réflexion n'y passe pas : salutation, traduction d'un mot, phrase de
   trois mots, et TOUT le mode apprentissage — là elle répète, elle ne pense
   pas.                                                                      */

import { normaliser } from "./normaliser";

/* Le minimum accepté par l'API. En dessous, la requête est refusée — ce n'est
   pas un réglage qu'on peut baisser pour économiser. */
export const BUDGET_DE_REFLEXION = 1024;

/* Le plafond doit être PLUS GRAND que le budget, sinon la réflexion mange
   tout et il ne reste rien pour la phrase : c'est la panne du 15 septembre.
   400 jetons de rab, soit un peu plus que les 300 d'une réponse ordinaire. */
export const PLAFOND_AVEC_REFLEXION = BUDGET_DE_REFLEXION + 400;

/* ── CE QUI MÉRITE QU'ELLE RÉFLÉCHISSE ─────────────────────────────────────

   Des familles, pas une liste de mots : ce sont les questions où le premier
   jet se trompe d'une ÉTAPE, pas celles où il manque un mot. */
const CALCUL = [
  "combien", "calcule", "calculer", "total", "reste", "benefice", "marge",
  "pour cent", "pourcent", "multiplie", "divise", "ñaata", "ñata",
];
const RAISONNEMENT = [
  "pourquoi", "comment faire", "comment je", "comment on fait", "explique",
  "explique moi", "qu est ce qui se passe si", "si je", "lu tax",
];
const COMPARAISON = [
  "mieux", "meilleur", "meilleure", "compare", "difference entre", "lequel",
  "laquelle", "plutot que", "ou bien", "vaut mieux",
];
/* Un papier est une STRUCTURE : un devis faux se voit, et il coûte de
   l'argent à celui qui l'envoie. */
const PAPIER = [
  "devis", "facture", "mail", "courriel", "lettre", "contrat", "plan",
  "tableau", "resume", "resumer",
];
/* Depuis le 16 septembre, avec son code, elle a le droit d'avoir un avis et
   de le défendre. Un avis du premier jet n'est pas un avis, c'est un réflexe. */
const AVIS = [
  "ton avis", "tu penses", "tu en penses", "d accord avec", "pas d accord",
  "convaincs", "defends", "argument", "debat", "yaa ngi xalaat",
];

const FAMILLES = [...CALCUL, ...RAISONNEMENT, ...COMPARAISON, ...PAPIER, ...AVIS];

/* ── ET CE QUI N'EN A JAMAIS BESOIN ────────────────────────────────────────

   Ces gardes passent AVANT les familles : « comment on dit merci en wolof »
   contient « comment », et ce n'est pourtant qu'une consultation. */
const TRADUCTION = [
  "comment on dit", "comment tu dis", "ça veut dire", "ca veut dire",
  "traduis", "traduction", "en wolof", "en francais", "naka lañuy wax",
];
const MOTS_AU_MOINS = 4;

/**
 * Cette question gagne-t-elle à ce qu'elle réfléchisse avant de parler ?
 *
 * `apprentissage` : dans le mode leçon elle RÉPÈTE, elle ne pense pas. La
 * réflexion n'y ajouterait que de l'attente, sur le seul geste où il en fait
 * des dizaines d'affilée.
 */
export function meriteReflexion(question: string, apprentissage = false): boolean {
  if (apprentissage) return false;
  const q = normaliser(question);
  if (!q) return false;

  /* Une consultation de vocabulaire : on cherche, on ne raisonne pas. */
  if (TRADUCTION.some((t) => q.includes(normaliser(t)))) return false;

  const mots = q.split(" ").filter(Boolean);
  /* Trop courte pour contenir un raisonnement. « Naka nga def », « et toi »,
     « ok merci » : trois mots ne cachent aucune étape. */
  if (mots.length < MOTS_AU_MOINS) return false;

  if (FAMILLES.some((f) => q.includes(normaliser(f)))) return true;

  /* ── ET LA LONGUEUR, QUI DIT LA MÊME CHOSE AUTREMENT ────────────────────
     Une question de plus de vingt mots porte presque toujours plusieurs
     éléments à tenir ensemble — un prix, une quantité, une durée. C'est
     exactement là que le premier jet en oublie un. */
  if (mots.length >= 20) return true;

  /* Deux chiffres et plus dans la même phrase : il y a quelque chose à
     mettre en rapport, donc une étape où se tromper. */
  const chiffres = q.match(/\d+/g) || [];
  if (chiffres.length >= 2) return true;

  return false;
}

/* ── ET ON COMPTE, PARCE QUE JE LUI AI PROMIS DE MESURER ───────────────────

   « Je le mesure avant et après plutôt que de te le promettre. » Sans ce
   compteur, on saurait seulement que le code existe — pas s'il se déclenche
   sur une question sur vingt ou sur toutes, ni ce qu'il coûte en attente. */
let compte = { questions: 0, reflechies: 0, msSansReflexion: 0, msAvecReflexion: 0 };

export function noterReflexion(reflechie: boolean, ms: number): void {
  compte.questions++;
  if (reflechie) { compte.reflechies++; compte.msAvecReflexion += ms; }
  else compte.msSansReflexion += ms;
}

export function resumeReflexion() {
  if (!compte.questions) return null;
  const sans = compte.questions - compte.reflechies;
  return {
    questions: compte.questions,
    reflechies: compte.reflechies,
    /* La ligne qu'on lit en premier : sur cent questions, combien passent par
       la réflexion. Trop haut, elle est redevenue lente pour rien. */
    part_reflechie: Math.round((compte.reflechies / compte.questions) * 100),
    /* LES DEUX MOYENNES CÔTE À CÔTE. C'est le prix, en clair, et c'est la
       seule façon de savoir si l'arbitrage tient. */
    ms_sans_reflexion: sans ? Math.round(compte.msSansReflexion / sans) : null,
    ms_avec_reflexion: compte.reflechies ? Math.round(compte.msAvecReflexion / compte.reflechies) : null,
    budget: BUDGET_DE_REFLEXION,
  };
}

export function oublierLaReflexion(): void {
  compte = { questions: 0, reflechies: 0, msSansReflexion: 0, msAvecReflexion: 0 };
}
