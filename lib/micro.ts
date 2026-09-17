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

/* ── DEUX SECONDES, ET C'EST SA DÉCISION ──────────────────────────────────

   Lamine, le 12 septembre 2026 au soir : « il faut faire de sorte que le
   micro se coupe après deux secondes de silence. S'il détecte un son, il peut
   se rallumer. Je pense que ça peut résoudre le problème. »

   ── ET ÇA RENVERSE CE QU'ON AVAIT FAIT LE MATIN ───────────────────────────

   Le matin même il disait l'inverse : « je lui ai dit Salam, elle est restée
   presque quatre secondes avant de réagir ». J'avais donc remplacé les deux
   secondes fixes par une échelle — 0,9 s après un mot, 1,2 s après une
   phrase, 1,5 s après un récit.

   Ce qu'il a appris entre les deux, c'est POURQUOI elle répondait de travers.
   Une phrase coupée trop tôt part à moitié chez le moteur de transcription, et
   une moitié de phrase wolof ne se transcrit pas : elle se devine. Mieux vaut
   attendre une seconde de plus et qu'elle comprenne, que répondre vite à une
   phrase qu'elle n'a pas entendue en entier.

   C'est son application, c'est sa langue, et il vient d'entendre les deux. Je
   pose donc son nombre. Ce que ça coûte, dit franchement : sur « Salaam »,
   elle répondra environ une seconde plus tard qu'hier soir.

   ET LE RALLUMAGE EST DÉJÀ LÀ, c'est la conversation continue du matin : dès
   qu'elle revient au repos, le micro se rouvre tout seul — donc le son
   suivant est entendu sans qu'on appuie. */

/* ── ET LE 13 SEPTEMBRE, IL REDESCEND À UNE SECONDE ────────────────────────

   « C'est vrai, pour les deux secondes, tu peux descendre sur une seconde. On
   va tester voir, une seconde. »

   C'est le troisième réglage de ce nombre en deux jours, et les trois étaient
   fondés — ce n'est pas de l'indécision, c'est quelqu'un qui écoute son
   application :

     — le 12 au matin : 0,9 à 1,5 s selon la longueur, parce que « je lui ai
       dit Salam, elle est restée presque quatre secondes avant de réagir » ;
     — le 12 au soir : 2 s fixes, parce qu'une phrase wolof coupée en deux ne
       se transcrit pas, elle se devine, et qu'une réponse rapide à une
       question tronquée n'est pas une réponse rapide ;
     — le 13 : une seconde, après avoir vu le décompte de ce qui le fait
       attendre. Sur quatre secondes entre sa dernière syllabe et la voix de
       Kha, ces deux-là étaient la moitié — et la seule moitié qu'il pouvait
       décider lui-même.

   CE QUE ÇA RISQUE, DIT FRANCHEMENT : une seconde de silence au milieu d'une
   phrase — chercher un mot, reprendre son souffle — ferme le micro et envoie
   une demi-phrase à la transcription. C'est exactement ce qui l'avait fait
   remonter à deux secondes hier soir. S'il le réentend, on remonte ; et si
   c'est seulement sur les longues phrases, l'échelle du matin est toujours
   écrite plus bas, il suffit de la rebrancher.

   Il le dit lui-même : « on va tester voir ». Ce nombre est fait pour bouger,
   et il est seul ici pour que ça coûte une ligne. */

/* ── ET UNE HEURE PLUS TARD, UNE SECONDE ET DEMIE ──────────────────────────

   « Est-ce qu'il ne vaut pas mieux faire une seconde trente ? Parce qu'une
   seconde c'est trop petit. »

   Oui, et pour une raison qui venait de changer sous nos pieds. Quand il a
   choisi une seconde, le réveil de Render pesait encore CINQUANTE SECONDES :
   dans ce contexte, gratter un demi-seconde de plus avait du sens. La tâche
   de réveil posée dans la foulée a supprimé ces cinquante secondes — et ce
   demi-seconde ne pèse donc presque plus rien, alors que le risque, lui, n'a
   pas bougé.

   ET CE RISQUE EST ASYMÉTRIQUE, c'est lui qui me l'a appris hier soir :

     fermer trop tard  →  un demi-seconde d'attente ;
     fermer trop tôt   →  une demi-phrase wolof part à la transcription, qui
                          ne la transcrit pas mais la devine ; réponse à
                          côté, question à reposer, transcription payée pour
                          rien. Bien plus qu'un demi-seconde perdu.

   Une seconde de silence arrive AU MILIEU d'une phrase — chercher un mot,
   reprendre son souffle. Une seconde et demie, beaucoup moins souvent.

   C'est le quatrième réglage de ce nombre, et le premier que je propose
   moi-même plutôt que de le recevoir. Il reste le sien : si 1,5 s le fait
   attendre à l'oreille, on redescend. */

