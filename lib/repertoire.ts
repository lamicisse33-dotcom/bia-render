import { lexiqueConfig } from "./lexique";
import { normaliser } from "./normaliser";
import { empreinteDe } from "./empreinte";
import { pourLaVoix } from "./nombres";
import { REPERTOIRE, RELU } from "./repertoire-textes";
import type { Entree } from "./repertoire-textes";
import { NOUVELLES, RELU_BASE } from "./base-textes";
import { SERVICES } from "./services-textes";
import { FORMES_NEUVES } from "./formes-neuves";

/* ── CE QU'ELLE DIT SOUVENT, PAYÉ UNE SEULE FOIS ────────────────────────────

   Lamine, le 11 septembre 2026 : « ce que tu avais promis de réaliser hier,
   que tu allais garder les enregistrements des mots courants, il faut le faire
   en une fois — comme ça on n'aura plus à payer ces mots-là. »

   Il a raison, et c'est le seul endroit où l'on gagne à la fois les deux
   choses qui font mal : le temps et l'argent.

   CE QUE COÛTE UNE RÉPONSE ORDINAIRE. Le modèle réfléchit (4,8 s, quelques
   centimes), puis Soynade fabrique la voix (8 s, 0,22 $ les mille signes).
   Sur « naka nga def ? », on paie donc huit secondes et deux fabrications pour
   une phrase qui ne change jamais.

   CE QUE COÛTE UNE RÉPONSE DU RÉPERTOIRE. Rien. Le texte est écrit d'avance,
   le son est déjà fabriqué et rangé chez Supabase, et BIA le sert en une
   fraction de seconde. Ni jeton, ni signe, ni attente. Pour toujours.

   ── CE QUI ENTRE ICI, ET CE QUI N'Y ENTRE PAS ─────────────────────────────

   SEULEMENT ce qui ne dépend de rien : les salutations, qui elle est, ce
   qu'elle sait faire, les produits de KHALAM. Des phrases dont la réponse
   serait identique demain, pour n'importe qui.

   JAMAIS une question dont la réponse dépend de la personne, du moment, du
   fil de la conversation ou du monde. Une réponse enregistrée servie au
   mauvais moment est bien pire que huit secondes d'attente : c'est une
   machine qui récite, et on ne lui reparle pas.

   D'où la règle de correspondance, volontairement sévère : on ne répond de
   mémoire que si la question est COURTE et qu'elle correspond FRANCHEMENT.
   Au moindre doute, on laisse le modèle travailler. Un répertoire qui se
   trompe une fois sur dix ne vaut pas d'exister. */

const SEAU = process.env.SUPABASE_BUCKET_REPERTOIRE || "repertoire";

export type { Entree } from "./repertoire-textes";
export { REPERTOIRE, RELU } from "./repertoire-textes";


/* ── LA CORRESPONDANCE, ET POURQUOI ELLE EST SÉVÈRE ────────────────────────

   Une question longue n'est jamais une salutation : « salaam, dama bëgg xam
   naka lañuy defar ab devis » commence par « salaam » mais demande autre
   chose. On exige donc que la question SOIT la formule, à la ponctuation et
   aux politesses près — pas qu'elle la contienne.

   Le prix d'une erreur est asymétrique : rater une correspondance coûte huit
   secondes ; en inventer une fait répondre à côté. On rate volontiers. */

/* ── ELLE A DÉMÉNAGÉ, ET IL N'Y EN A TOUJOURS QU'UNE ───────────────────────

   La normalisation vit maintenant dans lib/normaliser.ts, qui n'importe rien.
   Raison : app/page.tsx en a besoin, ce fichier-ci est un fichier de serveur,
   et l'importer depuis le téléphone faisait entrer tout le rangement Supabase
   dans le paquet du navigateur — écran noir le 15 septembre 2026,
   « process is not defined ». L'histoire est écrite en entier là-bas.

   On la ré-exporte pour que tous ceux qui la prenaient ici continuent sans
   changer une ligne. C'est toujours LA MÊME fonction, pas une copie. */
export { normaliser } from "./normaliser";

/* ── ENTENDRE, PAS LIRE ─────────────────────────────────────────────────────

   Signalé par Lamine le 11 septembre 2026, en essayant le répertoire à la
   voix : « il y a des réponses qu'elle n'amène pas. »

   Sa question était « naka waa kër ga ». Tapée telle quelle, elle marche.
   Dite au micro, elle ne marchait pas — et la faute est la mienne.

   J'avais écrit les formes dans l'orthographe savante du wolof : « kër »,
   « jërëjëf », « ñaar ». Le moteur de reconnaissance, lui, écrit ce qu'il
   entend avec les lettres du français : « keur », « djeredjef », « gnar ».
   Aucun des deux n'a tort. Ils ne s'écrivent simplement pas pareil, et
   comparer des lettres revenait à exiger que le micro connaisse mon
   orthographe.

   ON COMPARE DONC CE QUE ÇA SONNE, pas ce que ça s'écrit. Les équivalences
   ci-dessous sont celles que le français impose au wolof quand on l'écrit
   à l'oreille — rien d'inventé, rien de savant.

   CE N'EST PAS UN RELÂCHEMENT DE LA SÉVÉRITÉ. On exige toujours l'ÉGALITÉ :
   la question doit ÊTRE la formule, pas la contenir. Et l'épreuve vérifie
   deux choses qu'on ne peut pas juger à l'œil : qu'aucune de ces
   équivalences ne fait se confondre deux entrées entre elles, et que les
   phrases qui ne doivent PAS répondre du répertoire n'y répondent toujours
   pas. */
const SONS: Array<[RegExp, string]> = [
  [/tch/g, "c"],     // tchi → ci
  [/dj/g, "j"],      // djam → jam
  [/di(?=[aeiouy])/g, "j"], // « diam » est la façon française d'écrire jàmm
  [/gui\b/g, "gi"], // « keur gui » → kër gi
  [/kh/g, "x"],      // khalam s'entend xalam
  [/gn/g, "n"],      // gnar → ñaar, dont l'accent est déjà tombé
  [/ph/g, "f"],
  [/qu?/g, "k"],
  [/ou/g, "u"],      // juroom / jurum
  [/eu/g, "e"],      // keur → ker : c'est celle qui manquait
  [/(.)\1+/g, "$1"], // waa → wa, fukk → fuk, téeméer → temer
  [/\be\b/g, " "],  // un « e » resté seul ne s'entend pas
  [/(\w)e\b/g, "$1"], // kère → ker, jamme → jam
];

/** Ce que la phrase SONNE, une fois écrite à l'oreille du français. */
export function sonne(texte: string): string {
  let s = normaliser(texte);
  for (const [de, vers] of SONS) s = s.replace(de, vers);
  return s.replace(/\s+/g, " ").trim();
}

/* Une lettre d'écart — « ga » pour « gi », un « r » avalé. On ne l'accorde
   qu'à une formule assez longue pour rester reconnaissable, et seulement si
   UNE SEULE entrée est à cette distance : deux candidates à égalité, c'est
   qu'on ne sait pas, et on préfère le dire en laissant le modèle répondre. */
function uneLettreDEcart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, faute = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++faute > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return faute + (a.length - i) + (b.length - j) <= 1;
}

