/* Ce que BIA sait des relations au Sénégal.

   Le texte vit dans data/relations.md, pas dans le code : Lamine le corrige et
   le dépose sur GitHub, Render redéploie, BIA sait la suite. Aucune ligne de
   TypeScript à toucher — comme pour data/khalam.md.

   Deux choses très différentes vivent ici, et il ne faut pas les confondre.

   1. LE SOCLE. Quelques lignes qui accompagnent BIA à CHAQUE question, même
      quand on lui parle de mathématiques. C'est la façon de se tenir devant
      quelqu'un qui raconte sa vie, et surtout la conduite à tenir quand il y
      a danger. Ça ne coûte presque rien et ça ne doit jamais dépendre d'une
      détection : un mot-clé manqué ne doit pas faire disparaître le plancher
      de sécurité.

   2. LA BASE. Les 70 situations écrites par Lamine. Quinze mille caractères :
      les envoyer à chaque question tripleraient le coût et dilueraient son
      attention. On ne les charge donc que lorsque la conversation touche
      vraiment aux relations. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* ── Le socle : toujours présent ─────────────────────────────────────────
   Repris des règles générales de Lamine, à la lettre. */
export const SOCLE_RELATIONS = `QUAND ON TE PARLE DE SA VIE PRIVÉE
Commence par reconnaître l'émotion : peine, colère, peur, confusion,
déception. Deux phrases courtes au maximum, puis UNE seule question utile.
N'humilie jamais personne, ne choisis pas un camp trop vite, ne présente
jamais une supposition comme un fait. Respecte la culture et la religion sans
jamais justifier le contrôle, la contrainte ou la violence. Pour une décision
juridique, médicale ou religieuse importante, oriente vers un professionnel.

S'IL Y A DANGER — coups, menaces, contrainte sexuelle, harcèlement, chantage
aux images — tu arrêtes les conseils ordinaires. Tu dis clairement que ce
n'est pas une dispute ordinaire et que ce n'est pas la faute de la personne.
Sa sécurité passe avant tout le reste : tu demandes si elle est en sécurité
en ce moment, et tu l'orientes vers quelqu'un en qui elle a confiance ou vers
les secours. Tu ne minimises jamais. Tu ne conseilles jamais d'endurer.`;

/* ── La base : chargée quand le sujet s'y prête ──────────────────────────
   Lue une fois puis gardée en mémoire : le fichier ne change qu'entre deux
   déploiements. */
let contenu: string | null = null;

export async function savoirRelations(): Promise<string> {
  if (contenu !== null) return contenu;
  try {
    contenu = (await readFile(join(process.cwd(), "data", "relations.md"), "utf8")).trim();
  } catch {
    contenu = "";
  }
  return contenu;
}

/* ── Reconnaître le sujet ────────────────────────────────────────────────

   Une liste de mots, en français et en wolof. On évite volontairement les
   mots trop courants — « bëgg » veut dire aussi bien aimer que vouloir, il
   ferait entrer la base dans toutes les conversations.

   Se tromper dans un sens coûte des jetons ; se tromper dans l'autre prive
   BIA des formulations de Lamine. On penche donc légèrement vers le trop :
   on regarde la question ET les derniers échanges, pour qu'un « et si je
   pars ? » posé trois messages plus loin reste dans le sujet. */
const MOTS = [
  // français — le couple et la famille
  "couple", "mari", "epoux", "epouse", "femme", "mariage", "marier", "fiance",
  "fiancee", "copain", "copine", "amoureux", "amoureuse", "amour", "aimer",
  "relation", "rupture", "separation", "separer", "divorce", "divorcer",
  "belle-mere", "belle-famille", "beau-pere", "belle-soeur", "coepouse",
  "polygamie", "polygame", "dot", "sunugaal",
  // français — ce qui abîme
  "jaloux", "jalouse", "jalousie", "tromper", "trompee", "trompe", "infidele",
  "infidelite", "dispute", "disputer", "xuloo", "mentir", "menti", "mensonge",
  "surveiller", "controle", "controler", "fouiller", "harcele", "harcelement",
  "violence", "frapper", "frappe", "menace", "menacer", "forcer", "chantage",
  // français — autour
  "fidelite", "confiance", "pardon", "pardonner", "trahison", "trahir",
  "amitie", "ami", "amie", "coparentalite", "grossesse", "enceinte",
  // wolof
  "jekker", "jabar", "soxna", "sey", "takk", "wujj", "goro", "njaboot",
  "xarit", "mbokk", "doom", "yaay", "baay", "ker", "diggante",
];

const normaliser = (t: string) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, " ");

