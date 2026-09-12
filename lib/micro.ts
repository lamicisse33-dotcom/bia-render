/* ── LE MICRO : QUAND IL ÉCOUTE, QUAND IL SE TAIT, QUAND IL COUPE ───────────

   Lamine, le 12 septembre 2026 :

     « Le microphone actuel oblige l'utilisateur à appuyer avant chaque
       intervention et coupe parfois avant la fin de sa phrase. Nous voulons
       un fonctionnement proche de ChatGPT vocal : un premier appui ouvre la
       conversation, le micro reste ensuite actif, BIA détecte le début et la
       fin de la parole, et se remet à écouter après sa réponse. »

   TOUS LES NOMBRES DE LA CONVERSATION VOCALE SONT ICI, et pas dans la page.
   Ce ne sont pas des détails de réglage : chacun est une décision sur ce qui
   se passe quand quelqu'un hésite, tousse, ou parle dans un taxi. Rangés
   ensemble, ils se mesurent et se gardent par une épreuve. Éparpillés dans
   trois cents lignes d'interface, ils dérivent en silence — et la panne ne se
   voit qu'au moment où on montre BIA à quelqu'un.

   ═══ 1. COMBIEN DE SILENCE AVANT DE CONSIDÉRER QU'ELLE A FINI ═══

   Lamine avait demandé, une heure plus tôt : « je lui ai dit Salam, elle est
   restée presque quatre secondes avant de réagir. » La plus grosse part de
   ces quatre secondes se décidait ici : on attendait DEUX SECONDES pleines de
   silence avant même d'arrêter d'enregistrer. « Salaam » dure une
   demi-seconde.

   Deux secondes n'étaient pas une bêtise, c'était une précaution mal placée :
   elle protège celui qui cherche ses mots au milieu d'une longue phrase, elle
   punit celui qui dit un mot. On regarde donc CE QUI VIENT D'ÊTRE DIT.

   Il a choisi l'adaptatif le 12 septembre, en connaissance de cause : sa
   consigne écrite disait 1,2 à 1,5 s, et un mot seul sort plus vite que ça.

   ON NE DESCEND PAS SOUS 0,9 s. En dessous on coupe la parole, et une réponse
   rapide à une question tronquée n'est pas une réponse rapide : c'est une
   erreur qu'il faut recommencer — donc plus lent, et plus cher.

   ═══ 2. LE BRUIT DE LA PIÈCE ═══

   Le seuil était FIXE (« creux > 8 »). Dans une chambre la nuit, il entend
   une respiration ; dans un taxi à Dakar, vitres ouvertes, il entend la rue
   en permanence et ne se ferme jamais. On mesure donc le fond sonore pendant
   les premières fractions de seconde, et on se cale dessus.

   ═══ 3. CE QUI NE VAUT PAS LA PEINE D'ÊTRE ENVOYÉ ═══

   Micro ouvert en permanence, une porte qui claque devient une question. Elle
   part chez le moteur de transcription, elle est PAYÉE, et BIA répond à une
   porte. On exige donc une vraie parole : assez longue pour être une syllabe
   humaine, et pas un choc.

   ═══ 4. LUI COUPER LA PAROLE SANS QU'ELLE SE COUPE ELLE-MÊME ═══

   C'est le vrai danger de l'écoute continue, et il faut le nommer : micro
   ouvert pendant qu'elle parle dans le haut-parleur, ELLE S'ENTEND. Elle se
   transcrit, elle se répond, et ça tourne en boucle — en payant une
   transcription à chaque tour.

   L'annulation d'écho du navigateur aide, mais elle ne suffit pas toujours
   sur un haut-parleur de téléphone. On ajoute donc la seule défense qui ne
   dépende de personne : BIA sait déjà, à chaque instant, quelle est l'énergie
   de sa propre voix — c'est ce qui fait bouger sa bouche. Pour la couper, il
   faut la COUVRIR : être plus fort qu'elle, et le rester assez longtemps pour
   que ce ne soit ni un écho ni un claquement.

   Choisi par Lamine le 12 septembre : « elle se tait si ta voix couvre la
   sienne ». Avec des écouteurs, il n'y a pas d'écho du tout et ça part au
   premier mot. */

/* ═══ 1. LE SILENCE QUI TERMINE UN TOUR ══════════════════════════════════ */

/** Jamais moins, quoi qu'il arrive : en dessous, on coupe la parole. */
export const SILENCE_LE_PLUS_COURT = 900;

/** Un mot ou deux : en dessous de cette durée de parole, on ferme vite. */
export const PAROLE_COURTE = 1200;

/** Au-delà, c'est un récit : on laisse le temps de reprendre son souffle. */
export const PAROLE_LONGUE = 4000;

/**
 * Combien de silence il faut, après le dernier son, pour considérer que la
 * personne a fini.
 *
 * @param dureeDeParole combien de temps elle vient de parler, en millisecondes
 */
export function silenceQuiSuffit(dureeDeParole: number): number {
  const parole = Number.isFinite(dureeDeParole) && dureeDeParole > 0 ? dureeDeParole : 0;
  if (parole < PAROLE_COURTE) return SILENCE_LE_PLUS_COURT;
  if (parole < PAROLE_LONGUE) return 1200;
  return 1500;
}

/* ═══ 2. LE BRUIT DE LA PIÈCE ════════════════════════════════════════════ */

/** Combien de temps on écoute la pièce avant de décider ce qu'est le silence. */
export const MESURE_DU_FOND = 400;

