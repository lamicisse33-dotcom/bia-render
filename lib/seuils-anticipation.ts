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
        UNE SEULE sur neuf qualifiait — 1 498 passait juste en dessous.

        Lamine a tranché 1 000 ms le 24 octobre 2026, après avoir lu les deux
        chiffres : à 700 six phrases sur neuf qualifiaient, à 1 000 trois. Il
        prend le palier prudent — moins de fragments préparés pour rien, donc
        moins de replis payés, et l'anticipation ne part que quand il y a
        vraiment quelque chose à anticiper.
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

/* ── LEVIER 2 DU MANDAT : L'OREILLE ÉCOUTE PLUS TÔT ───────────────────────

   Le mandat demande « une transcription provisoire toutes les 100-200 ms au
   lieu de segments d'une seconde ».

   CE QUE JE NE PEUX PAS FAIRE AUJOURD'HUI, ET IL FAUT LE DIRE. Chaque
   segment part en HTTP vers Khalam Oreille. Une transcription toutes les
   150 ms, c'est près de SEPT requêtes par seconde et par personne : ce n'est
   pas un réglage, c'est une autre architecture — un flux WebSocket vers le
   GPU, qui est le levier 6. Le promettre ici serait mentir.

   CE QUE JE FAIS : le premier segment part après 600 ms de parole au lieu de
   1 000. La première interprétation arrive donc presque deux fois plus tôt,
   et la préparation avec elle.

   ET ÇA NE TOUCHE PAS LA FERMETURE DU MICRO : écouter plus tôt n'est pas
   couper plus tôt. Sa règle absolue — « elle ne doit JAMAIS répondre tant
   que je parle ou que je fais une pause » — vit dans lib/fin-de-parole.ts,
   et ce levier n'y touche pas.

   RÉVERSIBLE : BIA_PREMIER_SEGMENT_MS=1000 rend le comportement d'avant. */
export const premierSegmentMs = () =>
  borne(process.env.BIA_PREMIER_SEGMENT_MS, 600, 500, 4000);

/* ── ET ELLE SE CORRIGE PLUS SOUVENT ──────────────────────────────────────

   Les segments SUIVANTS passent de 4 000 (ou 2 500 selon le profil) à
   1 500 ms. La première interprétation se corrige donc deux à trois fois
   plus souvent pendant qu'il parle.

   CE QUE ÇA COÛTE, DIT AVANT : environ deux fois et demie plus d'appels à
   l'oreille par tour. Sur une phrase de six secondes, deux segments avant,
   quatre maintenant. Ça se lit dans anticipation_conversation.ecoute.segments
   et c'est le prix de la réactivité.

   1500, 2500 et 4000 sont les trois seules tailles que la découpe sait
   traiter (voir lib/ecoute-progressive.ts) : toute autre valeur retomberait
   en silence sur le plus gros tampon.

   RÉVERSIBLE : BIA_SEGMENT_MS=4000 rend le comportement d'avant. */
export function segmentMs(): number {
  const brut = String(process.env.BIA_SEGMENT_MS ?? "").trim();
  if (!brut) return 1500;
  const n = Number(brut);
  return n === 1500 || n === 2500 || n === 4000 ? n : 1500;
}

/** Longueur minimale du texte pour préparer. Révertible : BIA_SIGNES_ANTICIPATION. */
export const signesAnticipation = () =>
  borne(process.env.BIA_SIGNES_ANTICIPATION, 20, 10, 200);

/* ── LEVIER 3 : LE PREMIER CLIP PARLÉ, COURT ───────────────────────────────

   Lamine, 24 octobre 2026 : « première brique très courte (4-5 mots) et pod
   Chatterbox maintenu chaud, pour un premier son à ~0,5 s de fabrication ».

   LE POD EST DÉJÀ CHAUD, et c'est mesuré : file_gpu donne `attente_ms: 0` sur
   tous les travaux, la santé HTTP répond 200 en 291 ms, et l'exécution vaut
   993 à 1 415 ms. Ces 1,8 s de fabrication médiane ne sont pas un réveil :
   c'est de la vraie synthèse. Rien à gagner à le chauffer davantage, et je le
   dis plutôt que de livrer un réchauffeur inutile.

   CE QUI RESTE, ET QUI EST LE VRAI LEVIER : la LONGUEUR du premier clip. La
   tête était la première phrase COMPLÈTE ; sur une phrase longue, cela fait
   80 à 90 signes à synthétiser avant le premier son. On autorise donc une
   coupe à la première VIRGULE, et seulement quand la phrase naturelle
   dépasse PHRASE_LONGUE_SIGNES — les phrases courtes gardent leur mélodie
   entière, intacte.

   CE QUE ÇA CHANGE POUR SON OREILLE, et il faut l'écouter : un début plus
   court, donc une couture après « D'accord papa, » au lieu d'une phrase
   d'un seul souffle. Le texte dit est le MÊME, seul l'endroit de la coupe
   change ; la suite se fabrique pendant qu'elle dit le début.

   RÉVERSIBLE : BIA_TETE_COURTE_SIGNES=0 rend la tête d'avant. */
