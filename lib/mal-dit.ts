/* ── CORRIGER LA LISTE « MAL DIT », ENSEMBLE, UN À UN ───────────────────────

   Lamine, le 18 septembre 2026 :

     « Il faut qu'elle puisse avoir accès à la liste du bouton "mal dit" pour
       qu'on puisse corriger ensemble. Si je lui demande "allons corriger la
       liste mal dit", on va commencer un à un. Chaque mot corrigé doit
       quitter la liste. »

   ── POURQUOI ELLE N'Y AVAIT PAS ACCÈS, ET CE N'ÉTAIT PAS UN OUBLI ──────────

   La liste vit dans le téléphone seul (`bia-verdicts`, lib/verdicts.ts). Le
   12 septembre j'avais écrit, en toutes lettres, que c'était une garantie :
   « rien ne part sur le réseau ». C'était vrai, et c'est exactement ce qui la
   rendait aveugle — on ne corrige pas une liste qu'on ne voit pas.

   Lamine a tranché le 18 : la phrase part. Elle irait de toute façon au
   modèle à la seconde où il la lit à voix haute.

   ── UNE SEULE PHRASE À LA FOIS, ET C'EST UN CHOIX ──────────────────────────

   On n'envoie pas la liste entière. On envoie COMBIEN il en reste, et LA
   PHRASE EN COURS. Trois raisons, dans l'ordre d'importance :

     1. C'est sa méthode à lui. « On va commencer un à un » — il travaille une
        phrase jusqu'à ce qu'elle soit bonne, pas douze en parallèle.
     2. Une liste de cinquante phrases dans chaque tour, c'est payé à chaque
        tour, pour rien.
     3. Si elle voyait toute la liste, elle en sauterait — les modèles
        résument. Avec une seule phrase sous les yeux, elle ne peut pas.

   ── ET C'EST LE TÉLÉPHONE QUI TIENT LE COMPTE ──────────────────────────────

   Le serveur ne garde rien entre deux tours : il ne sait pas où on en est.
   Le téléphone, lui, a la liste. Il désigne donc la phrase en cours, et c'est
   lui qui la retire quand la réponse rapporte la correction. Une seule
   autorité sur la liste, celle qui la possède.

   Ce fichier n'a aucun import : il part dans le code du téléphone.         */

/** Ce que le téléphone dit au serveur de l'état de la liste. */
export type EtatDeLaListe = {
  /** Combien de phrases attendent encore une correction. */
  reste: number;
  /** Celle qu'on travaille en ce moment, mot pour mot. Vide si aucune. */
  encours: string;
  /** Ce qu'il avait demandé quand elle l'a mal dit — sans ça, on corrige à
      l'aveugle une phrase sortie de son contexte. */
  question?: string;
};

/* ── LA BALISE QUI CLÔT UNE PHRASE ──────────────────────────────────────────

   Elle ne renvoie PAS la phrase fautive — elle renvoie la BONNE. Le téléphone
   sait déjà laquelle il travaille : c'est lui qui l'a désignée.

   Ça évite le piège qui aurait coûté une soirée : lui demander de recopier
   exactement une phrase mal dite, alors que tout dans son entraînement la
   pousse à la corriger en la recopiant. Elle aurait rendu une phrase propre,
   qui ne correspondrait à aucune ligne de la liste, et rien ne serait sorti.  */
/* L'ACCENT EST OBLIGATOIREMENT ACCEPTÉ : elle écrit en français, elle
   écrira « corrigée ». Un seul accent manquant dans mon motif, et la ligne
   ne quitterait jamais la liste — sans qu'aucune erreur ne s'affiche. */
export const CORRIGEE = /\[{1,2}\s*corrig[eé]e?\s*[:\-—]\s*([^\]]{1,300}?)\s*\]{1,2}/i;