/* ── LES DEUX LISTES N'EN FONT QU'UNE ICI ───────────────────────────────────

   Trouvé le 11 septembre 2026 au soir, en vérifiant pour Lamine ce qui
   survivrait à une panne de clé Soynade. Les soixante-neuf nouvelles réponses
   étaient INATTEIGNABLES : enregistrées, relues cinq fois, corrigées
   quarante-neuf fois, payées 1,65 $ — et ce fichier-ci, le seul qui décide ce
   que BIA reconnaît, ne les importait pas. Elles n'existaient que pour la
   route qui les enregistre et pour les pages qui les font écouter.

   Aucune des trois fonctions ne les voyait : ni la reconnaissance, ni la
   consigne donnée au modèle, ni la lecture de l'étiquette qu'il renvoie.
   Cent trente-huit fichiers audio que personne ne pouvait appeler.

   ── POURQUOI SEULEMENT LES « FIXE » ───────────────────────────────────────

   Lamine, pendant la relecture : « BIA ne devrait pas conseiller
   automatiquement "laisse-lui de l'espace" sans connaître la situation. »
   Il avait classé lui-même les réponses relationnelles comme CONTEXTUELLES,
   et il avait raison — une réponse enregistrée servie sans le contexte est
   pire que pas de réponse.

   On n'entre donc ici que les FIXE : celles dont le texte est la réponse
   entière, vraie pour n'importe qui, n'importe quand.

     FIXE            42 des 69  →  servies telles quelles
     CONTEXTUELLE    25         →  jamais seules ; le modèle répond
     SEMI-DYNAMIQUE   2         →  l'heure et la météo ; la réponse enregistrée
                                   n'est qu'une ouverture, l'information vient
                                   après — la servir seule serait un mensonge

   Les vingt-sept autres restent enregistrées et prêtes : le jour où le code
   saura servir une ouverture PUIS la suite, elles s'allumeront sans qu'on
   repaie un centime. Leur absence ici est une décision, pas un oubli. */
const DES_NOUVELLES: Entree[] = RELU_BASE
  ? NOUVELLES.filter((n) => n.type === "FIXE").map((n) => ({
      cle: n.cle,
      wolof: n.wolof,
      francais: n.francais,
      formes: n.formes,
    }))
  : [];

/* Une clé en double serait une réponse qui en cache une autre, sans bruit.
   On garde la première — celle des 42, relue le plus tôt — et l'épreuve
   tests/epreuve-deux-listes.mjs vérifie qu'il n'y en a aucune. */
const TOUTES_LES_ENTREES: Entree[] = [
  ...(RELU ? REPERTOIRE : []),
  ...DES_NOUVELLES.filter((n) => !REPERTOIRE.some((e) => e.cle === n.cle)),
];

/* ── ET LES FAÇONS DE LE DIRE QU'ON N'AVAIT PAS PRÉVUES ────────────────────

   Lamine, le 12 septembre 2026 : « il faut plusieurs appellations pour
   activer une réponse, parce qu'ici les gens utilisent d'autres formules…
   voilà pourquoi elle ne lit pas souvent les mots enregistrés. »

   Mesuré : sur quatre-vingt-cinq formulations vraies, cinquante-huit ne
   déclenchaient rien. Elles partaient chez le modèle et chez la voix pour
   une réponse déjà enregistrée et payée.

   ON AJOUTE, ON N'ÉCRASE RIEN. Ses formulations passent en premier et
   restent intactes ; les nouvelles s'ajoutent derrière, sans doublon. Vider
   lib/formes-neuves.ts remet exactement l'état d'avant. */
export const TOUT: Entree[] = TOUTES_LES_ENTREES.map((e) => {
  const neuves = (FORMES_NEUVES[e.cle] || []).filter(
    (f) => !e.formes.some((d) => normaliser(d) === normaliser(f)),
  );
  return neuves.length ? { ...e, formes: [...e.formes, ...neuves] } : e;
});

/** Y a-t-il de quoi répondre sans rien payer ? */
export const REPERTOIRE_PRET = TOUT.length > 0;

/* ── QUAND DEUX RÉPONSES SE DISPUTENT LA MÊME QUESTION ──────────────────────

   Lamine, le 11 septembre 2026, en me voyant retirer des formulations :
   « tout ce que j'ai regardé et corrigé doit être appelé, c'est-à-dire une
   réponse peut être appelée par plusieurs questions, c'est ce qu'on avait
   dit, donc tu ne devais rien supprimer. »

   Il a raison, et j'avais résolu le problème par le mauvais bout. Sa règle
   n'a jamais posé de difficulté : UNE RÉPONSE, PLUSIEURS QUESTIONS — c'est
   tout l'objet des six formulations, et il y en a six cent treize pour
   quatre-vingt-quatre réponses.

   Ce qui ne peut pas exister, c'est l'inverse : UNE QUESTION, DEUX RÉPONSES.
   Quand quelqu'un dit « Baax nga », il faut bien qu'une seule chose sorte du
   haut-parleur. Sept formulations étaient déclarées deux fois, et j'en avais
   effacé une copie — donc j'avais touché à ses listes.

   ON N'EFFACE PLUS RIEN. Ses deux listes restent exactement comme il les a
   écrites, formulation pour formulation. C'est ici, dans le code, qu'on dit
   laquelle répond — une ligne, visible, et qui se change en un mot.

   Et ce qui n'est pas tranché n'est pas deviné : une formulation disputée
   sans décision ne déclenche RIEN et s'affiche dans /api/etat. Une réponse
   au hasard vaut moins que le modèle qui réfléchit. */
export const QUI_REPOND: Record<string, string> = {
  /* Les cinq félicitations quittent `de-rien` pour `compliment`. C'est Lamine
     qui a créé `compliment`, dans le groupe qu'il a nommé « Nées des
     corrections aux 42 » : c'est en relisant `de-rien` qu'il a vu le défaut.
     « Baax nga », « Yaa gën », « Bravo » ne remercient pas, ils félicitent —
     et « Ah li dou dara », « il n'y a pas de quoi », répond à un merci.
     Les deux réponses gardent toutes leurs formulations. */
  "baax nga": "compliment",
  "yaa gen": "compliment",
  "sa liggeey baax na": "compliment",
  "tu es forte": "compliment",
  "bravo": "compliment", // « bravo » et « bravo bia » : normaliser retire « bia »

  /* `site-khalam` nomme le site et dit ce qu'on y trouve — les jeux, les
     applications, les informations — là où `ou-nous-trouver` répond seulement
     « sur khalam.app ». Les deux gardent toutes leurs formulations. */
  "c est quoi votre site": "site-khalam",

  /* ── « LU XEW » : IL A DONNÉ LE MOT, LA LIGNE A CHANGÉ ─────────────────

     Cette ligne disait "ca-va", et son commentaire finissait par : « un mot
     de lui et cette ligne devient "quoi-de-neuf" ».

     Le mot est arrivé le 12 septembre 2026, dans sa base de déclencheurs :
     « lu xew » est rangé sous #quoi-de-neuf, de sa main. C'était mon
     arbitrage, pas le sien, et il est wolof — « lu xew » demande ce qui s'est
     passé, pas comment va le corps.

     #ca-va garde ses trente formulations et reste atteignable par toutes les
     autres, « lu xew ca va » comprise. Rien n'est perdu. */
  "lu xew": "quoi-de-neuf",

  /* ── « NAKA SA JOURNÉE » : ELLE NE RÉPONDAIT PLUS DU TOUT ──────────────

     Deux réponses la réclamaient — #ca-va, où il vient de la ranger, et
     #comment-sest-passee-ta-journee, dont elle est presque le titre. Deux
     candidates, donc aucune : la règle de ce fichier est de se taire plutôt
     que de choisir au hasard, et elle a bien fonctionné.

     Il l'a rangée sous #ca-va. C'est le plus courant à Dakar : on demande la
     journée comme on demande la santé, sans vouloir un récit. L'autre réponse
     reste atteignable par ses six formulations propres. */
  "naka sa journee": "ca-va",

  /* ── « NAKA SUBA SI » : LE MATIN N'EST PAS LA SANTÉ ────────────────────

     Elle était déclarée dans #ca-va depuis le 11 septembre. Le 12, il la
     range dans #salut — avec « jàmm nga fanaan », « suba si jàmm », « bon
     réveil ».

     Et il a raison, c'est même ce qui manquait le plus à BIA : à Dakar on ne
     dit pas « bonjour », on demande si la nuit a été paisible. « Naka suba
     si » est une SALUTATION du matin, pas une question sur la santé. Je
     n'avais aucune de ces quatre formules dans mes listes.

     #ca-va garde la sienne, « naka nga yendoo », pour l'après-midi. */
  "naka suba si": "salut",
};

