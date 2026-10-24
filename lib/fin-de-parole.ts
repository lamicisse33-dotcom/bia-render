/* ── QUAND EST-CE QU'IL A FINI DE PARLER — UNE SEULE SOURCE POUR LES DEUX ──

   Lamine, le 24 octobre 2026 : « Règle absolue : elle ne doit JAMAIS répondre
   tant que je parle ou que je fais une pause pour réfléchir. Je dois pouvoir,
   moi, l'interrompre pendant qu'elle parle : ça, ça reste. »

   ── CE QUI ÉTAIT RÉGLÉ, ET POURQUOI ELLE LE COUPAIT ───────────────────────

   Khalam Rapide : silenceDurationMs 500.
   Khalam        : SILENCE_QUI_FERME 400, fixe.

   Les deux sont SOUS la seconde. Une pause pour chercher un mot fait donc
   partir la réponse, des deux côtés, et ce n'était pas un défaut caché :
   c'étaient les réglages, écrits noir sur blanc.

   ── C'EST UN RETOUR EN ARRIÈRE SUR SA PROPRE DÉCISION, ET IL FAUT LE DIRE ─

   Le 20 octobre, il avait choisi lui-même « exactement 400 ms », d'après les
   réglages de Toftal, pour aller plus vite. Le 13 septembre, il avait dit
   l'inverse : « une seconde c'est trop petit », et on était monté à 1,5 s.
   Ce n'est pas de l'indécision, c'est la même personne qui arbitre entre
   deux douleurs selon celle qu'elle ressent ce jour-là :

     fermer trop tôt  →  une demi-phrase wolof part à la transcription, qui
                         ne la transcrit pas mais la DEVINE. Réponse à côté,
                         question à reposer.
     fermer trop tard →  on l'attend.

   Aujourd'hui il tranche pour la première douleur, et il demande à voir le
   prix de la seconde : « mesure aussi la lenteur ». C'est fait, par tour,
   dans /api/etat → journal_parole.

   ── POURQUOI 1 200 ET PAS 1 000 ──────────────────────────────────────────

   Il dit « une pause de ~1 seconde ne doit pas être prise pour une fin de
   phrase ». Un seuil à 1 000 déclencherait SUR une pause d'une seconde : il
   serait juste à la limite, donc faux une fois sur deux. 1 200 laisse 200 ms
   de marge et coûte 800 ms de plus qu'aujourd'hui, pas 1 100.

   Et si ça coupe encore, UNE variable Render suffit, sans redéploiement de
   code : BIA_SILENCE_FIN_PAROLE_MS=1500 — la valeur à laquelle son propre
   raisonnement de septembre était arrivé.

   ── CE QUI NE CHANGE PAS : IL PEUT TOUJOURS LA COUPER ────────────────────

   Ce fichier ne règle que la fin de SA parole. L'interruption de BIA pendant
   qu'elle parle reste entière : `activityHandling` demeure
   START_OF_ACTIVITY_INTERRUPTS sur Khalam Rapide, et le guet de parole de
   Khalam est intact. Le filtre d'écho continue d'exiger qu'une vraie voix
   dépasse nettement le haut-parleur — c'est ce qui l'empêche, elle, de se
   couper toute seule, et ça laisse passer quelqu'un qui parle par-dessus.

   AUCUN IMPORT ICI, exprès : lib/micro.ts est chargé par une épreuve comme
   module `data:`, où un import relatif ne se résout pas. Il garde donc une
   valeur littérale de repli, et une épreuve vérifie que les deux ne
   divergent jamais. */

/** Le silence qui déclare la fin d'une phrase, en millisecondes.
    MÊME VALEUR pour les deux moteurs — c'est tout l'objet de ce fichier. */
export const SILENCE_FIN_PAROLE_MS_DEFAUT = 1200;

/* Bornes : en dessous de 600 ms on retombe dans le défaut qu'on corrige ;
   au-delà de 4 s, une conversation n'est plus une conversation. */
const PLANCHER = 600, PLAFOND = 4000;

export function silenceFinDeParoleMs(): number {
  const n = Number(process.env.BIA_SILENCE_FIN_PAROLE_MS);
  return Number.isFinite(n) && n >= PLANCHER && n <= PLAFOND
    ? Math.round(n)
    : SILENCE_FIN_PAROLE_MS_DEFAUT;
}

/* ── LE DÉBUT DE PAROLE, ET POURQUOI ON GARDE PLUS D'AVANT ────────────────

   prefixPaddingMs était à 150 : Google ne gardait qu'un sixième de seconde
   avant le moment où il décide que quelqu'un parle. La première syllabe d'un
   mot wolof — un « nd », un « mb » — commence doucement et tombait dans ce
   trou. 300 ms la rattrapent, et ça ne retarde rien : c'est du son déjà
   capté, pas de l'attente ajoutée. */
export const PREFIXE_PAROLE_MS_DEFAUT = 300;
export function prefixePartMs(): number {
  const n = Number(process.env.BIA_PREFIXE_PAROLE_MS);
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? Math.round(n) : PREFIXE_PAROLE_MS_DEFAUT;
}

/* Sensibilités de la détection d'activité de Khalam Rapide. Elles restent
   celles qui servent la règle :
     début HAUTE — le moindre son rouvre son tour, donc elle se taira ;
     fin   BASSE — Google hésite longtemps avant de déclarer une fin.
   Les deux vont dans le sens « ne jamais répondre pendant qu'il parle ». */
export const SENSIBILITE_DEBUT = "START_SENSITIVITY_HIGH";
export const SENSIBILITE_FIN = "END_SENSITIVITY_LOW";

/** Ce que /api/etat publie, et ce que le téléphone lit pour se régler. */
export function reglagesFinDeParole() {
  return {
    revision: "fin-de-parole-partagee-v1",
    silence_fin_parole_ms: silenceFinDeParoleMs(),
    prefixe_parole_ms: prefixePartMs(),
    sensibilite_debut: SENSIBILITE_DEBUT,
    sensibilite_fin: SENSIBILITE_FIN,
    /* Ce qui était réglé avant, pour que le changement soit lisible sans
       aller fouiller l'historique git. */
    avant: { khalam_rapide_ms: 500, khalam_ms: 400, prefixe_ms: 150 },
    interruption_par_la_personne: "conservée (START_OF_ACTIVITY_INTERRUPTS)",
    variable_pour_revenir: "BIA_SILENCE_FIN_PAROLE_MS",
  };
}