/** Le silence qui ferme le micro. Un seul nombre, et c'est le sien. */
export const SILENCE_QUI_FERME = 1500;

/** Jamais moins, quoi qu'il arrive : en dessous, on coupe la parole. */
export const SILENCE_LE_PLUS_COURT = 900;

/* Les deux paliers de l'échelle. Ils décident de nouveau depuis le
   15 septembre 2026 : voir silenceQuiSuffit() juste en dessous. Le jour
   prévu est arrivé — c'est le tableau de /vitesse qui l'a amené. */
export const PAROLE_COURTE = 1200;
export const PAROLE_LONGUE = 4000;

/**
 * Combien de silence il faut, après le dernier son, pour considérer que la
 * personne a fini. Une seconde et demie, quelle que soit la longueur de sa
 * phrase.
 *
 * @param dureeDeParole combien de temps elle vient de parler, en millisecondes
 */
export function silenceQuiSuffit(dureeDeParole: number): number {
  /* ── L'ÉCHELLE ROUVERTE, ET C'EST LUI QUI L'A CHIFFRÉE ────────────────

     Lamine, le 15 septembre 2026, devant le tableau qui affichait 1536 ms à
     chaque tour :

       « Je ne mettrais pas 700 ms partout. Je réactiverais l'adaptatif de
         façon prudente : moins de 1200 → 900, moins de 4000 → 1200, sinon
         1500. Cela peut récupérer environ 300 à 600 ms sans trop augmenter
         le risque de couper quelqu'un. »

     C'est le bon raisonnement, et c'est le sien. Le danger n'est pas le même
     selon la longueur : après « Salam », il n'y a rien à couper — la phrase
     est finie. Après une longue intervention, une seconde de silence est
     souvent une respiration au milieu, et fermer là envoie une demi-phrase
     wolof à la transcription, qui la devine au lieu de la lire.

     Le plancher reste à 900 ms. En dessous, on coupe la parole — et une
     question reposée coûte bien plus que les millisecondes gagnées. */
  if (dureeDeParole < PAROLE_COURTE) return 900;
  if (dureeDeParole < PAROLE_LONGUE) return 1200;
  return SILENCE_QUI_FERME;
}

/* ═══ 2. LE BRUIT DE LA PIÈCE ════════════════════════════════════════════

   ── MA PREMIÈRE VERSION RENDAIT BIA SOURDE, ET C'EST LUI QUI L'A VU ──────

   Lamine, le 12 septembre 2026 : « ce n'est toujours pas net, tu peux rester
   à parler, elle n'entend rien. »

   Il avait raison, et le défaut était entier. J'écoutais la pièce pendant
   quatre dixièmes de seconde et je gardais LE PLUS FORT de ce que
   j'entendais :

       fond = Math.max(fond, creux)

   Or personne n'attend quatre dixièmes de seconde avant de parler : on
   appuie et on parle. Je mesurais donc SA VOIX et je l'appelais « bruit de
   fond ». Le seuil montait alors à 34 — mon plafond — et une voix ordinaire
   ne le dépasse pas. BIA devenait sourde pour tout le reste de la
   conversation.

   J'avais même écrit, dans le commentaire : « si quelqu'un parle pendant ce
   temps-là, tant mieux, sa voix le dépasse largement de toute façon ». C'était
   une supposition, et elle était fausse. Le pire genre de ligne : celle qui
   affirme sans avoir mesuré.

   ── LA BONNE FORMULE, ET POURQUOI C'EST CELLE-LÀ ─────────────────────────

   Le bruit de fond n'est pas le plus fort de ce qu'on entend : c'est le plus
   FAIBLE. Par définition, c'est ce qui reste quand personne ne parle.

   On suit donc un MINIMUM QUI PEUT REMONTER :

     — il descend INSTANTANÉMENT au moindre creux de silence, parce qu'un
       silence dit la vérité sur la pièce ;
     — il remonte LENTEMENT, quelques unités par seconde, pour suivre une rue
       qui s'anime ou un ventilateur qu'on allume.

   Parler ne peut donc plus le faire monter : une phrase de trois secondes ne
   lui donne que le temps de monter d'un cheveu, et la première respiration le
   ramène au vrai.

   ── ET DEUX SEUILS, PAS UN ───────────────────────────────────────────────

   C'est l'autre moitié de « ce n'est pas net ». Avec un seul seuil, la voix
   qui l'effleure fait clignoter « je t'entends / je n'entends plus » dix fois
   par seconde, et le micro se ferme dans les creux d'une phrase.

   Il faut donc plus de force pour COMMENCER à entendre que pour CONTINUER —
   c'est ce qu'on appelle une hystérésis, et c'est exactement ce qui manquait.
   Une fois qu'on a reconnu une voix, on la suit dans ses creux. */