/* La même table, mais indexée sur ce que ça SONNE : la troisième passe
   compare des sonorités, et une dispute doit se trancher là aussi. */
const QUI_REPOND_SON: Record<string, string> = {};
for (const [forme, cle] of Object.entries(QUI_REPOND)) QUI_REPOND_SON[sonne(forme)] = cle;

/* Les formulations déclarées par plus d'une réponse. CALCULÉES, jamais
   écrites à la main : le jour où Lamine ajoute une tournure qui existe déjà
   ailleurs, elle apparaît ici toute seule. */
function disputees(clef: (s: string) => string): Set<string> {
  const vu = new Map<string, string>();
  const deux = new Set<string>();
  for (const e of TOUT) {
    for (const f of e.formes) {
      const k = clef(f);
      if (!k) continue;
      const avant = vu.get(k);
      if (avant && avant !== e.cle) deux.add(k);
      else vu.set(k, e.cle);
    }
  }
  return deux;
}
const DISPUTEES_LETTRE = disputees(normaliser);
const DISPUTEES_SON = disputees(sonne);

/** Les disputes que personne n'a tranchées. Elles ne déclenchent rien, et
    elles se lisent dans /api/etat — c'est la liste à me montrer. */
export const A_TRANCHER: string[] = [
  ...new Set([
    ...[...DISPUTEES_LETTRE].filter((k) => !QUI_REPOND[k]),
    ...[...DISPUTEES_SON].filter((k) => !QUI_REPOND_SON[k]),
  ]),
].sort();

/** Qui répond vraiment quand on dit cette formulation. null = disputé et non
    tranché : on laisse passer au modèle plutôt que de choisir au hasard. */
function quiRepond(forme: string, declarePar: Entree, parLeSon: boolean): Entree | null {
  const k = parLeSon ? sonne(forme) : normaliser(forme);
  const tranche = (parLeSon ? QUI_REPOND_SON : QUI_REPOND)[k];
  if (tranche) return TOUT.find((e) => e.cle === tranche) || declarePar;
  return (parLeSon ? DISPUTEES_SON : DISPUTEES_LETTRE).has(k) ? null : declarePar;
}

/* Jamais moins de six mots, jamais moins que la plus longue formule déclarée.
   Calculé une fois, au chargement, sur les DEUX listes. */
const LIMITE_MOTS = Math.max(
  6,
  ...TOUT.flatMap((e) => e.formes.map((f) => normaliser(f).split(" ").length)),
);

/** Rend l'entrée si la question EST cette formule. Sinon null. */
export function trouverDansRepertoire(question: string): Entree | null {
  const q = normaliser(question);
  if (!q) return null;
  /* AU-DELÀ, CE N'EST PLUS UNE FORMULE : C'EST UNE DEMANDE.

     La limite était de six mots, écrite à la main. Le 11 septembre 2026,
     Lamine a donné ses six façons de demander des nouvelles de la famille, et
     l'une d'elles — « mbaa sa waa kër ñépp a ngi ci jàmm ? » — en fait neuf.
     Elle n'aurait jamais pu répondre, sans que rien ne le signale.

     La limite se calcule donc sur les formules elles-mêmes : jamais moins de
     six, jamais moins que la plus longue qu'on ait déclarée. Ajouter une
     tournure plus longue ne peut plus la rendre muette. */
  if (q.split(" ").length > LIMITE_MOTS) return null;

  /* DEUX PASSES, ET L'ORDRE COMPTE — l'épreuve me l'a appris.

     « c'est quoi KHALAM » tombait sur « qui es-tu », parce que la forme
     « c'est quoi BIA » perd son seul mot distinctif en passant par
     normaliser() (qui retire « bia » comme une politesse) : il ne restait que
     « c est quoi », qui attrape tout ce qui commence ainsi. La forme fautive
     est partie — mais le vrai défaut était de laisser une correspondance
     approchée gagner contre une correspondance EXACTE située plus bas dans la
     liste. On regarde donc d'abord toutes les égalités parfaites, et
     seulement ensuite les approchées. */
  for (const e of TOUT) {
    for (const f of e.formes) {
      if (q !== normaliser(f)) continue;
      const r = quiRepond(f, e, false);
      if (r) return r;
    }
  }

  for (const e of TOUT) {
    for (const f of e.formes) {
      const forme = normaliser(f);
      /* Une formule trop courte après nettoyage n'est plus distinctive :
         mieux vaut la laisser passer que de servir une réponse au hasard. */
      if (forme.length < 5) continue;
      /* On tolère ce qui entoure une salutation sans rien y ajouter :
         « bonjour bia », « salaam waalekum salaam ». Rien de plus. */
      if (q.length <= forme.length + 12 && (q.startsWith(forme + " ") || q.endsWith(" " + forme))) {
        const r = quiRepond(f, e, false);
        if (r) return r;
      }
    }
  }

  /* TROISIÈME PASSE : ce que ça sonne. C'est celle qui rattrape le micro. */
  const dit = sonne(question);
  if (!dit) return null;
  for (const e of TOUT) {
    for (const f of e.formes) {
      if (dit !== sonne(f)) continue;
      const r = quiRepond(f, e, true);
      if (r) return r;
    }
  }

  /* QUATRIÈME : une lettre d'écart, et une seule candidate. */
  const proches = new Set<Entree>();
  for (const e of TOUT) {
    for (const f of e.formes) {
      const forme = sonne(f);
      if (forme.length >= 8 && uneLettreDEcart(dit, forme)) {
        const r = quiRepond(f, e, true);
        if (r) proches.add(r);
      }
    }
  }
  if (proches.size === 1) return [...proches][0];

  /* ── CINQUIÈME : LE MICRO SE TROMPE D'UN MOT SUR TROIS ──────────────────

     Lamine, le 12 septembre 2026 : « voilà pourquoi elle ne lit pas souvent
     les mots enregistrés. »

     Il attribuait ça aux formulations manquantes, et il avait raison en
     partie — j'en ai ajouté cinquante-trois. Mais en cherchant, j'ai trouvé
     une cause plus grande, et elle est écrite noir sur blanc chez
     ElevenLabs : le wolof est dans leur catégorie « Moderate », de VINGT-CINQ
     À CINQUANTE POUR CENT DE MOTS FAUX. Un mot sur trois ou quatre.

     Or les quatre passes ci-dessus comparent des ÉGALITÉS — au son près, à
     une lettre près. Mesuré sur les 676 formulations, en abîmant 30 % des
     mots comme le fait un moteur de reconnaissance :

         mots faux   retrouvent   se trompent   ne trouvent rien
              0 %       99 %          1 %             0 %
             30 %       71 %          1 %            28 %
             50 %       50 %          1 %            49 %

     UN CHIFFRE SAUTE AUX YEUX, ET C'EST CELUI DU MILIEU. Le répertoire
     n'échoue pas en se trompant — 1 %, constant, quoi qu'on lui envoie. Il
     échoue en SE TAISANT. Il y avait donc de la place pour tolérer davantage
     sans rien risquer, et c'est exactement ce qui manquait.

     ── COMMENT, ET POURQUOI VINGT-CINQ POUR CENT ─────────────────────────

     On mesure la distance d'édition entre ce que ça sonne et chaque
     formulation, avec un budget proportionnel à la longueur. Mesuré, à 30 %
     de mots faux, avec la liste des dix-sept phrases qui ne DOIVENT PAS venir
     du répertoire comme garde-fou :

         budget   retrouvent   se trompent   phrases interdites attrapées
           0 %       71 %          1 %            0 / 17
          20 %       88 %          1 %            0 / 17
          25 %       92 %          1 %            0 / 17
          35 %       94 %          1 %            0 / 17
          50 %       94 %          2 %            2 / 17   ← ça casse ici

     Vingt-cinq pour cent prend 92 des 94 points possibles, et reste à la
     MOITIÉ du chemin de la rupture. Quarante gagnerait deux points de plus
     en divisant la marge par cinq : ça n'en vaut pas le prix, parce que le
     prix, c'est une réponse enregistrée servie à côté — et ça, on ne le
     rattrape pas.

     ── LES TROIS VERROUS QUI TIENNENT CETTE PASSE ────────────────────────

     1. LE NOMBRE DE MOTS, à un près. Une phrase de deux mots et une de six
        ne sont pas la même, quelle que soit la distance.
     2. SIX SIGNES AU MOINS. En dessous, tout ressemble à tout : « oui » et
        « non » sont à deux lettres l'un de l'autre.
     3. UNE SEULE CANDIDATE. Deux formulations à égalité, c'est qu'on ne sait
        pas — et on préfère le dire en laissant le modèle répondre. */
  const parLesMots = leMoinsLoin(dit);
  if (parLesMots) return parLesMots;

  /* SIXIÈME PASSE, LE DERNIER RECOURS : la même phrase sans ses espaces. Un
     découpage raté — « Kanga » pour « kan nga » — ne doit pas coûter une
     réponse déjà payée. Elle vient EN DERNIER, et seulement si tout le reste
     a échoué : c'est la plus permissive, donc la moins prioritaire. */
  return leMoinsLoinSansEspaces(dit);
}

