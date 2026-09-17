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

export function oublierLaPesee(): void { blocs = new Map(); tours = 0; }
