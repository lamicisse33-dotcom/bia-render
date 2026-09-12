/* ── QUAND FERMER LE MICRO ───────────────────────────────────────────────────

   Lamine, le 12 septembre 2026 : « je lui ai dit Salam, elle est restée
   presque quatre secondes avant de réagir. C'est pas normal vu que c'est déjà
   enregistré : dès que le micro se coupe, elle doit répondre. »

   Il avait raison, et la plus grosse part de ces quatre secondes se décidait
   ici. Le micro attendait DEUX SECONDES PLEINES de silence après le dernier
   son avant même de s'arrêter d'enregistrer. « Salaam » dure une
   demi-seconde : on passait quatre fois plus de temps à vérifier qu'il avait
   fini qu'il n'en avait mis à parler. La transcription, la réponse et le son
   ne commençaient qu'après.

   ── POURQUOI CE N'ÉTAIT PAS UNE BÊTISE, ET POURQUOI ÇA L'EST DEVENU ───────

   Deux secondes protègent quelqu'un qui cherche ses mots au milieu d'une
   longue phrase — « dama bëgg… euh… dama bëgg bind ab bataaxal ». Couper là,
   c'est perdre la moitié de sa demande, et c'est bien pire qu'attendre. Mais
   la même règle appliquée à un mot unique ne protège plus personne : elle
   fait juste attendre.

   ON REGARDE DONC CE QUI VIENT D'ÊTRE DIT. C'est la durée de la parole qui
   dit combien de silence il faut :

     — moins d'une seconde et demie : un mot, une salutation, un « waaw ».
       Sept dixièmes de seconde suffisent. Personne ne dit « Salaam » puis
       reprend son souffle au milieu.
     — jusqu'à quatre secondes : une phrase. Une seconde.
     — au-delà : un récit, une explication. Une seconde et demie, parce que
       là, oui, on s'arrête pour réfléchir et on reprend.

   ── CE QU'ON NE FAIT PAS ─────────────────────────────────────────────────

   ON NE DESCEND PAS SOUS SEPT DIXIÈMES, même pour aller plus vite. En dessous,
   on coupe la parole : une hésitation d'un demi-souffle entre deux mots
   wolof ferait partir la question à moitié. Une réponse rapide à une question
   tronquée n'est pas une réponse rapide, c'est une erreur rapide — et il faut
   alors tout recommencer, ce qui est bien plus long que d'avoir attendu. */

/** Le plancher : jamais moins, quoi qu'il arrive. */
export const SILENCE_LE_PLUS_COURT = 700;

/** Un mot ou deux : au-delà de cette durée de parole, on laisse plus de temps. */
export const PAROLE_COURTE = 1200;

/** Au-delà, c'est un récit : on accorde le silence le plus long. */
export const PAROLE_LONGUE = 4000;

/**
 * Combien de silence il faut, après le dernier son, pour considérer que la
 * personne a fini de parler.
 *
 * @param dureeDeParole combien de temps elle vient de parler, en millisecondes
 */
export function silenceQuiSuffit(dureeDeParole: number): number {
  const parole = Number.isFinite(dureeDeParole) && dureeDeParole > 0 ? dureeDeParole : 0;
  if (parole < PAROLE_COURTE) return SILENCE_LE_PLUS_COURT;
  if (parole < PAROLE_LONGUE) return 1000;
  return 1500;
}

/* ── COMBIEN DE FOIS PAR SECONDE ON REGARDE ────────────────────────────────

   Soixante millisecondes, et plus cent vingt. Un tour de veille manqué, c'est
   un dixième de seconde d'attente en plus pour rien — et sur une salutation,
   un dixième se remarque. Le calcul est quatre lignes : on peut le faire
   seize fois par seconde sans que personne le sente. */
export const TOUR_DE_VEILLE = 60;

/* Combien de tours de silence PARFAIT avant de déclarer l'analyseur mort.
   Ce nombre compte des TOURS, pas des secondes : il a dû doubler quand la
   veille a doublé de vitesse, sinon le micro se fermait au bout d'une seconde
   au nez de quelqu'un qui réfléchit avant de parler. */
export const TOURS_MUETS_AVANT_DE_DOUTER = Math.round(2000 / TOUR_DE_VEILLE);