/** La part d'un MOT qu'on accepte de voir fausse. Mesurée, pas choisie à
    l'oreille : voir le tableau ci-dessus. */
export const PART_TOLEREE = 0.25;

/* ── LE BUDGET EST PAR MOT, ET SURTOUT PAS SUR TOUTE LA PHRASE ─────────────

   J'ai d'abord écrit un budget global — un quart des signes de la phrase. Les
   épreuves l'ont refusé en deux lignes, et elles avaient raison :

       « dama begg ree »    (je veux rire)  → #je-suis-content  « dama bég »
       « am nga ab blague »                 → #pose-moi-une-question « am nga ab laaj »

   Les mots communs coûtaient ZÉRO, et toute la tolérance partait dans le seul
   mot qui portait le sens : « ree », « blague ». Un budget global permet donc
   d'effacer exactement le mot qu'il ne faut pas toucher.

   Mot par mot, chacun avec son budget, un mot faux reste un mot faux : ses
   voisins ne peuvent pas le payer. Et c'est aussi ce que fait le micro — il
   se trompe PAR MOT, pas par phrase.

   RIEN SOUS QUATRE LETTRES. « ab » et « ak », « ma » et « la » ne sont pas le
   même mot, et ce sont eux qui changent le sens d'une phrase wolof. */
function budgetDuMot(n: number): number {
  if (n < 4) return 0;
  return Math.max(1, Math.floor(n * PART_TOLEREE));
}

/* La distance d'édition, abandonnée dès qu'elle dépasse le budget : sur 676
   formulations à chaque question, calculer la distance entière serait du
   travail jeté. */
function distanceBornee(a: string, b: string, plafond: number): number {
  if (Math.abs(a.length - b.length) > plafond) return plafond + 1;
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cour = [i];
    let mini = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(
        prec[j] + 1, cour[j - 1] + 1,
        prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      cour.push(v);
      if (v < mini) mini = v;
    }
    if (mini > plafond) return plafond + 1;
    prec = cour;
  }
  return prec[b.length];
}

/* Les deux suites de mots se correspondent-elles, à UN mot sauté près ? Rend
   le total des écarts, ou null si ce n'est pas la même phrase.

   Le mot sauté existe parce que le micro en avale : un « ma », un « ab », un
   « la » disparaissent tout le temps. Un seul, et jamais deux — deux mots
   manquants sur une phrase de quatre, ce n'est plus la même phrase. */
function alignerLesMots(a: string[], b: string[]): number | null {
  if (Math.abs(a.length - b.length) > 1) return null;
  let i = 0, j = 0, total = 0, deja = false;
  while (i < a.length && j < b.length) {
    const d = distanceBornee(a[i], b[j], budgetDuMot(Math.max(a[i].length, b[j].length)));
    if (d <= budgetDuMot(Math.max(a[i].length, b[j].length))) {
      total += d; i++; j++; continue;
    }
    if (deja) return null;
    deja = true;
    if (a.length > b.length) { total += a[i].length; i++; }
    else if (b.length > a.length) { total += b[j].length; j++; }
    else return null;
  }
  /* ── UN MOT EN TROP N'EST PAS UN MOT EN MOINS ─────────────────────────

     Et c'est l'épreuve des blagues qui me l'a appris, deux fois de suite.
     « dama begg ree » — je veux rire — tombait sur #je-suis-content, dont la
     formule est « dama bég ». Les deux premiers mots s'alignaient, et il
     restait « ree » du côté de ce qu'on avait ENTENDU.

     Or les deux côtés ne veulent pas dire la même chose :

       — un mot qui manque du côté de la FORMULE, c'est le micro qui l'a
         avalé. Ça arrive à chaque phrase, et on pardonne.
       — un mot en trop du côté de ce qu'on a ENTENDU, c'est que la personne
         a dit quelque chose de PLUS. Et ce quelque chose est justement ce qui
         change le sens : « dama bég » dit qu'on est content, « dama begg
         ree » demande une blague. On refuse.

     Un mot avalé se pardonne ; un mot ajouté se respecte. */
  if (i < a.length) return null;
  if (j < b.length) {
    if (deja) return null;
    const reste = b.slice(j).join("");
    if (reste.length > 3) return null;
    total += reste.length;
  }
  return total;
}