/* ── LE TROU QUE LA LISTE DE MOTS NE VOYAIT PAS ─────────────────────────────

   Trouvé le 19 septembre 2026 en éprouvant le tri, sur cette phrase :

       « il m'a frappée hier soir »   →   AUCUNE détection.

   La liste contient « frapper » et « frappe ». Elle ne contient pas
   « frappée ». Un mot entier comparé à un mot entier ne pardonne pas une
   lettre, et c'est justement dans les situations dangereuses que la phrase
   arrive au féminin, au passé, écrite vite.

   CE QUI N'ÉTAIT PAS EN DANGER, ET IL FAUT LE DIRE : le plancher de sécurité
   (SOCLE_RELATIONS, plus haut) part à TOUS les tours, sans dépendre d'aucune
   détection. Elle savait donc quoi faire. Ce qu'elle perdait, ce sont les
   formulations de Lamine en wolof pour le dire — et sur ce sujet-là, la
   formulation n'est pas un ornement.

   ── POURQUOI ON PEUT SE PERMETTRE DE PENCHER VERS LE TROP MAINTENANT ───────

   Avant, une détection en trop coûtait seize mille sept cents signes. Depuis
   le tri, elle en coûte deux mille trois cents. Le calcul qui justifiait la
   prudence a changé de sens : on élargit.

   On ne le fait que sur des RACINES, et seulement là où manquer coûte cher. */
const RACINES = [
  "frapp", "battu", "cogn", "gifl", "viol", "menac", "harcel", "forc",
  "chantag", "danger", "securit", "urgence", "secours",
  "divorc", "separ", "tromp", "jalou", "polygam", "belle-", "mari",
];

/* Les mots qui commencent pareil et ne parlent pas de ça. Liste courte et
   honnête : ce sont ceux que j'ai trouvés en lisant les racines à voix
   haute, pas une garantie d'exhaustivité. Un faux positif de plus coûte
   aujourd'hui deux mille trois cents signes — pas seize mille sept cents. */
const FAUX_AMIS = new Set([
  "violon", "violoniste", "violet", "violette", "violine",
  "marine", "marin", "marinade", "mariner", "marinier", "marigot",
  "cognac", "cogner-la-porte", "force", "forces", "forceps",
  "separateur", "divorce-express",
]);

/** Le sujet touche-t-il aux relations ? */
export function estSujetRelation(question: string, historique: string[] = []): boolean {
  // Les trois derniers échanges suffisent : au-delà, le sujet a changé.
  const texte = normaliser([question, ...historique.slice(-6)].join(" "));
  const mots = new Set(texte.split(" ").filter(Boolean));
  if (MOTS.some((m) => (m.includes("-") ? texte.includes(m) : mots.has(m)))) return true;
  /* Une racine se cherche en TÊTE de mot, jamais au milieu, et le mot ne doit
     pas être beaucoup plus long qu'elle — sinon « séparateur » passerait pour
     « séparer ». Ça ne suffit pas à tout attraper : d'où FAUX_AMIS. */
  return [...mots].some(
    (m) => !FAUX_AMIS.has(m) && RACINES.some((r) => m.startsWith(r) && m.length <= r.length + 4),
  );
}

/** Le bloc à ajouter à la consigne, base ENTIÈRE comprise.
 *
 *  Gardé comme repère de comparaison, et comme filet : `consigneRelationsProches`
 *  y revient quand elle ne reconnaît aucune situation. Ne plus l'appeler
 *  directement — c'est lui qui a coûté 4 176 jetons par tour où il partait. */
export async function consigneRelations(): Promise<string> {
  const base = await savoirRelations();
  if (!base) return "";
  return `${PREAMBULE}

${base}
═══ fin de ce que tu sais des relations ═══`;
}

const PREAMBULE = `\n\n═══ CE QUE TU SAIS DES RELATIONS AU SÉNÉGAL ═══
Ces formulations ont été écrites et validées par Lamine, en wolof de Dakar.
Sur cette langue, elles font autorité contre ton propre wolof.

Prends UNE seule réponse, celle qui convient à ce qu'on vient de te dire —
jamais deux, jamais la liste. Adapte-la aux mots de la personne et à son
genre. Puis, au plus, une seule question de relance. Si aucune situation ne
correspond vraiment, garde le ton, la brièveté et la retenue, et réponds avec
ta tête plutôt que de forcer une réponse voisine.`;

