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

/** Le sujet touche-t-il aux relations ? */
export function estSujetRelation(question: string, historique: string[] = []): boolean {
  // Les trois derniers échanges suffisent : au-delà, le sujet a changé.
  const texte = normaliser([question, ...historique.slice(-6)].join(" "));
  const mots = new Set(texte.split(" ").filter(Boolean));
  return MOTS.some((m) => (m.includes("-") ? texte.includes(m) : mots.has(m)));
}

/** Le bloc à ajouter à la consigne, base comprise. */
export async function consigneRelations(): Promise<string> {
  const base = await savoirRelations();
  if (!base) return "";
  return `\n\n═══ CE QUE TU SAIS DES RELATIONS AU SÉNÉGAL ═══
Ces formulations ont été écrites et validées par Lamine, en wolof de Dakar.
Sur cette langue, elles font autorité contre ton propre wolof.

Prends UNE seule réponse, celle qui convient à ce qu'on vient de te dire —
jamais deux, jamais la liste. Adapte-la aux mots de la personne et à son
genre. Puis, au plus, une seule question de relance. Si aucune situation ne
correspond vraiment, garde le ton, la brièveté et la retenue, et réponds avec
ta tête plutôt que de forcer une réponse voisine.

${base}
═══ fin de ce que tu sais des relations ═══`;
}