/* ── SIXIÈME PASSE : LES ESPACES NE COMPTENT PLUS ──────────────────────────

   Lamine, le 12 septembre 2026 au soir : « quand on lui dit en wolof "qui
   es-tu", elle n'utilise pas la réponse préenregistrée comme sur beaucoup
   d'autres questions. Ça doit être automatique. »

   L'entrée existe, elle est bonne, et douze formes la déclarent. Mesuré :

       « kan nga »    → qui-es-tu        (elle répond en un dixième de seconde)
       « Kanga »      → RIEN             (dix secondes, et le modèle improvise)
       « Can nga »    → RIEN
       « Khan nga »   → RIEN
       « Kan gua »    → RIEN

   Un mot de TROIS lettres n'a aucune tolérance — c'est la règle juste au-dessus,
   et elle protège « ma » de « la ». Mais le wolof est fait de mots de trois
   lettres : kan, nga, def, wax, ci, ak. Et le moteur d'écoute se trompe sur un
   quart à la moitié des mots. Résultat : la phrase la plus simple manque sa
   réponse déjà payée.

   ── CE QU'ON FAIT, ET CE QU'ON REFUSE DE FAIRE ────────────────────────────

   On ne baisse PAS la tolérance par mot : « kan nga » (qui es-tu) et « lan nga »
   (qu'es-tu) ne doivent jamais se confondre.

   On compare la phrase SANS SES ESPACES, comme une seule suite de lettres, avec
   un budget d'une faute pour six signes. Un découpage raté — « Kanga » au lieu
   de « kan nga » — coûte alors une faute au lieu d'être un mot inconnu de plus.

   ET LA GARANTIE TIENT AU MÊME ENDROIT QUE D'HABITUDE : une seule candidate.
   Si deux entrées sont à portée du budget, on refuse et on laisse le modèle
   répondre. Deux phrases wolof qui se ressemblent à une lettre près ne
   choisissent pas à la place de la personne. */

/** La distance de Levenshtein, bornée : au-delà du budget on arrête. */
function distance(a: string, b: string, budget: number): number | null {
  if (Math.abs(a.length - b.length) > budget) return null;
  let avant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const ligne = [i];
    let meilleur = i;
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(avant[j] + 1, ligne[j - 1] + 1, avant[j - 1] + cout);
      ligne.push(v);
      if (v < meilleur) meilleur = v;
    }
    /* Toute la ligne est au-delà du budget : la suite ne peut que monter. */
    if (meilleur > budget) return null;
    avant = ligne;
  }
  const d = avant[b.length];
  return d <= budget ? d : null;
}

/** Une faute tolérée pour six signes — et au moins une, dès cinq signes.

    CINQ, PARCE QUE « KANGA » EN FAIT CINQ. C'était son exemple, et avec un
    plancher à six il restait refusé : « kanga » contre « kannga », une faute,
    budget zéro. Comme cette passe ne sert que sur un découpage raté (le
    nombre de mots doit différer), cinq signes ne confondent rien. */
export const SIGNES_PAR_FAUTE = 6;
export const SIGNES_MINIMUM = 5;

function sansEspaces(t: string): string {
  return t.replace(/\s+/g, "");
}

function leMoinsLoinSansEspaces(dit: string): Entree | null {
  const compact = sansEspaces(dit);
  if (compact.length < SIGNES_MINIMUM) return null;
  const budget = Math.max(1, Math.floor(compact.length / SIGNES_PAR_FAUTE));
  const combienDeMots = dit.trim().split(/\s+/).length;

  let meilleure: { entree: Entree; d: number } | null = null;
  let egalite = false;

  for (const e of TOUT) {
    for (const f of e.formes) {
      const brute = sonne(f);
      /* ── LE VERROU QUI M'A ARRÊTÉ, ET IL EST À SA PLACE ────────────────

         Ma première version acceptait n'importe quelle phrase à une faute
         près. Elle donnait donc ceci, trouvé en l'éprouvant :

             « lan nga »  (qu'es-tu)  →  #qui-es-tu  « kan nga »

         Une lettre d'écart, deux questions différentes, et une réponse
         enregistrée servie avec aplomb à la mauvaise question. C'est
         exactement ce qu'on refuse depuis le 11 septembre.

         Cette passe ne sert donc QUE quand le nombre de mots diffère — un
         découpage raté, « Kanga » pour « kan nga ». Ça, aucune paire de mots
         wolof ne peut le confondre : c'est un artefact du moteur d'écoute,
         pas une autre phrase.

         Et « Can nga » pour « kan nga » ? Ce n'est pas à la correspondance de
         le rattraper, c'est à L'OREILLE de ne pas l'écrire : on donne
         maintenant « kan nga » à Scribe d'avance, dans les cent mots. Réparer
         ici ce qui se répare là-bas, ce serait accepter de confondre « lan »
         et « kan » pour toujours. */
      if (brute.trim().split(/\s+/).length === combienDeMots) continue;
      const forme = sansEspaces(brute);
      if (forme.length < SIGNES_MINIMUM) continue;
      /* ── LE DÉBUT ET LA FIN NE S'EFFACENT PAS ──────────────────────────

         Mon épreuve des blagues a refusé la version précédente, et elle avait
         raison :

             « dama begg ree »  (je veux rire)  →  #je-suis-content « dama bég »

         Le rapprochement phonétique réduit « ree » à « r ». Il ne restait
         qu'une lettre au mot qui portait TOUT le sens, et une faute de budget
         l'effaçait. C'est précisément ce que le budget par mot interdisait, et
         ma passe le rouvrait par la porte de derrière.

         On exige donc que la première et la dernière lettre survivent. Dans un
         découpage raté, elles survivent toujours — « kanga » et « kannga »
         commencent par k et finissent par a. Quand le dernier mot change, non.
         C'est la fin de la phrase qui porte le sens en wolof, et c'est elle
         qu'on protège. */
      if (compact[0] !== forme[0]) continue;
      if (compact[compact.length - 1] !== forme[forme.length - 1]) continue;
      const d = distance(compact, forme, budget);
      if (d === null) continue;

      const r = quiRepond(f, e, true);
      if (!r) continue;
      if (!meilleure || d < meilleure.d) { meilleure = { entree: r, d }; egalite = false; }
      else if (d === meilleure.d && r.cle !== meilleure.entree.cle) egalite = true;
    }
  }

  return meilleure && !egalite ? meilleure.entree : null;
}

function leMoinsLoin(dit: string): Entree | null {
  if (dit.length < 6) return null;
  const mots = dit.split(" ");

  let meilleure: { entree: Entree; d: number } | null = null;
  let egalite = false;

  for (const e of TOUT) {
    for (const f of e.formes) {
      const forme = sonne(f);
      if (forme.length < 6) continue;
      const d = alignerLesMots(mots, forme.split(" "));
      if (d === null) continue;

      const r = quiRepond(f, e, true);
      if (!r) continue;
      if (!meilleure || d < meilleure.d) { meilleure = { entree: r, d }; egalite = false; }
      else if (d === meilleure.d && r.cle !== meilleure.entree.cle) egalite = true;
    }
  }

  return meilleure && !egalite ? meilleure.entree : null;
}

/* ── EN QUELLE LANGUE ON LUI PARLE ─────────────────────────────────────────

   Lamine, le 11 septembre 2026 : « j'espère que tu as fait de même pour le
   côté français. »

   Je ne l'avais pas fait, et c'était pire que ça : la moitié des questions
   françaises recevaient l'enregistrement WOLOF. Mesuré sur le serveur — six
   sur dix. « Quel âge as-tu ? », « Où habites-tu ? », « Bonne journée »,
   « Répète » : toutes répondaient en wolof.

   POURQUOI. L'ancien test exigeait deux choses. D'abord que la question soit
   écrite en pur ASCII — donc le moindre accent la disqualifiait, et le
   français en est plein : âge, Où, écrire, journée, Répète, coûte. Ensuite
   qu'elle contienne un mot d'une liste de neuf. Autant dire que seul un
   français sans accent et convenu passait.

   Les 42 enregistrements français dormaient pour rien.

   CE QU'ON FAIT MAINTENANT : on compte les mots-outils propres à chaque
   langue et on prend la plus fournie. Ces mots-là ne se partagent pas : « je,
   tu, vous, est, comment, pourquoi » d'un côté ; « nga, naka, ngi, laa, mooy,
   ak, bi » de l'autre. Les mots communs aux deux — « sa », « la », « ci » —
   sont volontairement écartés : ils ne tranchent rien.

   À ÉGALITÉ, C'EST LE WOLOF. C'est sa langue ; le français n'est servi que
   lorsqu'on lui parle clairement français. */