/** Le fond de départ, avant d'avoir rien mesuré. UN, et pas quatre : avec
    quatre, le seuil de départ valait quinze, et une voix faible — un
    téléphone tenu à bout de bras, mesuré à quatorze — passait dessous sans
    être entendue. À un, le seuil de départ vaut huit : exactement l'ancien
    seuil fixe, celui qui a fonctionné pendant trois jours. On part donc de ce
    qu'on savait marcher, et on s'adapte à partir de là. */
export const FOND_AU_DEPART = 1;

/** De combien le fond peut remonter par tour de veille. À 60 ms le tour, ça
    fait environ deux unités et demie par seconde : assez pour suivre une rue
    qui s'anime, beaucoup trop lent pour qu'une phrase le fasse monter. */
export const REMONTEE_DU_FOND = 0.15;

/** Le fond ne monte jamais au-delà : au-dessus, c'est qu'on mesure autre
    chose qu'un fond, et s'y caler rendrait sourd. */
export const FOND_LE_PLUS_HAUT = 9;

/* Les bornes du seuil de départ.

   LE BAS EST HUIT, ET C'EST UN CHIFFRE QUI A UNE HISTOIRE : c'est l'ancien
   seuil fixe, celui qui a fonctionné pendant trois jours avant que je le
   remplace. Je l'avais mis à sept en réglant à l'oreille ; l'épreuve m'a
   montré ce que ça coûtait — une rue constante à huit passait au-dessus de
   sept, était prise pour une voix, et le micro ne se fermait plus jamais.
   On ne descend pas sous ce qui marchait.

   LE HAUT A ÉTÉ DESCENDU DE 34 À 26 : trente-quatre est au-dessus d'une voix
   ordinaire tenue à bout de bras, donc un plafond à trente-quatre est un
   plafond qui rend sourd. */
export const SEUIL_LE_PLUS_BAS = 8;
export const SEUIL_LE_PLUS_HAUT = 26;

/* ── PROPORTIONNEL, ET PAS « FOND PLUS SIX » ───────────────────────────────

   J'avais écrit « fond × 2,2 + 6 ». Le « + 6 » est ce qui manquait une voix
   faible : il ajoute six unités même dans une pièce parfaitement silencieuse,
   et une voix de quatorze passait sous un seuil de quinze.

   Le bruit ne s'ajoute pas, il se MULTIPLIE : une voix doit être deux fois
   plus forte que la pièce pour être une voix. En dessous, elle est noyée
   dedans — et c'est vrai physiquement, pas seulement commode. */

/** Pour COMMENCER à entendre une voix : deux fois le fond, jamais moins que
    l'ancien seuil fixe de huit. */
export function seuilDeParole(fond: number): number {
  const f = Number.isFinite(fond) && fond > 0 ? fond : 0;
  return Math.min(SEUIL_LE_PLUS_HAUT, Math.max(SEUIL_LE_PLUS_BAS, Math.round(f * 2)));
}

/** Pour CONTINUER à l'entendre. Plus bas : une fois la voix reconnue, on la
    suit dans les creux d'une phrase au lieu de la perdre à chaque respiration. */
export function seuilPourContinuer(fond: number): number {
  const f = Number.isFinite(fond) && fond > 0 ? fond : 0;
  return Math.min(SEUIL_LE_PLUS_HAUT, Math.max(5, Math.round(f * 1.3)));
}

/** Au bout de combien de temps une « voix » qui ne retombe jamais doit être
    reconnue pour ce qu'elle est : du bruit. Douze secondes — une phrase
    humaine a des creux bien avant. */
export const AVANT_DE_DOUTER_DE_LA_VOIX = 12000;

