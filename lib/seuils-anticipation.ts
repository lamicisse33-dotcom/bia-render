/* ── LES DEUX SEUILS QUI DÉCIDENT SI L'ANTICIPATION EXISTE ─────────────────

   Objectif donné par Lamine le 24 octobre 2026 : −2 s sur le premier son de
   Khalam, 4,3 → ~2,3 s, un levier à la fois. Levier 1 : « seuil du micro
   jusqu'à ce que porte_qui_refuse disparaisse et que l'anticipation serve ».

   CE N'EST PAS LE SEUIL DU MICRO, ET C'EST MESURÉ. Le 23 octobre au soir, la
   part des trames reconnues à l'intérieur de l'écart de parole valait 89, 86,
   75 et 66 % ; et les creux manquants ne coûtent rien, parce que le pipeline
   reçoit `parle = aParle && maintenant - dernierSon < 240` — un creux de
   moins de 240 ms compte encore comme de la parole. Baisser le seuil de bruit
   attraperait donc plus de rue SANS produire un segment de plus. On n'y
   touche pas.

   LES DEUX SEUILS QUI REFUSENT VRAIMENT :

     1. PREMIER_SEGMENT_MS — il faut cette durée de PAROLE pour qu'un segment
        part pendant qu'il parle. Mesuré sur neuf tours réels, `parole_ms`
        valait 300, 358, 420, 702, 767, 838, 1151, 1498 et 2686 ms : à 1 500,
        UNE SEULE sur neuf qualifiait — 1 498 passait juste en dessous. À 700,
        six sur neuf. (À 1 000, trois : le palier n'est pas linéaire, et c'est
        pourquoi on mesure au lieu de choisir un chiffre rond.)
     2. SIGNES_ANTICIPATION — le texte doit atteindre cette longueur. Un
        segment de 700 ms rend 15 à 30 signes : à 35, la porte se contentait
        de passer de `jamais_de_texte` à `trop_court`. Les deux doivent
        descendre ensemble, sinon rien ne change.

   CE QUE ÇA COÛTE, ET IL FAUT LE LIRE AVANT DE JUGER LE GAIN :
     — une transcription de plus sur presque chaque tour ;
     — des préparations de briques sur des fragments, donc des replis. C'est
       `briques_conversation.replis` et `chaines` qui le disent. Si les replis
       grimpent sans que `premier_son_median_ms` descende, ce levier coûte
       plus qu'il ne rend et on remet les anciennes valeurs.

   RÉVERSIBLE PAR VARIABLE RENDER, sans déploiement :
     BIA_PREMIER_SEGMENT_MS=1500   et   BIA_SIGNES_ANTICIPATION=35
   ramènent exactement le comportement du 23 octobre. Les deux valeurs sont
   publiées dans /api/etat pour qu'on sache toujours laquelle on mesure.

   MODULE SANS AUCUN IMPORT, exprès — même raison que lib/premier-segment.ts :
   une épreuve qui rend un module factice pour toutes les dépendances y
   faisait arriver `undefined`, le seuil devenait NaN et plus aucun segment ne
   partait, en silence. */

const borne = (v: string | undefined, defaut: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : defaut;
};

/** Durée de PAROLE avant le premier segment. Révertible : BIA_PREMIER_SEGMENT_MS. */
export const premierSegmentMs = () =>
  borne(process.env.BIA_PREMIER_SEGMENT_MS, 700, 500, 4000);

/** Longueur minimale du texte pour préparer. Révertible : BIA_SIGNES_ANTICIPATION. */
export const signesAnticipation = () =>
  borne(process.env.BIA_SIGNES_ANTICIPATION, 20, 10, 200);