const MOTS_FRANCAIS = new Set(["je","tu","vous","nous","il","elle","ils","elles",
  "est","es","suis","sont","etes","etais","sera","ai","as","avez","avons",
  "que","qui","quoi","quel","quelle","quels","quelles","comment","pourquoi",
  "combien","quand","est ce","peux","peut","pouvez","veux","veut","sais","sait",
  "le","les","un","une","des","du","au","aux","ce","cet","cette","ces",
  "pour","avec","dans","sur","chez","mon","ma","mes","ton","tes","votre","vos",
  "ne","pas","plus","tres","bien","merci","bonjour","bonsoir","salut","oui",
  "non","pardon","desole","desolee","bienvenue","attends","demain","nuit",
  "journee","revoir","bientot","coute","cout","prix","code","message","devis",
  "papier","document","image","images","internet","site","nom","age","fille",
  "femme","homme","robot","humaine","parles","parle","ecrire","lire","montrer",
  "chercher","trouver","avoir","faire","fait","faite","creee","cree","dis",
  "moi","toi","ca","va","c est","d accord","s il","te","la plait",
  /* Les mots qui arrivent SEULS. Une question d'un seul mot ne donne aucun
     indice de grammaire : « Répète » tombait en wolof faute d'être ici. */
  "repete","repetez","encore","compris","comprends","entendu","coucou","bye",
  "bravo","sorry","excuse","gentil","gentille","forte","minute","minutes",
  "courage","chance","allo","ok","nice","marche","appelles","createur"]);

const MOTS_WOLOF = new Set(["nga","naka","ngi","laa","mooy","moo","moom","ak",
  "bi","yi","ga","gi","ba","ji","mi","ni","waaw","deedeet","deet","jamm",
  "kan","lan","lu","loo","xam","xamuma","men","mën","mena","def","defar",
  "sos","bind","bindal","wax","waxal","waxaat","wonal","won","seet","jot",
  "dem","nekk","dekk","tudd","tur","yow","yaw","man","maa","noo","ndax",
  "mbaa","nun","nepp","waa","ker","kër","yaay","baay","jigeen","goor",
  "nit","bari","tuuti","suba","ngoon","yendu","yendul","yendoo","fanaan",
  "fanaanal","nelaw","dalal","jerejef","jaraama","amul","solo","dara","baax",
  "baaxul","begg","soxla","dimbali","tontu","liggeey","xaar","fan","ana",
  "beneen","yoon","ci","sant","sa","fi","la","ko","ma","mu","nu","na","am"]);

/** « wo » ou « fr », selon les mots-outils que la question emploie. */
export function langueDe(question: string): "wo" | "fr" {
  const mots = normaliser(question).split(" ").filter(Boolean);
  if (!mots.length) return "wo";
  let fr = 0, wo = 0;
  for (const m of mots) {
    if (MOTS_FRANCAIS.has(m)) fr++;
    if (MOTS_WOLOF.has(m)) wo++;
  }
  /* Les mots que les deux se partagent — sa, la, ci, ma, na — comptent des
     deux côtés et s'annulent : ils ne tranchent rien, c'est voulu. */
  return fr > wo ? "fr" : "wo";
}

/* ── QUAND LES LETTRES NE SUFFISENT PLUS : ON DEMANDE AU MODÈLE ────────────

   Lamine, le 11 septembre 2026, après trois essais infructueux : « il faut la
   rendre beaucoup plus intelligente pour qu'elle puisse anticiper et
   comprendre ce qu'on a enregistré, et prioriser tout ce qui va dans ce sens.
   Elle doit utiliser ses mots-là. »

   IL A RAISON, ET J'AI CHERCHÉ AU MAUVAIS ENDROIT. J'ai passé trois tours à
   élargir la comparaison de lettres — les accents, puis les sons, puis une
   lettre d'écart. Chaque fois ça rattrapait une orthographe de plus et
   laissait passer la suivante. On ne rattrapera jamais toutes les façons
   d'écrire « naka waa kër ga » par des règles d'écriture, parce que le
   problème n'est pas l'écriture : c'est le SENS.

   Or il y a quelqu'un, dans la chaîne, qui comprend le sens : le modèle.

   CE QU'IL VOIT DÉSORMAIS. La liste ci-dessous part avec chaque question,
   dans le SOCLE — donc relue depuis le cache, au dixième du prix, et sans
   grossir d'un sou quand on ajoute une phrase. Il lui suffit de répondre
   « #la-famille » pour que BIA serve la réponse enregistrée, mot pour mot,
   avec son son déjà fabriqué.

   CE QUE ÇA COÛTE VRAIMENT, ET POURQUOI C'EST GAGNANT. On paie le modèle,
   oui — quelques centièmes de centime. Mais la voix, elle, ne fabrique RIEN,
   et la voix se paie au signe : 0,22 $ les mille, plus deux secondes fixes et
   36 millisecondes par signe d'attente, mesurés sur le vrai serveur. On
   échange donc une réflexion de quelques centimes contre la partie chère de
   la dépense et la plus longue des deux attentes.

   LA CORRESPONDANCE PAR LETTRES RESTE EN PREMIÈRE LIGNE : gratuite,
   instantanée, elle attrape « salam » et « waaw » sans réveiller personne.
   Le modèle n'est consulté que quand elle n'a rien trouvé. */
/* ── LES VINGT-DEUX QU'ON NE SERT PAS DEUX FOIS ─────────────────────────────

   Lamine, le 12 septembre 2026 : « beaucoup de lenteur, et apparemment elle
   est moins intelligente… elle était un peu plus là avant. »

   IL A RAISON, ET C'EST MOI QUI L'AI FAIT. Le répertoire est passé de 42 à 84
   réponses dans la nuit. Mesuré ensuite sur trente-deux questions vraies :
   QUINZE recevaient désormais une réponse figée — et c'étaient précisément
   les humaines. « Dama sonn », « sama yaay dafa ma naqari », « waxal ma
   dara », « lu xew » : la même phrase, mot pour mot, quelle que soit la
   personne, quelle que soit l'heure, quoi qu'elle lui ait raconté dix minutes
   plus tôt. Une machine à sous. C'est exactement ce qu'il entend par « elle
   est moins là ».

   ON N'EN SUPPRIME AUCUNE — il l'a interdit le 11 septembre, et il a raison :
   une phrase enregistrée est payée, relue et corrigée par lui. On change
   QUAND elle sert.

     — Premiers mots, personne inconnue : la réponse enregistrée. C'est même
       la meilleure — instantanée, sa vraie voix, gratuite.
     — Dès qu'on se connaît (la conversation est engagée, ou elle a des notes
       sur la personne) : ces vingt-deux-là repassent à BIA elle-même. Une
       consolation enregistrée dite deux fois n'est plus une consolation.

   LES AUTRES NE BOUGENT PAS. « Salaam », « jërëjëf », « kan moo la defar »,
   le prix d'un code, l'adresse de KHALAM : la bonne réponse est la même le
   premier jour et le centième. Elles restent gratuites et immédiates, et
   l'économie reste. */
