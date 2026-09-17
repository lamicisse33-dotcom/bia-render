/* ── CE QUE PÈSE SA CONSIGNE, BLOC PAR BLOC ─────────────────────────────────

   Lamine, le 17 septembre 2026 : « j'ai acheté du crédit 50 $ il n'y a même
   pas trois jours, c'est pas possible. »

   Il avait raison, et la cause était chez moi. Mesuré cette nuit-là sur 63
   tours : 36 000 jetons envoyés au modèle pour 114 reçus. Sa consigne faisait
   TROIS CENTS FOIS la longueur de sa réponse.

   ── LA FAUTE, ET ELLE EST SIMPLE ───────────────────────────────────────────

   Pendant une semaine, chaque fois qu'il demandait une chose de plus — qu'elle
   voie ses gestes, qu'elle se souvienne, qu'elle sache ce qu'il lui a appris —
   j'ai ajouté un bloc à sa consigne. Et je n'ai JAMAIS pesé la pile.

   C'est exactement le défaut que ce projet traque partout ailleurs : agir sans
   regarder l'état réel. Je l'ai commis sur sa facture, et il l'a payé.

   ── DONC ON PÈSE, ET ON LE VOIT ────────────────────────────────────────────

   Ce fichier ne change aucun comportement. Il compte des signes, il ne décide
   rien. Mais à partir d'aujourd'hui, le jour où j'ajoute un bloc, la pile se
   voit sur la page d'état LE SOIR MÊME, au lieu d'apparaître sur une facture
   trois jours plus tard.

   ── POURQUOI EN SIGNES ET PAS EN JETONS ────────────────────────────────────

   Compter les jetons demanderait le découpeur du modèle : un paquet de plus,
   du temps à chaque tour, pour une précision dont on n'a pas besoin. Un jeton
   vaut environ quatre signes en français. On divise, on le dit, et on ne
   prétend pas à mieux — un compteur qui affiche une fausse précision est pire
   qu'un compteur approximatif qui l'avoue.

   ÇA VIT EN MÉMOIRE et repart à zéro au réveil du serveur, comme les autres
   compteurs. Ce fichier n'a aucun import. */

/** Un jeton vaut à peu près quatre signes en français. Approximation assumée. */
export const SIGNES_PAR_JETON = 4;

type Bloc = { signes: number; fois: number };

let blocs = new Map<string, Bloc>();
let tours = 0;

/**
 * Note ce qu'un bloc a pesé sur ce tour-ci.
 *
 * `nom` est le titre du bloc, en clair — c'est ce qui s'affichera. Un bloc
 * absent ne se note pas : « jamais envoyé » et « envoyé vide » ne sont pas la
 * même chose, et c'est la confusion qui nous a coûté une soirée sur les
 * verdicts.
 */
export function peser(nom: string, texte: string): string {
  const n = String(texte || "").length;
  if (n > 0) {
    const d = blocs.get(nom) || { signes: 0, fois: 0 };
    d.signes += n;
    d.fois += 1;
    blocs.set(nom, d);
  }
  return String(texte || "");
}

/** Un tour de plus a été composé. À appeler une fois par appel au modèle. */
export function unTourDePlus(): void { tours += 1; }

/* ── CE QU'ON REND ──────────────────────────────────────────────────────────

   Trié du plus lourd au plus léger : c'est la seule façon de lire un tel
   tableau. On rend la MOYENNE PAR TOUR, pas le total — le total grossit avec
   la conversation et ne dit rien sur ce qu'on paie à chaque question.

   Et on rend `fois` : un bloc qui pèse 3 000 signes mais ne part qu'une fois
   sur vingt ne coûte pas ce qu'il a l'air de coûter. Le tableau doit permettre
   de distinguer « gros » de « cher ». */
export function peseeDeLaConsigne() {
  if (!tours) return null;
  const lignes = [...blocs.entries()]
    .map(([nom, d]) => ({
      bloc: nom,
      /* Ce qu'il ajoute à un tour moyen — c'est ça qu'on paie. */
      signes_par_tour: Math.round(d.signes / tours),
      /* Ce qu'il pèse QUAND il part. */
      signes_quand_il_part: Math.round(d.signes / d.fois),
      part_des_tours: Math.round((d.fois / tours) * 100),
    }))
    .sort((a, b) => b.signes_par_tour - a.signes_par_tour);
  const total = lignes.reduce((n, l) => n + l.signes_par_tour, 0);
  return {
    tours,
    signes_par_tour: total,
    jetons_par_tour: Math.round(total / SIGNES_PAR_JETON),
    blocs: lignes,
  };
}

