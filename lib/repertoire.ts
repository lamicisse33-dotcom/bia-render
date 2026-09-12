import { lexiqueConfig } from "./lexique";
import { REPERTOIRE, RELU } from "./repertoire-textes";
import type { Entree } from "./repertoire-textes";
import { NOUVELLES, RELU_BASE } from "./base-textes";

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

const CIVILITES = /\b(stp|svp|s il te plait|s il vous plait|bia|please)\b/g;

export function normaliser(texte: string): string {
  return String(texte || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(CIVILITES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
export const TOUT: Entree[] = [
  ...(RELU ? REPERTOIRE : []),
  ...DES_NOUVELLES.filter((n) => !REPERTOIRE.some((e) => e.cle === n.cle)),
];

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

  /* « lu xew » : deux décisions de Lamine le même jour. Je garde celle qui
     porte son raisonnement écrit — « lu xew » ne parle ni du corps ni de la
     santé, il demande où en sont les choses, c'est ça qu'on dit en croisant
     quelqu'un. `quoi-de-neuf` garde ses six formulations et reste atteignable
     par les cinq autres. Un mot de lui et cette ligne devient
     "quoi-de-neuf". */
  "lu xew": "ca-va",
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

  /* QUATRIÈME ET DERNIÈRE : une lettre d'écart, et une seule candidate. */
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
  return proches.size === 1 ? [...proches][0] : null;
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
export function sonDe(cle: string, langue: "wo" | "fr"): string {
  return `${lexiqueConfig.url}/storage/v1/object/public/${SEAU}/${langue}/${encodeURIComponent(cle)}.mp3`;
}

/** L'original, quand le léger n'est pas là. */
export function sonLourdDe(adresse: string): string {
  return adresse.replace(/\.mp3$/, ".wav");
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
    /* Les questions réclamées par deux réponses et que personne n'a
       tranchées. Elles ne déclenchent rien — c'est la liste à me montrer. */
    formulations_a_trancher: A_TRANCHER,
    seau: SEAU,
    actif: repertoireActif() && REPERTOIRE_PRET,
  };
}