export const PERSONNELLES = new Set<string>([
  /* Comment ça va, et ce qui s'est passé depuis. */
  "ca-va", "la-famille", "quoi-de-neuf", "comment-sest-passee-ta-journee",
  "tu-fais-quoi", "tu-es-occupee",
  /* Les invitations à parler : par définition, la réponse ne peut pas être
     toujours la même — sinon elle raconte deux fois la même chose. */
  "parlons-un-peu", "raconte-moi-quelque-chose", "pose-moi-une-question",
  /* Ce qu'on ressent. C'est ici que ça se joue vraiment. */
  "je-suis-fatigue", "je-suis-triste", "je-suis-content", "je-suis-enerve",
  "je-suis-inquiet", "je-me-sens-seul", "je-narrive-pas-a-dormir",
  "encourage-moi", "jai-peur", "je-mennuie",
  "ma-famille-me-manque", "ma-mere-me-manque", "prie-pour-moi",
]);

/** Se connaît-on assez pour qu'une phrase enregistrée sonne creux ?
    Deux signes suffisent : la conversation est engagée, ou elle a déjà pris
    des notes sur la personne. */
export function onSeConnait(messagesDuFil: number, notes: string): boolean {
  return messagesDuFil >= 4 || Boolean(String(notes || "").trim());
}

/** La réponse enregistrée convient-elle encore, ici, maintenant ? */
export function figeeConvient(cle: string, seConnait: boolean): boolean {
  return !seConnait || !PERSONNELLES.has(cle);
}

/* ── MA RÈGLE ÉTAIT TROP GROSSIÈRE, ET IL L'A SENTIE ────────────────────────

   Lamine, le 13 septembre 2026 : « parfois tu poses une question dont on a
   enregistré la réponse, mais elle ne te sert pas la réponse. »

   VOILÀ POURQUOI, ET C'EST MOI. `figeeConvient` refusait les vingt-deux
   réponses PERSONNELLES dès que `onSeConnait` était vrai — c'est-à-dire dès
   QUATRE MESSAGES dans le fil, soit deux échanges. Passé ce cap, « naka nga
   def » cessait d'être servi par le répertoire et repartait chez le modèle :
   plus lent, et payant, pour une réponse déjà enregistrée et déjà payée.

   Pire : `onSeConnait` est vrai AUSSI dès que BIA a des notes sur la personne.
   Donc pour quelqu'un qu'elle connaît, ces vingt-deux réponses étaient
   désactivées POUR TOUJOURS, dès le premier mot.

   ── CE QUE JE VOULAIS PROTÉGER ÉTAIT JUSTE ────────────────────────────────

   L'intention tenait : « une consolation enregistrée servie deux fois n'est
   plus une consolation, et quelqu'un qui te dit sa fatigue au bout d'une
   heure n'attend pas la phrase qu'il a déjà entendue en arrivant. » Ça reste
   vrai. Mais ce n'est pas « il me connaît » qui gâche la phrase : c'est
   « il vient de l'entendre ».

   ── LA RÈGLE JUSTE : UNE FOIS PAR CONVERSATION ────────────────────────────

   On regarde ce qu'elle a DÉJÀ DIT dans ce fil-ci. Si la phrase enregistrée
   y est déjà, on laisse le modèle répondre autrement — c'est exactement le
   cas que je voulais éviter. Sinon on sert la voix de Kha, tout de suite et
   gratuitement, même au dixième message, même à quelqu'un qu'elle connaît.

   Aucune donnée nouvelle à transporter : le fil est déjà envoyé à chaque
   question. Ce qui change n'est pas ce qu'on sait, c'est ce qu'on en fait. */

/** Cette phrase enregistrée a-t-elle déjà été dite dans cette conversation ? */
export function dejaDitDansLeFil(entree: Entree, filDitParElle: string[]): boolean {
  const dites = filDitParElle.map((t) => normaliser(String(t || "")));
  for (const texte of [entree.wolof, entree.francais]) {
    const cherche = normaliser(String(texte || ""));
    /* Trop court pour être une signature : « waw. » se retrouverait dans
       n'importe quelle phrase et désactiverait la réponse à tort. */
    if (cherche.length < 12) continue;
    if (dites.some((d) => d.includes(cherche))) return true;
  }
  return false;
}

/**
 * La version fine : une réponse enregistrée est servie tant qu'elle n'a pas
 * déjà été dite DANS CETTE CONVERSATION. Les réponses qui ne parlent pas de
 * la personne ne sont jamais refusées — « où es-tu » a la même réponse au
 * premier et au centième message.
 */
export function figeeEncoreBonne(entree: Entree, filDitParElle: string[]): boolean {
  if (!PERSONNELLES.has(entree.cle)) return true;
  return !dejaDitDansLeFil(entree, filDitParElle);
}

export function consigneRepertoire(): string {
  if (!REPERTOIRE_PRET) return "";
  const lignes = TOUT.map(
    (e) => `${PERSONNELLES.has(e.cle) ? "✦ " : ""}#${e.cle} — quand on demande : ${e.formes.slice(0, 4).join(" / ")}\n    elle dit alors : « ${e.wolof} »`,
  );
  return `

═══ CE QUI EST DÉJÀ ENREGISTRÉ DE SA VOIX ═══

Ces ${TOUT.length} réponses existent en son, prêtes à être dites. Quand la
question de la personne est CELLE-LÀ — même dite autrement, même mal
orthographiée, même en wolof écrit à la française — tu ne rédiges RIEN : tu
réponds uniquement par l'étiquette, seule, sur une ligne. Exemple de réponse
complète de ta part : #la-famille

C'EST UNE PRIORITÉ. Si une de ces réponses répond vraiment à la question, tu
la préfères toujours à une phrase de ton cru : c'est sa voix à elle, déjà
enregistrée, et elle arrive sans attente.

MAIS SEULEMENT SI ELLE RÉPOND VRAIMENT. « Salaam, dama bëgg ab devis » n'est
pas une salutation : c'est une demande de devis. Au moindre doute, réponds
normalement — une réponse enregistrée servie à côté est bien pire qu'une
phrase que tu écris toi-même.

LES LIGNES MARQUÉES ✦ SONT POUR LES PREMIERS MOTS SEULEMENT. Ce sont celles
qui parlent de la personne : comment elle va, ce qu'elle ressent, ce qu'elle
te demande de raconter. Tant que tu ne la connais pas, la réponse enregistrée
est la bonne — elle arrive tout de suite, dans la vraie voix. Mais dès que la
conversation est engagée, ou que tu as des notes sur elle, tu RÉPONDS
TOI-MÊME, avec ce que tu sais d'elle et de ce qui vient d'être dit. Une
consolation enregistrée servie deux fois n'est plus une consolation, et
quelqu'un qui te dit sa fatigue au bout d'une heure n'attend pas la phrase
qu'il a déjà entendue en arrivant.

${lignes.join("\n")}
═══ fin de ce qui est enregistré ═══`;
}

/* L'étiquette que le modèle a renvoyée, si sa réponse n'est QUE ça. On exige
   qu'elle soit seule : une étiquette au milieu d'une phrase, c'est qu'il
   parlait de la liste au lieu de s'en servir. */