/* ── LE SUIVEUR DE BRUIT ───────────────────────────────────────────────────

   Un objet minuscule, et c'est lui qui décide si quelqu'un parle. Il est ici
   et pas dans la page pour une seule raison : on peut lui faire écouter des
   suites de nombres et vérifier ce qu'il en conclut. Le même code dans une
   boucle d'interface ne se vérifie qu'en parlant devant un téléphone. */
export type Suiveur = {
  /** À appeler à chaque tour de veille avec l'amplitude entendue (0 à 127). */
  voir(creux: number): boolean;
  /** Le fond tel qu'il le voit en ce moment. Pour l'affichage et l'épreuve. */
  fond(): number;
  /** Le seuil de départ en ce moment — le guetteur d'écho s'en sert aussi. */
  seuil(): number;
};

export function suivreLeBruit(): Suiveur {
  let fond = FOND_AU_DEPART;
  let parle = false;
  /* Depuis combien de tours la voix ne retombe pas, et quel est le plus
     faible niveau vu pendant ce temps : de quoi reconnaître une rue qu'on a
     prise pour une voix. */
  let toursDeVoix = 0;
  let creuxDeLaVoix = Infinity;

  return {
    voir(creux: number): boolean {
      const c = Number.isFinite(creux) && creux > 0 ? creux : 0;

      /* ── LE FOND DESCEND TOUT DE SUITE, ET NE MONTE PAS PENDANT QU'ON PARLE

         Un silence dit la vérité sur la pièce : on le prend immédiatement.
         Une voix ne dit rien du fond — au contraire, la laisser le faire
         monter était exactement mon défaut de départ. Le fond ne remonte donc
         QUE quand personne ne parle, et lentement.

         L'épreuve me l'a appris deux fois : sans ce gel, une phrase de trois
         secondes faisait monter le fond de sept unités, et la première
         hésitation au milieu perdait la voix. */
      if (c < fond) fond = c;
      else if (!parle) fond = Math.min(FOND_LE_PLUS_HAUT, fond + REMONTEE_DU_FOND);

      const barre = parle ? seuilPourContinuer(fond) : seuilDeParole(fond);
      parle = c > barre;

      /* ── ET SI « LA VOIX » NE RETOMBE JAMAIS, C'EST QUE C'EST LA RUE ──────

         C'est le prix du gel, et il faut le payer honnêtement : dans une pièce
         dont le bruit constant dépasse huit, le premier tour prend la rue pour
         une voix, et le gel l'y enferme. Une vraie phrase a des creux — pas
         une seule dans douze secondes. Passé ce délai, on adopte le plus
         faible niveau entendu comme étant le fond : c'était bien la rue. */
      if (parle) {
        toursDeVoix++;
        if (c < creuxDeLaVoix) creuxDeLaVoix = c;
        if (toursDeVoix * TOUR_DE_VEILLE > AVANT_DE_DOUTER_DE_LA_VOIX) {
          fond = Math.min(FOND_LE_PLUS_HAUT, creuxDeLaVoix);
          toursDeVoix = 0;
          creuxDeLaVoix = Infinity;
          parle = c > seuilDeParole(fond);
        }
      } else {
        toursDeVoix = 0;
        creuxDeLaVoix = Infinity;
      }

      return parle;
    },
    fond: () => Math.round(fond * 10) / 10,
    seuil: () => seuilDeParole(fond),
  };
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

/** ── LE TEMPS QU'ON LAISSE AU DERNIER MORCEAU DE SE POSER ─────────────────
 *
 * Le guetteur qui écoute pendant qu'elle parle envoie l'audio par tranches.
 * Quand on la coupe, ses mots à LUI sont dans la tranche en cours, pas encore
 * partie. On la réclame, puis on laisse ce délai au navigateur pour la rendre
 * et au réseau pour l'emporter.
 *
 * Ce délai ne retarde RIEN de ce qu'il ressent : elle est déjà silencieuse
 * depuis un quart de seconde quand ce compteur démarre. Il ne retarde que le
 * fait de ne pas avoir à redire sa phrase — l'inverse d'une attente. */
export const FLUX_DU_GUETTEUR = 250;

/* ═══ LE POINT ORANGE ════════════════════════════════════════════════════

   Lamine, le 12 septembre 2026 : « il faut tout faire pour cacher ce point
   orange qui écrit "enregistré", ça ça fait fuir les gens, je te le dis. »

   ── CE QU'IL FAUT DIRE D'ABORD : ON NE PEUT PAS LE CACHER ─────────────────

   Ce point-là n'appartient pas à BIA. C'est iOS qui le dessine, au-dessus de
   toutes les applications, et c'est exprès : c'est la promesse qu'Apple fait
   à celui qui tient le téléphone — « tant que ce point est allumé, quelqu'un
   t'écoute ». Aucune ligne de code web ne l'éteint, et une application qui
   saurait l'éteindre serait précisément le mouchard qu'il craint.

   ── DONC ON NE LE CACHE PAS : ON LE REND VRAI ─────────────────────────────

   Le point s'allume parce que BIA tenait le micro OUVERT du début à la fin de
   la conversation — pendant qu'elle réfléchit, pendant qu'elle parle, pendant
   qu'on lit sa réponse. C'était un choix de vitesse : `getUserMedia` coûte
   un à trois dixièmes de seconde, et le refaire à chaque phrase, c'était
   payer ça dix fois.

   Mais le résultat, sur un téléphone prêté, c'est un point orange allumé en
   permanence alors que personne ne parle. Il a raison : ça ne se défend pas.

   On lâche donc le micro dès que la personne a fini sa phrase, et on le
   reprend quand c'est à elle de parler. Le point s'allume pendant qu'on
   l'écoute, et il S'ÉTEINT le reste du temps. Ce n'est plus une lampe
   suspecte, c'est un témoin exact.

   ── CE QUE ÇA COÛTE, DIT FRANCHEMENT ─────────────────────────────────────

   Deux choses, et c'est tout :

     1. Un à trois dixièmes de seconde en plus à chaque tour, le temps de
        reprendre le micro. À côté de l'aller-retour jusqu'au serveur, ça ne
        se remarque pas.

     2. LUI COUPER LA PAROLE À LA VOIX N'EST PLUS POSSIBLE. Pour l'entendre
        pendant qu'elle parle, il faudrait le micro ouvert pendant qu'elle
        parle — c'est-à-dire le point orange allumé pendant qu'elle parle,
        exactement ce qu'il ne veut plus. On ne peut pas avoir les deux.
        L'interruption reste entière au doigt : un appui sur le micro la fait
        taire immédiatement.

   Si un jour il préfère l'inverse, ça se retourne ICI, sur cette ligne, et
   nulle part ailleurs.

   ═══ ET IL A PRÉFÉRÉ L'INVERSE, LE 18 SEPTEMBRE AU SOIR ══════════════════

   Lamine : « quand je parle, parfois elle me coupe sans que je termine. Je
   parle, elle parle en même temps que moi, et quand elle parle son micro est
   fermé. Donc ça devait être le contraire. »

   ── CE QUE JE DOIS DIRE AVANT TOUT : DEUX DE SES RÈGLES S'ANNULAIENT ─────

   Le 9, le 12 et le 15 septembre, il a demandé trois fois la même chose :
   « même quand elle parle, si je parle, le micro doit saisir ce que j'ai dit,
   elle doit se taire. » Je l'ai construit — le guetteur, `couvreSaVoix`, les
   250 ms à tenir, le rattrapage de ses mots, `recoller()`.

   Et le 12 au soir, il a demandé autre chose : cacher le point orange. Je
   l'ai fait aussi, en lâchant le micro à la fin de chaque parole.

   LE SECOND A TUÉ LE PREMIER. Sans flux de micro pendant qu'elle parle, le
   guetteur n'a plus rien à écouter : `flux?.active` est faux, l'analyseur est
   mort, `couvreSaVoix` lit zéro et ne déclenche jamais. L'interruption à la
   voix est morte le 12 septembre au soir, et j'ai continué d'en parler comme
   d'une chose qui marchait.

   CE N'EST PAS LUI QUI S'EST CONTREDIT, C'EST MOI QUI N'AI RIEN DIT. Les
   deux demandes étaient bonnes ; elles étaient incompatibles, et c'était mon
   travail de le lui dire au moment où j'ai posé la seconde, pas six jours
   plus tard quand il le sent au téléphone.

   Le 17 septembre, ChatGPT avait remis cette ligne à `false`. Je l'ai refusé
   en invoquant sa règle du point orange — au lieu de lui poser la question.
   Sur ce point précis, ChatGPT avait raison et j'avais tort.

   ── ET LE PRIX A BAISSÉ ENTRE-TEMPS ─────────────────────────────────────

   Le point orange du 12 septembre était celui du NAVIGATEUR. Depuis le 16,
   BIA est une vraie application iPhone, et lui-même l'a dit : « le grand
   point jaune a disparu. Ça fait un tout petit point jaune, presque
   invisible, très discret. » Ce qu'on rallume aujourd'hui n'est plus ce
   qu'on avait éteint.

   ── ET ÇA RÉPARE AUSSI LE PREMIER SYMPTÔME, SANS TOUCHER À SES NOMBRES ──

   « Elle me coupe sans que je termine » : le micro se ferme après 0,9 à 1,5 s
   de silence — ses chiffres du 15 septembre, choisis pour gagner du temps.
   Une respiration au milieu d'une phrase wolof suffit donc à fermer.

   Mais AVEC LE MICRO OUVERT, se faire couper n'est plus une perte : il
   continue de parler, sa voix couvre la sienne, elle se tait, et ses mots
   sont rattrapés et recollés devant la suite. Le défaut devient réparable de
   lui-même, au lieu de l'obliger à répéter.

   On ne touche donc PAS à ses 900 / 1200 / 1500 ms. Un seul changement, et on
   mesure — s'il se fait encore couper après ça, on remontera les nombres en
   connaissance de cause. */

/** Lâcher le micro entre deux tours, pour que le point orange du téléphone
    ne soit allumé que pendant qu'on écoute vraiment. Son choix du
    12 septembre, REVENU LE 18 : `false` garde le micro ouvert en continu — et
    l'interruption à la voix avec, qui était morte tant que ceci valait
    `true`. Voir le bloc ci-dessus. */
export const MICRO_LACHE_ENTRE_LES_TOURS = false;

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

/* ═══ 5. UNE VOIX, OU UN BRUIT ? ═══════════════════════════════════════════

   Lamine, le 13 septembre 2026 : « il faut qu'elle puisse distinguer les
   bruits des ambiances. Parce que je vois que même sur les bruits elle
   analyse, elle réfléchit. Ça crée des retards. »

   IL A RAISON, ET LE DÉFAUT EST DANS CE FICHIER. Tout ce qui précède ne
   regarde qu'une chose : LE VOLUME. Une voiture qui passe, un ventilateur,
   une chaise qu'on traîne — tout ça est aussi fort qu'une voix. Ça franchit
   le seuil, ça ferme un tour, ça part chez le moteur de transcription, c'est
   PAYÉ, et BIA se met à réfléchir à un bruit de rue.

   Le filtre existant (`vautLaPeine`) ne coupe que ce qui est COURT : une
   porte qui claque. Un bruit qui dure passe entier.

   ── CE QUI SÉPARE VRAIMENT UNE VOIX D'UN BRUIT ────────────────────────────

   Pas la force : la RÉPARTITION DES FRÉQUENCES. Une voix humaine met presque
   toute son énergie entre 200 et 3 500 hertz — c'est la bande du téléphone,
   et ce n'est pas un hasard : au-delà, on ne perd presque rien de la parole.

   Un moteur, un climatiseur, du vent, une porte, des pas : leur énergie est
   en bas, sous 200 Hz — c'est le grondement qu'on sent plus qu'on n'entend.
   Un froissement, un sifflement, de la friture : leur énergie est en haut.

   On ne peut pas le voir sur le volume. On le voit tout de suite sur le
   spectre, que l'analyseur du navigateur donne déjà — il servait jusqu'ici
   uniquement à mesurer la force.

   ── CE QUE ÇA NE SAIT PAS FAIRE, ET IL FAUT LE DIRE ───────────────────────

   Une radio, une télévision, quelqu'un qui parle à côté : c'est de la voix,
   et aucun calcul de fréquences ne dira que ce n'est pas la sienne. Ça
   demanderait de reconnaître SA voix à lui, ce qui est un autre métier.

   Ce filtre-ci s'attaque à ce qu'il décrit : les bruits et les ambiances.
   Pas aux voix d'autrui. */

/** La part de l'énergie qui est dans la bande de la voix humaine. */
export const BANDE_BASSE = 200;
export const BANDE_HAUTE = 3500;

/* ── LE SEUIL, ET POURQUOI IL EST BAS ──────────────────────────────────────

   Mesuré sur des spectres reconstruits : une voix ordinaire met 60 à 80 % de
   son énergie dans la bande ; un grondement de moteur, 10 à 25 % ; un
   sifflement, moins de 20 %.

   On pose TRENTE POUR CENT, franchement sous la voix la plus terne. Le prix
   d'une erreur est asymétrique, comme partout ici : jeter un bruit fait
   gagner une transcription ; jeter une VOIX oblige à tout répéter, et c'est
   impardonnable. On ne jette donc que ce qui est massivement hors bande.

   ── ET JE DOIS DIRE CE QUE JE N'AI PAS PU VÉRIFIER ────────────────────────

   Ces nombres sont mesurés sur des spectres RECONSTRUITS, pas sur du wolof
   enregistré au micro d'un téléphone à Dakar. Le faux son de mes épreuves
   met 86 % de son énergie au-dessus de 3 500 Hz : il ne ressemble à aucune
   voix, et il ne prouve donc rien ici.

   Ce qui pourrait me démentir : la réduction de bruit et le volume
   automatique du téléphone déforment le spectre, et je ne sais pas dans quel
   sens. C'est pour ça que le seuil est descendu de 0,4 à 0,3 — et que
   l'interrupteur ci-dessous existe.

   LE SYMPTÔME À GUETTER : si BIA devient sourde, qu'elle n'entend plus alors
   qu'on lui parle normalement, c'est CE filtre. La console dit alors « bruit
   écarté sans le transcrire » avec le pourcentage mesuré — et il suffit de
   mettre ÉCARTER_LES_BRUITS à false pour revenir exactement à hier. */
export const PART_VOCALE_MINIMALE = 0.3;

/** Écarter les bruits sans les transcrire. Si BIA devient sourde, c'est ça :
    `false` rend l'oreille d'avant le 13 septembre, à la ligne près. */
/* ── 6. LA PASTILLE ORANGE QUI NE S'ÉTEINT PAS ──────────────────────────────

   Lamine, le 14 septembre 2026 : « même si tu coupes le micro, le bouton
   jaune à l'angle continue à s'allumer. » C'est l'indicateur d'iOS : il dit
   qu'une application écoute. Le voir rester allumé alors qu'on vient de
   couper, c'est ce qui fait fuir les gens — et il avait raison de le dire
   dès le premier jour.

   ON ARRÊTE POURTANT BIEN LE FLUX. `track.stop()` est appelé, et c'est
   normalement tout ce qu'il faut. Mais l'analyseur qui écoute le niveau de
   voix vivait sur le MÊME contexte audio que la parole de BIA — un contexte
   qu'on ne ferme jamais, puisqu'il sert à la faire parler. Sur iPhone, un
   contexte qui a reçu une source micro reste marqué comme tel tant qu'il
   n'est pas fermé, et la pastille avec.

   L'analyseur a donc maintenant SON PROPRE contexte, qu'on ferme en même
   temps qu'on coupe le micro. Rien d'autre ne s'en sert : il ne fait
   qu'écouter le niveau, la parole vit ailleurs.

   Je n'ai pas d'iPhone pour le vérifier — c'est une réparation raisonnée, pas
   mesurée, et Lamine le saura en regardant son coin d'écran. Si ça ne suffit
   pas, mettre cette ligne à false rend le comportement d'avant à l'identique. */
/* ── REMIS À FALSE LE 14 SEPTEMBRE 2026, UNE HEURE APRÈS ────────────────────

   Lamine, à trois heures de sa démonstration : « le problème du micro est
   revenu depuis que tu as enlevé ce truc-là. C'était bien déjà. Si c'est
   compliqué, on le laisse tel que c'était — parce que si le micro ne
   fonctionne pas correctement, ça ne sert à rien. »

   Il a raison sur les deux points. D'abord l'ordre des choses : une pastille
   qui reste allumée est laide, un micro qui ne répond plus rend BIA inutile.
   Ensuite le fond — je vois le défaut maintenant que je le cherche avec ses
   yeux. Fermer le contexte de l'analyseur tue les nœuds qui en dépendent, et
   la veille qui lisait encore le niveau de voix meurt avec, sans un mot. Le
   micro paraît alors vivant et n'entend plus rien.

   Ça se répare — il faudrait arrêter la veille AVANT de fermer le contexte,
   et la remonter proprement au tour suivant. Mais pas aujourd'hui, et pas à
   trois heures d'une démonstration, pour un point orange dans un coin.

   La pastille reste donc allumée, et c'est écrit ici pour qu'on y revienne
   à tête reposée. */
export const MICRO_SUR_SON_PROPRE_CONTEXTE = false;

export const ECARTER_LES_BRUITS = true;

/**
 * Quelle part de l'énergie entendue est dans la bande de la voix ?
 *
 * @param spectre  ce que rend `getByteFrequencyData` (0 à 255 par bande)
 * @param echantillonnage la fréquence d'échantillonnage du micro (Hz)
 * @returns entre 0 et 1 ; 0 si on n'entend rien du tout
 */
export function partVocale(spectre: ArrayLike<number>, echantillonnage = 48000): number {
  const bandes = spectre.length;
  if (!bandes) return 0;
  /* Chaque case du spectre couvre (échantillonnage / 2) / bandes hertz. */
  const parCase = echantillonnage / 2 / bandes;
  let dedans = 0, total = 0;
  for (let i = 0; i < bandes; i++) {
    const v = spectre[i] || 0;
    total += v;
    const hz = (i + 0.5) * parCase;
    if (hz >= BANDE_BASSE && hz <= BANDE_HAUTE) dedans += v;
  }
  return total > 0 ? dedans / total : 0;
}

/**
 * Ce qui vient d'être entendu mérite-t-il d'être envoyé à la transcription ?
 *
 * Deux conditions, et les deux comptent :
 *   — c'est assez LONG pour être une parole (l'ancien filtre, inchangé) ;
 *   — et c'est assez DANS LA BANDE de la voix pour ne pas être un moteur.
 *
 * @param dureeDeParole   durée cumulée entendue, en millisecondes
 * @param partVocaleMoyenne moyenne de partVocale() pendant qu'on entendait
 *                          quelque chose. Passer `null` quand on n'a pas pu
 *                          mesurer : dans le doute on ENVOIE, parce que
 *                          perdre une vraie question coûte plus cher qu'une
 *                          transcription de trop.
 */
export function vraimentUneVoix(dureeDeParole: number, partVocaleMoyenne: number | null): boolean {
  if (!vautLaPeine(dureeDeParole)) return false;
  if (!ECARTER_LES_BRUITS) return true;
  if (partVocaleMoyenne === null || !Number.isFinite(partVocaleMoyenne)) return true;
  return partVocaleMoyenne >= PART_VOCALE_MINIMALE;
}

/* ═══ 7. UN FLUX QUI A L'AIR VIVANT ET QUI NE L'EST PLUS ═══════════════════

   Lamine, le 18 septembre 2026, sur l'application native :

     « Quand on discute, pendant un certain temps, j'ai l'impression que le
       micro se désactive. Au bout de quelques minutes. Ou quand j'ouvre par
       exemple appareil photo, ou message, si je reviens, le micro se
       désactive. »

   ── CE QUE FAIT LE TÉLÉPHONE QUAND ON LE QUITTE ───────────────────────────

   iOS ne laisse pas une application capter le micro en arrière-plan. Quand
   on passe à l'appareil photo, à Messages, ou qu'un appel arrive, il reprend
   le micro. Et il a DEUX façons de le faire :

     — la piste se TERMINE (`readyState` passe à « ended ») ;
     — ou la piste est COUPÉE (`muted` passe à vrai) et reste là.

   LE PREMIER CAS SE VOYAIT DÉJÀ : `flux.active` devient faux, et la prochaine
   demande de micro en reprend un neuf.

   LE SECOND EST LE PIÈGE, et c'est celui-là qui a coûté ses minutes à Lamine.
   Une piste coupée reste ACTIVE. `flux.active` dit vrai, l'analyseur est
   branché, tout a l'air normal — et il ne rend que du silence. BIA attend
   alors une voix qui ne viendra jamais. Rien ne casse, rien ne se plaint :
   elle devient sourde, poliment.

   ── ET C'EST LA MÊME FAMILLE DE DÉFAUT QUE LES TROIS AUTRES ───────────────

   Un contexte audio suspendu qui joue sans son. Un mode qu'on ne peut plus
   quitter. Un compteur qui repart à zéro sans le dire. Et maintenant une
   piste morte qui se déclare vivante. À chaque fois : l'état affiché n'est
   pas l'état réel, et personne ne regarde.

   ON NE FAIT PLUS CONFIANCE À `active` TOUT SEUL. On demande aux pistes. */

/**
 * Ce flux capte-t-il encore vraiment ?
 *
 * `active` ne suffit pas : une piste coupée par le téléphone laisse le flux
 * actif et ne rend que du silence. On exige au moins une piste de son qui
 * soit VIVANTE et NON COUPÉE.
 */
export function fluxVivant(flux: MediaStream | null | undefined): boolean {
  if (!flux || !flux.active) return false;
  const pistes = flux.getAudioTracks();
  if (!pistes.length) return false;
  return pistes.some((p) => p.readyState === "live" && !p.muted);
}