/* ── LE BLOC LE PLUS LOURD DE LA CONSIGNE, ET CE QU'ON EN FAIT ──────────────

   Mesuré en production le 19 septembre 2026, sur la page d'état :

       CE QUE TU SAIS DES RELATIONS AU SÉNÉGAL
       2 386 signes par tour en moyenne … mais 16 704 QUAND IL PART,
       et il part sur 14 % des tours.

   Seize mille sept cents signes, c'est quatre mille cent soixante-seize
   jetons, plein tarif, pour répondre à UNE situation. Les soixante-neuf
   autres sont payées pour rien, et pire : elles diluent son attention sur
   celle qui comptait.

   ── POURQUOI ON NE LE MET PAS EN CACHE, CONTRE CE QUE J'AI DIT D'ABORD ─────

   Ma première idée était de le pousser dans le socle. J'ai fait le calcul
   après l'avoir dite, et elle était fausse. En jetons par tour :

       aujourd'hui, plein tarif   4 176 × 14 %                    ≈  585
       poussé dans le socle       4 176 × 0,1  +  4 176 × 2 / 20  ≈  836

   Un cache se paie à l'écriture et se relit à chaque tour. Il n'est rentable
   que pour ce qui part à TOUS les tours — c'est le cas du socle, c'est le cas
   des règles du répertoire. Un bloc qui ne part qu'une fois sur sept coûte
   PLUS CHER en cache qu'en plein tarif. Le mettre en cache l'aurait aggravé
   de moitié.

   ── DONC ON FAIT CE QU'ON A FAIT POUR LE RÉPERTOIRE ────────────────────────

   On ne l'allège pas, on le TRIE. La base est faite de soixante-dix
   situations bien séparées, chacune sous son intitulé en gras. On envoie
   celles que la question désigne, et pas les autres.

   ── ET LE FILET EST SOUS LE VRAI TROU ──────────────────────────────────────

   Le défaut possible n'est pas « trop de situations » : c'est UNE question
   sur les relations à laquelle aucune situation ne ressemble par les mots.
   Avant, c'était impossible — on envoyait tout. Donc : si le tri par les mots
   ne trouve rien, on complète par le SON (le wolof revient écorché de
   l'oreille, et un mot écorché n'est plus le même mot) ; et si le son ne
   trouve rien non plus, ON RENVOIE LA BASE ENTIÈRE, comme avant. On ne peut
   pas faire pire qu'avant, et le compteur `replis_base_entiere` dira
   combien de fois ça arrive vraiment. */

/** Une situation de la base : son intitulé, sa section, son texte entier. */
type Situation = { section: string; titre: string; texte: string; mots: Set<string> };

const RIEN_QUI_DESIGNE = new Set([
  "que", "qui", "quoi", "est", "les", "des", "une", "aux", "pour", "avec",
  "dans", "sur", "pas", "plus", "tout", "tous", "elle", "son", "sa", "ses",
  "mon", "ma", "mes", "ton", "ta", "tes", "leur", "cette", "comment", "quel",
  "quelle", "fait", "faire", "dit", "dire", "peux", "peut", "veux", "veut",
  "sais", "sait", "suis", "etre", "avoir", "relance", "personne",
  /* Wolof : les outils grammaticaux. Relevés dans ses propres formulations,
     pas inventés par moi. */
  "nga", "naa", "laa", "ngi", "ndax", "ak", "bi", "ba", "yi", "mi", "moo",
  "mooy", "lan", "ana", "am", "na", "la", "ko", "man", "yow", "bul", "rekk",
  "gen", "goo", "soo", "sama",
]);

const motsDesignants = (t: string) =>
  normaliser(t).split(" ").filter((m) => m.length >= 3 && !RIEN_QUI_DESIGNE.has(m));

let situations: Situation[] | null = null;
let ouApparait: Map<string, number> | null = null;