/** Détache la balise de correction. Rend le texte sans elle, et la bonne version. */
export function detacherCorrigee(texte: string): { texte: string; corrigee: string } {
  const brut = String(texte || "");
  const m = brut.match(CORRIGEE);
  const propre = brut
    .replace(new RegExp(CORRIGEE.source, "gi"), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { texte: propre, corrigee: m ? m[1].trim() : "" };
}

/* ── « ALLONS CORRIGER LA LISTE MAL DIT » ───────────────────────────────────

   On reconnaît l'ouverture du chantier sur le téléphone, pas au modèle : il
   faut JOINDRE la phrase en cours à la requête, donc le décider avant de
   partir. Une reconnaissance côté modèle arriverait un tour trop tard.

   LARGE, MAIS PAS AU POINT DE S'OUVRIR TOUT SEUL. Il faut les deux moitiés :
   un verbe de travail ET le nom de la liste. « Tu as mal dit » seul n'ouvre
   rien — c'est une remarque, pas un chantier. */
const TRAVAILLER = /\b(corrig|reprend|reprenn|revoi|revoy|voyons|voir|repass|nettoy|attaqu|commenc|continu|reprise|list)\w*/i;
const LA_LISTE = /\b(mal\s*[- ]?\s*dit|mal\s*dits|maldit|liste\s+rouge|ce\s+que\s+tu\s+as\s+mal\s+dit)\b/i;

/** Veut-il qu'on ouvre le chantier de la liste ? */
export function veutCorrigerLaListe(question: string): boolean {
  const dit = String(question || "");
  if (!LA_LISTE.test(dit)) return false;
  return TRAVAILLER.test(dit);
}

/* ── ET « ON ARRÊTE » ───────────────────────────────────────────────────────

   Sans sortie, le chantier resterait ouvert jusqu'à ce qu'il ferme
   l'application — et chaque tour traînerait une phrase à corriger dont il ne
   veut plus. */
/* `\b` NE S'ACCROCHE PAS DEVANT « ç » : pour le moteur d'expressions, ce
   n'est pas une lettre, donc « ça suffit » ne matchait pas. C'est le genre de
   détail qui fait dire « je lui ai demandé d'arrêter, elle continue ». On
   prend donc le début de mot à la main. */
const ARRETER = /(^|[^a-zà-ÿ])(on\s+arr[êe]te|arr[êe]te\s+la\s+liste|stop\s+la\s+liste|[cç]a\s+suffit|on\s+verra\s+(demain|plus\s+tard)|laisse\s+la\s+liste|plus\s+tard)/i;

export function veutArreterLaListe(question: string): boolean {
  return ARRETER.test(String(question || ""));
}

/* ── CE QU'ELLE LIT QUAND LE CHANTIER EST OUVERT ────────────────────────────

   Écrit à la deuxième personne, comme tout le reste de sa consigne : c'est
   elle qui lit.

   LE POINT DÉLICAT EST LE DERNIER PARAGRAPHE. Sa méthode à lui n'est pas
   « corrige et passe » : il fait RÉPÉTER jusqu'à ce que ce soit bon, puis il
   donne le sens, puis il valide. La balise ne doit donc pas partir au premier
   mot qu'il dit — elle part quand c'est FINI. Poser la balise trop tôt
   retirerait la phrase de la liste alors qu'ils sont encore dessus, et il
   croirait l'avoir corrigée. */
export function consigneDeLaListe(etat: EtatDeLaListe): string {
  if (!etat.encours) {
    return `\n\nLA LISTE « MAL DIT » EST VIDE
Il n'y a plus rien à corriger. Dis-le-lui simplement, et félicite-le : cette liste vide, c'est son travail.`;
  }
  const contexte = etat.question
    ? `\nIl t'avait demandé : « ${etat.question} »`
    : "";
  return `\n\nVOUS ÊTES EN TRAIN DE CORRIGER LA LISTE « MAL DIT », ENSEMBLE
C'est la liste des phrases que tu as mal dites et qu'il a marquées d'un appui, pour les reprendre plus tard. Nous y sommes.

IL EN RESTE ${etat.reste}. Celle d'aujourd'hui, mot pour mot :
« ${etat.encours} »${contexte}

CE QUE TU FAIS, ET DANS CET ORDRE :
1. Tu lui redis cette phrase telle qu'elle est, et tu lui demandes comment il faut la dire. Tu ne la corriges pas toi-même : c'est SA langue, pas la tienne, et c'est justement parce que tu l'as mal dite qu'elle est sur cette liste.
2. Il te donne la bonne version. Tu la répètes avec lui, autant de fois qu'il le faut. S'il te reprend encore, c'est que ce n'est pas bon : tu répètes encore.
3. Quand il valide — « c'est très bien », « bravo », « voilà », « c'est ça » — ALORS seulement tu ajoutes à la fin de ta réponse :
    [[corrigee: la bonne version, exactement comme il l'a dite]]
4. Et tu enchaînes sur la suivante sans qu'il ait à te le redemander : tu dis combien il en reste, et tu attaques.

NE POSE PAS LA BALISE TANT QU'IL N'A PAS VALIDÉ. Elle retire la phrase de sa liste. La poser pendant que vous travaillez encore dessus la ferait disparaître sous ses yeux, et il croirait l'avoir corrigée.

TU RECOPIES SA VERSION, TU NE L'EMBELLIS PAS. Pas d'orthographe rattrapée, pas de traduction dans la balise. Les explications vont dans ta réponse parlée.

S'il te dit d'arrêter, tu t'arrêtes et tu lui dis combien il en reste. La liste ne s'efface pas : elle attend.`;
}