/** Le seuil d'autrefois, qui devient notre plancher : une pièce calme. */
export const SEUIL_LE_PLUS_BAS = 8;

/** Et le plafond : au-delà, c'est qu'on mesure une voix, pas un fond. Se
    caler dessus rendrait BIA sourde. */
export const SEUIL_LE_PLUS_HAUT = 34;

/**
 * Le seuil à partir duquel on considère que quelqu'un parle, sachant le bruit
 * de fond mesuré. Il faut dépasser le fond franchement — sinon la rue suffit
 * à tenir le micro ouvert pour toujours.
 */
export function seuilDeParole(fond: number): number {
  const f = Number.isFinite(fond) && fond > 0 ? fond : 0;
  const vise = Math.round(f * 2.2 + 4);
  return Math.min(SEUIL_LE_PLUS_HAUT, Math.max(SEUIL_LE_PLUS_BAS, vise));
}

/* ═══ 3. CE QU'ON ENVOIE, ET CE QU'ON JETTE ══════════════════════════════ */

/** Moins que ça, ce n'est pas une parole : une porte, un choc, une toux.
    On ne l'envoie pas — ça coûterait une transcription pour rien, et BIA
    répondrait à une porte. */
export const PAROLE_MINIMALE = 350;

/** La plus longue intervention qu'on accepte d'un coup. Lamine : « 60 à 90
    secondes ». Au-delà, on envoie ce qu'on a plutôt que de tout perdre. */
export const INTERVENTION_MAXIMALE = 75000;

/** Micro ouvert sans que personne ne dise rien : au bout de ça, on referme la
    conversation vocale et on rend le bouton. Deux minutes de micro ouvert sur
    un téléphone, c'est de la batterie et une lampe rouge pour rien. */
export const SILENCE_QUI_CLÔT_LA_CONVERSATION = 150000;

/**
 * Cette parole vaut-elle d'être envoyée à la transcription ?
 * @param dureeDeParole durée cumulée de ce qui a été entendu, en millisecondes
 */
export function vautLaPeine(dureeDeParole: number): boolean {
  return Number.isFinite(dureeDeParole) && dureeDeParole >= PAROLE_MINIMALE;
}

/* ═══ 4. LUI COUPER LA PAROLE ════════════════════════════════════════════ */

/* Ce que sa propre voix, à pleine puissance, laisse passer dans le micro
   MALGRÉ l'annulation d'écho — en amplitude, sur l'échelle de 0 à 127 que
   rend l'analyseur.

   C'est le seul nombre de ce fichier qui décrit le monde physique et pas une
   décision : il dépend du haut-parleur, de la pièce, et de la qualité de
   l'annulation d'écho du téléphone. Vingt-huit est une estimation prudente —
   assez haute pour qu'elle ne se coupe pas elle-même, assez basse pour qu'on
   puisse l'interrompre sans crier. Avec des écouteurs, l'écho est nul et ce
   nombre ne sert à rien : la barre reste au seuil ordinaire dès qu'elle
   marque une pause, et on la coupe au premier mot.

   S'IL FAUT LE RÉGLER UN JOUR, ça se règle ici et nulle part ailleurs, et le
   symptôme dit dans quel sens : elle se répond toute seule → monter ; on doit
   crier pour l'interrompre → descendre. */
export const ECHO_A_PLEINE_VOIX = 28;

/** Et combien de temps il faut tenir : en dessous, un claquement de portière
    la ferait taire au milieu d'une phrase. */
export const TENIR_POUR_COUPER = 250;

/**
 * Est-ce que ce qu'entend le micro couvre vraiment la voix de BIA ?
 *
 * La barre monte avec SA voix : quand elle se tait entre deux phrases, le
 * seuil ordinaire suffit et on la reprend d'un mot ; quand elle donne de la
 * voix, il faut passer par-dessus l'écho qu'elle produit elle-même.
 *
 * @param creuxDuMicro l'amplitude entendue (0 à 127)
 * @param saVoix l'énergie de sa propre voix à cet instant (0 à 1)
 * @param seuil le seuil de parole calculé pour cette pièce
 */
export function couvreSaVoix(creuxDuMicro: number, saVoix: number, seuil: number): boolean {
  const elle = Number.isFinite(saVoix) && saVoix > 0 ? Math.min(saVoix, 1) : 0;
  return creuxDuMicro > seuil + elle * ECHO_A_PLEINE_VOIX;
}

/* ═══ LA VEILLE ══════════════════════════════════════════════════════════ */

/** Toutes les combien de millisecondes on regarde le micro. Un tour manqué,
    c'est un dixième de seconde d'attente en plus pour rien. */
export const TOUR_DE_VEILLE = 60;

/** Combien de tours de silence PARFAIT avant de déclarer l'analyseur mort.
    Ce nombre compte des TOURS, pas des secondes : il doit suivre la vitesse
    de la veille, sinon le micro se ferme au nez de quelqu'un qui réfléchit. */
export const TOURS_MUETS_AVANT_DE_DOUTER = Math.round(2000 / TOUR_DE_VEILLE);

/* ═══ CE QU'ON DEMANDE AU TÉLÉPHONE ══════════════════════════════════════ */

/* Il n'y avait AUCUN réglage : `getUserMedia({ audio: true })`, et le
   téléphone faisait ce qu'il voulait. Les trois demandés par Lamine sont des
   options standard du navigateur — il les honore quand il sait, il les ignore
   sans se plaindre quand il ne sait pas. L'annulation d'écho est la plus
   importante des trois : c'est elle qui empêche BIA de s'entendre parler. */
export const REGLAGES_DU_MICRO: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};