/** Découpe la base en situations. Fait une fois, puis gardé. */
async function lesSituations(): Promise<Situation[]> {
  if (situations) return situations;
  const base = await savoirRelations();
  const liste: Situation[] = [];
  for (const bloc of base.split(/\n(?=## )/)) {
    const section = (bloc.split("\n")[0] || "").replace(/^#+\s*/, "").trim();
    /* « Règles générales pour BIA » n'a aucun intitulé en gras : elle ne
       produit donc aucune situation, et c'est voulu. Ce texte-là dit déjà
       mot pour mot ce que SOCLE_RELATIONS dit à TOUS les tours — l'envoyer
       une seconde fois ne lui apprenait rien. */
    for (const part of bloc.split(/\n(?=\*\*)/).slice(1)) {
      const texte = part.trim();
      if (!texte) continue;
      const titre = (texte.split("\n")[0] || "").replace(/\*\*/g, "").trim();
      liste.push({ section, titre, texte, mots: new Set(motsDesignants(texte)) });
    }
  }
  situations = liste;
  ouApparait = new Map();
  for (const s of liste) for (const m of s.mots) ouApparait.set(m, (ouApparait.get(m) || 0) + 1);
  return situations;
}

/** Combien de situations on propose, au plus. */
export const SITUATIONS_AU_PLUS = 8;

const compte = { fois: 0, situations: 0, replis: 0, signes: 0 };

/** Ce que le tri a donné. Lu sur /api/etat — c'est lui qui dira si j'ai eu
    raison, et non ce que j'écris ici. */
export function resumeRelations() {
  if (!compte.fois) return null;
  return {
    fois_charge: compte.fois,
    situations_moyennes: Number((compte.situations / compte.fois).toFixed(1)),
    replis_base_entiere: compte.replis,
    signes_moyens: Math.round(compte.signes / compte.fois),
    /* Ce que ça pesait avant le tri, pour que la comparaison soit lisible. */
    signes_avant_le_tri: 16704,
  };
}

/** Les suites de trois lettres — deux mots qui se ressemblent en partagent
    beaucoup, même si l'oreille en a mangé une. */
function troisParTrois(t: string): Set<string> {
  const s = new Set<string>();
  const x = String(t || "").replace(/\s+/g, " ").trim();
  for (let i = 0; i + 3 <= x.length; i++) s.add(x.slice(i, i + 3));
  return s;
}

/**
 * Le bloc des relations, réduit aux situations que la question désigne.
 *
 * `historique` sert comme dans `estSujetRelation` : un « et si je pars ? »
 * trois messages après « mon mari » parle encore de son mari.
 */
export async function consigneRelationsProches(question: string, historique: string[] = []): Promise<string> {
  const toutes = await lesSituations();
  if (!toutes.length) return await consigneRelations();

  const texteDit = [question, ...historique.slice(-4)].join(" ");
  const mots = new Set(motsDesignants(texteDit));

  const notes: Array<{ s: Situation; note: number }> = [];
  for (const s of toutes) {
    let note = 0;
    for (const m of mots) {
      if (!s.mots.has(m)) continue;
      const repandu = ouApparait?.get(m) || 1;
      /* Plus le mot est rare dans la base, plus il désigne. */
      note += Math.log(1 + toutes.length / repandu);
    }
    if (note > 0) notes.push({ s, note });
  }
  notes.sort((a, b) => b.note - a.note);
  const gardees = notes.slice(0, SITUATIONS_AU_PLUS).map((n) => n.s);

  /* ── LES VOISINES DE LA MÊME SECTION, QUAND LE TRI EST TROP MAIGRE ───────

     « mon mari me trompe » ne désigne par les mots que deux situations sur
     les cinq de « Fidélité et trahison ». Les trois autres parlent pourtant
     exactement de ça — elles ne partagent simplement pas ses mots. Lamine a
     rangé sa base par sujet : quand une section est désignée, ses cinq
     situations le sont. Elles tiennent en mille signes, et c'est la
     différence entre une réponse juste et une réponse voisine. */
  if (gardees.length && gardees.length < SITUATIONS_AU_PLUS) {
    const deja = new Set(gardees.map((s) => s.titre));
    const sections = [...new Set(gardees.map((s) => s.section))];
    for (const sec of sections) {
      for (const s of toutes) {
        if (gardees.length >= SITUATIONS_AU_PLUS) break;
        if (s.section !== sec || deja.has(s.titre)) continue;
        gardees.push(s);
        deja.add(s.titre);
      }
    }
  }

  /* Le son complète les places libres : le wolof revient écorché de l'oreille
     et « jekker » entendu « yekker » ne se retrouve plus par les mots. */
  if (gardees.length < SITUATIONS_AU_PLUS) {
    const deja = new Set(gardees.map((s) => s.titre));
    const dit = troisParTrois(normaliser(texteDit));
    if (dit.size) {
      const parLeSon: Array<{ s: Situation; note: number }> = [];
      for (const s of toutes) {
        if (deja.has(s.titre)) continue;
        const sien = troisParTrois(normaliser(s.titre));
        if (!sien.size) continue;
        let communs = 0;
        for (const t of sien) if (dit.has(t)) communs++;
        const part = communs / sien.size;
        if (part >= 0.5) parLeSon.push({ s, note: part });
      }
      parLeSon.sort((a, b) => b.note - a.note);
      for (const p of parLeSon) {
        if (gardees.length >= SITUATIONS_AU_PLUS) break;
        gardees.push(p.s);
      }
    }
  }

  compte.fois += 1;

  /* Rien reconnu : on refait exactement ce qu'on faisait avant. Un tri qui
     prive BIA de ses formulations coûte la réponse ; un repli coûte des
     jetons. Le compteur dira lequel arrive, et à quelle fréquence. */
  if (!gardees.length) {
    compte.replis += 1;
    const tout = await consigneRelations();
    compte.signes += tout.length;
    return tout;
  }

  const corps = gardees
    .map((s) => `— ${s.section}\n${s.texte}`)
    .join("\n\n");
  const bloc = `${PREAMBULE}

${corps}
═══ fin de ce que tu sais des relations ═══`;
  compte.situations += gardees.length;
  compte.signes += bloc.length;
  return bloc;
}

export function oublierLesRelations(): void {
  compte.fois = 0;
  compte.situations = 0;
  compte.replis = 0;
  compte.signes = 0;
}