/* ── CINQ MINUTES OU UNE HEURE : L'ÉCART ENTRE DEUX TOURS TRANCHE ──────────

   J'ai mis le cache à une heure de durée de vie sans regarder ce que ça
   coûtait. Les tarifs, vérifiés le 18 septembre 2026 dans la documentation :

       écriture d'un cache de 5 minutes   1,25 × le tarif d'entrée
       écriture d'un cache d'une heure    2,00 ×
       relecture                          0,10 ×
       et une relecture PROLONGE la durée de vie, gratuitement

   Ce dernier point décide de tout, et c'est celui que j'avais ignoré. Tant
   que deux questions se suivent à moins de cinq minutes, un cache de cinq
   minutes ne meurt jamais : il se prolonge tout seul, à chaque tour. Une
   conversation suivie coûte alors 1,25 d'écriture au lieu de 2,00 — le cache
   d'une heure ne sert à RIEN et se paie 60 % plus cher.

   Le cache d'une heure ne gagne que dans un cas : reprendre à froid plusieurs
   fois dans la même heure. Deux départs à froid par heure, et il redevient le
   moins cher (2,00 contre 2 × 1,25).

   ── DONC ON MESURE L'ÉCART, AU LIEU D'EN DÉBATTRE ─────────────────────────

   On note le temps écoulé depuis le tour précédent, et on range en trois :
   moins de cinq minutes (le cache court tient tout seul), entre cinq minutes
   et une heure (seul le cache long tient), au-delà (les deux sont morts, on
   repaie une écriture quoi qu'il arrive).

   La règle qui en sort tient en une ligne : si les reprises entre 5 min et
   1 h sont rares, on passe à cinq minutes et on économise 0,75 × le préfixe
   à chaque départ.

   ET ÇA S'AMÉLIORERA TOUT SEUL. Depuis que le socle ne dépend plus de la
   question, il est IDENTIQUE pour tout le monde : à plusieurs utilisateurs,
   il est relu en permanence et ne meurt plus jamais. Le cache long perd son
   dernier intérêt le jour où BIA n'est plus utilisée par une seule personne.

   Ça vit en mémoire et repart à zéro au réveil du serveur, comme le reste. */

let dernierTour = 0;
const ecarts = { moins_de_5_min: 0, de_5_min_a_1_h: 0, plus_d_1_h: 0, premier: 0 };

/** À appeler au début d'un tour, avant de composer la consigne. */
export function noterLEcart(maintenant = Date.now()): void {
  if (!dernierTour) ecarts.premier += 1;
  else {
    const minutes = (maintenant - dernierTour) / 60000;
    if (minutes < 5) ecarts.moins_de_5_min += 1;
    else if (minutes < 60) ecarts.de_5_min_a_1_h += 1;
    else ecarts.plus_d_1_h += 1;
  }
  dernierTour = maintenant;
}

/**
 * Ce que chaque durée de vie coûterait, en multiples du tarif d'entrée du
 * préfixe. On ne rend pas un verdict : on rend les deux nombres, et le plus
 * petit gagne.
 */
export function ecartsEntreLesTours() {
  const n = ecarts.premier + ecarts.moins_de_5_min + ecarts.de_5_min_a_1_h + ecarts.plus_d_1_h;
  if (!n) return null;
  /* Un tour qui trouve le cache vivant se relit à 0,1 ; sinon on réécrit. */
  const froids5 = ecarts.premier + ecarts.de_5_min_a_1_h + ecarts.plus_d_1_h;
  const froids1h = ecarts.premier + ecarts.plus_d_1_h;
  return {
    ...ecarts,
    tours: n,
    cout_si_5_min: Number((froids5 * 1.25 + (n - froids5) * 0.1).toFixed(2)),
    cout_si_1_h: Number((froids1h * 2 + (n - froids1h) * 0.1).toFixed(2)),
    /* En multiples du tarif d'entrée du préfixe, sur l'ensemble des tours. */
    unite: "× le tarif d'entrée du préfixe, cumulé sur tous les tours",
  };
}

export function oublierLaPesee(): void {
  blocs = new Map();
  tours = 0;
  dernierTour = 0;
  ecarts.premier = 0;
  ecarts.moins_de_5_min = 0;
  ecarts.de_5_min_a_1_h = 0;
  ecarts.plus_d_1_h = 0;
}