export const teteCourteSignes = () =>
  borne(process.env.BIA_TETE_COURTE_SIGNES, 20, 0, 120);
export const phraseLongueSignes = () =>
  borne(process.env.BIA_PHRASE_LONGUE_SIGNES, 70, 20, 400);

/* ── ATTENDRE CE QUI EST DÉJÀ EN VOL AVANT D'OUVRIR LA LECTURE ────────────

   Mesuré le 25 octobre, `preparations_tuees` sur les tours de Lamine :

     rien_de_pret_a_la_fermeture   × 7   durées [2464, 1, 1, 1, 1, 2, 0]
     annulation_de_la_page         × 1   [0]
     départs                       sans_preparation 7, lectures 0

   SIX TUÉES SUR SEPT L'ONT ÉTÉ À UNE OU DEUX MILLISECONDES. La préparation
   naissait et mourait dans la même milliseconde — et c'est mon chantier 02
   qui l'avait fait naître : la transcription livrée après la fermeture
   déclenche `lancer()`, mais `commencer()` venait de rendre la main une
   fraction de seconde plus tôt, en disant « rien de prêt ». La ligne
   suivante tuait ce que la précédente venait de démarrer.

   L'ORDRE EST LE DÉFAUT, PAS L'ATTENTE. On laisse donc ce qui est DÉJÀ EN
   VOL se poser avant d'ouvrir la lecture : alors `commencer()` voit une
   préparation en cours et ouvre sur `en_fabrication`, au lieu de refuser.

   CE QUE ÇA COÛTE : jusqu'à ce plafond, et seulement quand quelque chose est
   réellement en vol. Le chemin ordinaire qu'on évite mettait 6 031 ms de
   médiane ; une brique prête joue à 19 ms de la fermeture.

   RÉVERSIBLE SANS DÉPLOIEMENT : BIA_ATTENTE_ENVOI_MS=0 rend le comportement
   d'avant, à la milliseconde près. */
export function attenteEnvoiMs(): number {
  /* Une variable VIDE ne veut pas dire zéro : elle veut dire « pas posée ».
     `Number("")` rend 0, qui est dans les bornes — une variable laissée vide
     sur Render aurait donc éteint la fonction en silence. Une épreuve l'a
     attrapé. */
  const brut = String(process.env.BIA_ATTENTE_ENVOI_MS ?? "").trim();
  if (!brut) return 800;
  const n = Number(brut);
  return Number.isFinite(n) && n >= 0 && n <= 3000 ? Math.round(n) : 800;
}
/* ── LE DOUBLE PAIEMENT, LEVIER 1 DU MANDAT DU 25 OCTOBRE ─────────────────

   Mesuré : à la fermeture du micro, la page attend la FIN de la chaîne de
   briques — `terminerBriques()` puis `lectureBriques.fin` — et seulement
   ensuite, si rien n'est sorti, lance le chemin ordinaire. En série. Quand
   le pari de la brique est perdu, on a payé son attente ENTIÈRE avant même
   de commencer à répondre. C'est la queue de tours à 12, 18 et 42 secondes.

   LA PATIENCE EST BORNÉE. Si aucune brique n'a COMMENCÉ À PARLER au bout de
   ce délai, on coupe la chaîne et on part sur le chemin ordinaire. Une
   brique déjà en train de parler n'est JAMAIS coupée — ce serait couper BIA
   au milieu d'un mot.

   Pourquoi 1 200 ms : c'est l'ordre de grandeur d'une préparation qui
   aboutit (mesurées à 836 et 2 464 ms). Au-delà, on sait qu'on a perdu le
   pari, et chaque milliseconde de plus est une milliseconde volée.

   ET CE N'EST PAS LE RÉGLAGE QUI A RENDU BIA MUETTE le 25 octobre à 17 h :
   c'étaient deux fautes dans la page, du côté du renoncement. Voir
   app/page.tsx, « LEVIER 1 » — et tests/parole-affichee-browser.cjs, qui
   refuse maintenant un tour sans sa phrase à l'écran.

   RÉVERSIBLE : BIA_PATIENCE_BRIQUE_MS=10000 reproduit le comportement
   d'avant (on attend la chaîne quoi qu'il arrive) ; 0 renonce tout de suite
   aux briques. */
export function patienceBriqueMs(): number {
  const brut = String(process.env.BIA_PATIENCE_BRIQUE_MS ?? "").trim();
  if (!brut) return 1200;
  const n = Number(brut);
  return Number.isFinite(n) && n >= 0 && n <= 20000 ? Math.round(n) : 1200;
}