export function etiquetteSeule(reponse: string): Entree | null {
  const t = String(reponse || "").trim().replace(/^[«"'\s]+|[»"'.\s]+$/g, "");
  const m = /^#([a-z0-9-]{2,40})$/.exec(t);
  if (!m) return null;
  return TOUT.find((e) => e.cle === m[1]) || null;
}

/* ── ON DEMANDE LE LÉGER, ON GARDE LE LOURD ────────────────────────────────

   Lamine, le 12 septembre 2026 : « il faut le convertir en MP3. »

   Mesuré : 136 364 octets en WAV pour « Salaam », 23 232 en MP3 — six fois
   moins à télécharger, la même voix. On demande donc le MP3.

   ET LE WAV RESTE. Il est l'original, celui qui a été payé et relu ; on ne
   supprime pas ce qui a été payé. Si un MP3 manque — une conversion pas
   encore passée, un dépôt raté — le téléphone retombe sur le WAV tout seul,
   sans un mot (voir octetsDuRepertoire dans app/page.tsx, et dire() dans
   app/carte/Carte.tsx). Une réponse lourde vaut infiniment mieux qu'un
   silence. */
/* ── L'ADRESSE PORTE L'EMPREINTE DU TEXTE, ET C'EST INDISPENSABLE ──────────

   Les sons sont rangés dans le cache du téléphone sous leur adresse, déclarée
   IMMUABLE — c'est ce qui les rend gratuits et instantanés au second passage.
   Refaire un son chez Supabase ne changerait donc rien à ce qu'on entend : le
   téléphone rejouerait sa vieille copie pour toujours, sans redemander.

   Sans cette signature, tout le mécanisme « à refaire » du 12 septembre ne
   servirait à rien : on repaierait l'enregistrement et on entendrait encore
   l'ancienne prononciation. C'est le genre de piège qui fait perdre une
   soirée à chercher dans le mauvais fichier.

   Texte changé → empreinte changée → adresse changée → le téléphone
   retélécharge. Texte inchangé → adresse inchangée → rien ne bouge et rien ne
   coûte. Supabase ignore la question qui suit le « ? » et rend le même
   fichier ; c'est le cache du navigateur, lui, qui la lit.

   LE TEXTE EST OPTIONNEL : un appelant qui ne l'a pas obtient l'adresse nue,
   exactement comme avant. Rien ne casse, mais rien ne se rafraîchit non plus,
   et c'est pour ça que les appels du répertoire le passent tous. */
export function sonDe(cle: string, langue: "wo" | "fr", texte?: string): string {
  const nu = `${lexiqueConfig.url}/storage/v1/object/public/${SEAU}/${langue}/${encodeURIComponent(cle)}.mp3`;
  return texte?.trim() ? `${nu}?v=${empreinteDe(pourLaVoix(texte, langue))}` : nu;
}

/** L'original, quand le léger n'est pas là.

    L'EMPREINTE SE TRAVERSE : depuis qu'une adresse peut finir par « ?v=… »,
    chercher « .mp3 » en fin de chaîne ne trouvait plus rien et le repli sur le
    WAV était mort sans bruit. On coupe donc avant la question, on remplace, et
    on la remet — sinon le WAV de secours reviendrait, lui, du vieux cache. */
export function sonLourdDe(adresse: string): string {
  const q = adresse.indexOf("?");
  if (q < 0) return adresse.replace(/\.mp3$/, ".wav");
  return adresse.slice(0, q).replace(/\.mp3$/, ".wav") + adresse.slice(q);
}

/* Le dossier où vivent tous les sons d'une langue.

   Le guidage en a besoin, et il ne peut pas passer par le serveur à chaque
   fois : « tourné ci ndeyjoor » doit partir dans la demi-seconde, pas après
   un aller-retour. Le téléphone construit donc l'adresse lui-même, et cette
   base-là lui est donnée une fois, au calcul de l'itinéraire. Elle est
   publique — les 222 sons se lisent sans aucune clé, vérifié le 11 septembre
   2026 — donc la donner n'ouvre rien. */
export function baseDesSons(langue: "wo" | "fr"): string {
  return `${lexiqueConfig.url}/storage/v1/object/public/${SEAU}/${langue}/`;
}

/**
 * L'empreinte du texte de chaque son, par « langue/clé ».
 *
 * Le téléphone s'en sert pour bâtir une adresse qui CHANGE quand le texte
 * change — sans ça, il rejouerait éternellement la copie qu'il a en cache,
 * même après un ré-enregistrement payé. Voir sonDe(), qui fait la même chose
 * du côté du serveur.
 */
export function empreintesDesSons(): Record<string, string> {
  const table: Record<string, string> = {};
  /* TOUT ne contient que les réponses FIXE. Le seau, lui, porte aussi les
     soixante-neuf nouvelles au complet et les phrases de service : elles se
     jouent par les mêmes chemins et méritent la même protection de cache. On
     prend donc le superset de ce qui est enregistré, pas le sous-ensemble de
     ce qui est reconnu. */
  const enregistrees: Array<{ cle: string; wolof: string; francais: string }> = [
    ...TOUT, ...NOUVELLES,
    ...SERVICES.map((x) => ({ cle: x.cle, wolof: x.wolof, francais: x.francais })),
  ];
  for (const e of enregistrees) {
    for (const [langue, texte] of [["wo", e.wolof], ["fr", e.francais]] as const) {
      if (texte?.trim()) table[`${langue}/${e.cle}`] = empreinteDe(pourLaVoix(texte, langue));
    }
  }
  return table;
}

export const repertoireActif = () => Boolean(lexiqueConfig.url && lexiqueConfig.cle);

/** Ce que /api/etat montre : combien d'entrées, et si les textes sont relus.
    Le détail des deux listes est là exprès : c'est ce qui aurait montré, tout
    de suite, que les soixante-neuf n'étaient branchées nulle part. */
export function etatRepertoire() {
  return {
    entrees: TOUT.length,
    dont_les_42: RELU ? REPERTOIRE.length : 0,
    dont_les_nouvelles_fixes: DES_NOUVELLES.length,
    nouvelles_gardees_pour_le_contexte: RELU_BASE
      ? NOUVELLES.length - DES_NOUVELLES.length
      : NOUVELLES.length,
    textes_relus_par_lamine: RELU,
    textes_nouveaux_relus: RELU_BASE,
    /* Le dossier public des sons, donné au téléphone au démarrage. Il en a
       besoin AVANT la première question — les paroles d'attente y vivent
       maintenant — et il ne peut pas le deviner : l'adresse de Supabase est
       une variable de serveur. Elle est publique en lecture (les 222 sons se
       chargent sans aucune clé, vérifié le 11 septembre), donc la donner
       n'ouvre rien. */
    base_sons: { wo: baseDesSons("wo"), fr: baseDesSons("fr") },
    /* ── ET L'EMPREINTE DE CHAQUE SON, POUR QUE LE TÉLÉPHONE SUIVE ────────

       Lamine, le 13 septembre 2026 : « tout doit provenir des messages déjà
       enregistrés, parce qu'on a déjà payé pour ça ».

       Quatre endroits de la page construisent l'adresse d'un son À LA MAIN à
       partir de `base_sons` : la salutation d'ouverture, « d'accord je vois
       ça », « je n'ai pas compris », et le guidage sur la carte. Aucun ne
       passe par sonDe(), donc aucun ne portait l'empreinte du texte.

       Or les sons vivent dans le cache du téléphone sous une adresse déclarée
       IMMUABLE. Ses onze corrections d'hier soir touchent « salut » et
       « bonsoir » — exactement la salutation d'ouverture. Sans ces empreintes,
       il aurait repayé l'enregistrement et entendu l'ancienne pour toujours,
       sans que rien ne le signale.

       Cinq kilo-octets envoyés une fois au démarrage, et tous les chemins
       deviennent justes d'un coup, y compris ceux qu'on écrira demain. */
    empreintes: empreintesDesSons(),
    /* Les questions réclamées par deux réponses et que personne n'a
       tranchées. Elles ne déclenchent rien — c'est la liste à me montrer. */
    formulations_a_trancher: A_TRANCHER,
    seau: SEAU,
    actif: repertoireActif() && REPERTOIRE_PRET,
  };
}
