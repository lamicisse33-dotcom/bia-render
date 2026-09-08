/* Mémoire linguistique de BIA — reprise du principe de l'Interprète.
   Chaque correction d'un locuteur natif est gardée, puis remontée au modèle
   comme exemple faisant autorité. C'est ce qui fait grandir le wolof avec
   l'usage, au lieu de le laisser figé.

   Rangement : Supabase (projet khalam-classement) si configuré ; sinon la
   mémoire vive, qui disparaît au réveil du serveur — utile en local, pas en
   production. L'état est visible dans /api/etat. */

const env = process.env;

export const lexiqueConfig = {
  url: (env.SUPABASE_URL || "").replace(/\/$/, ""),
  cle: env.SUPABASE_SERVICE_KEY || "",
  // Une seule table pour BIA, BIBA et l'Interprète : une correction faite
  // dans l'une profite aux trois. C'est de la langue, pas de la marque.
  table: env.SUPABASE_TABLE_LEXIQUE || "khalam_lexique",
  application: env.KHALAM_APP || "bia",
  get actif() { return Boolean(this.url && this.cle); },
};

export type Entree = {
  source: string;
  corrigee: string;
  proposee?: string | null;
  langue?: string | null;
  auteur?: string | null;
  application?: string | null;
};

const enMemoire: Entree[] = [];
let cache: { valeurs: Entree[]; jusqua: number } | null = null;

function entetes() {
  return {
    apikey: lexiqueConfig.cle,
    Authorization: `Bearer ${lexiqueConfig.cle}`,
    "content-type": "application/json",
  };
}

export async function ajouterCorrection(e: Entree): Promise<number> {
  cache = null;
  if (!lexiqueConfig.actif) { enMemoire.push(e); return enMemoire.length; }

  const r = await fetch(`${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}`, {
    method: "POST",
    headers: { ...entetes(), Prefer: "return=minimal" },
    body: JSON.stringify([{
      source: e.source, corrigee: e.corrigee,
      proposee: e.proposee || null, langue: e.langue || null, auteur: e.auteur || null,
      // D'où vient la correction. On les LIT toutes, quelle que soit
      // l'application : c'est tout l'intérêt du partage. Ce champ sert à
      // savoir plus tard laquelle fait le plus progresser le wolof.
      application: e.application || lexiqueConfig.application,
    }]),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} : ${(await r.text()).slice(0, 300)}`);
  return -1; // le total n'est pas renvoyé en mode minimal
}

async function toutes(): Promise<Entree[]> {
  if (cache && Date.now() < cache.jusqua) return cache.valeurs;
  if (!lexiqueConfig.actif) return enMemoire;

  const r = await fetch(
    `${lexiqueConfig.url}/rest/v1/${lexiqueConfig.table}?select=source,corrigee,langue,application&order=id.desc&limit=800`,
    { headers: entetes() },
  );
  if (!r.ok) return cache?.valeurs || [];
  const valeurs = await r.json() as Entree[];
  // Une minute de cache : sans ça, chaque question rappelle Supabase et
  // ajoute un aller-retour au délai de réponse, pour un lexique qui ne
  // change que lorsqu'un testeur corrige.
  cache = { valeurs, jusqua: Date.now() + 60_000 };
  return valeurs;
}

const normaliser = (s: string)=> String(s || "").toLowerCase()
  .replace(/[\u2019']/g, "'").replace(/[.,!?;:()«»"\u2026]/g, " ").replace(/\s+/g, " ").trim();

/* Les mots qui ne disent rien du SUJET d'une phrase.

   Sans ce filtre, « sama », « naka », « bëgg », « comment », « pour » liaient
   entre elles des questions qui n'ont rien à voir : n'importe quelle phrase
   wolof partage deux ou trois de ces mots avec n'importe quelle autre. Le
   modèle recevait alors huit « corrections faisant autorité » sans rapport
   avec la question posée — et les recopiait. C'est la mécanique qui faisait
   réciter BIA. */
const OUTILS = new Set([
  // wolof — pronoms, copules, marqueurs, prépositions, liaisons
  "maa","mangi","maangi","naa","nga","ngeen","yaa","yow","moom","noo","nu","ñu","ñungi","ñoom","yeen",
  "mooy","moo","lañu","lañ","laa","nañu","dafa","dafay","dama","damay","dinaa","dina","dinañu","doon",
  "naan","wara","war","mën","menn","ndax","ndaxte","walla","waaye","itam","rekk","kay","waay","noppi",
  "ci","ak","ak","te","bala","ginnaaw","fii","foofu","bi","yi","bu","gi","mi","ji","ki","sama","sa",
  "lan","lu","kan","ku","fan","fu","kañ","ana","naka","ñaata","naata","lépp","lepp","yépp","bépp",
  "waaw","déedéet","deedeet","léegi","leegi","tey","man",
  // français — outils grammaticaux et interrogatifs
  "le","la","les","de","des","du","un","une","et","est","sont","etait","était","je","tu","il","elle",
  "nous","vous","ils","elles","on","que","qui","quoi","pour","avec","dans","sur","sous","chez","pas",
  "mais","donc","alors","aussi","tres","très","plus","moins","combien","pourquoi","comment","quand",
  "ou","où","quel","quelle","ce","cette","ces","mon","ma","mes","ton","votre","vos","leur","au","aux",
  "en","se","me","te","lui","nos","notre","son","sa","ses","par","si","bien","comme","tout","tous",
  "cela","etre","être","avoir","fait","faire","peux","peut","veux","veut","dire","dis",
]);

const motsUtiles = (t: string) =>
  new Set(normaliser(t).split(" ").filter((m) => m.length > 2 && !OUTILS.has(m)));

/** Correction exacte de la même phrase : elle fait autorité, on la sert telle quelle. */
export async function correctionExacte(texte: string): Promise<Entree | null> {
  const cle = normaliser(texte);
  return (await toutes()).find((e) => normaliser(e.source) === cle) || null;
}

/* Deux phrases se ressemblent si elles partagent l'essentiel de leurs mots
   pleins, pas un seul. On mesure donc la part commune des deux vocabulaires
   (Jaccard) et on exige un vrai recouvrement. Mieux vaut n'envoyer aucun
   exemple qu'un exemple hors sujet : sans exemple, BIA réfléchit ; avec un
   exemple hors sujet, elle récite. */
const SEUIL = 0.34;

/** Les corrections vraiment proches, à montrer au modèle comme exemples de style. */
export async function exemplesPour(texte: string, max = 5): Promise<Entree[]> {
  const entrees = await toutes();
  if (!entrees.length) return [];

  const mots = motsUtiles(texte);
  // Une question sans mot plein (« naka ? », « waaw ») n'a rien à rapprocher.
  if (!mots.size) return [];

  return entrees
    .map((e) => {
      const siens = motsUtiles(e.source);
      if (!siens.size) return { e, score: 0, communs: 0 };
      let communs = 0;
      for (const m of mots) if (siens.has(m)) communs += 1;
      const union = mots.size + siens.size - communs;
      return { e, score: union ? communs / union : 0, communs };
    })
    // Deux mots pleins en commun au minimum — sauf pour une question d'un
    // seul mot plein, où ce mot EST le sujet et suffit s'il est bien le sien.
    .filter((n) => n.score >= SEUIL && (n.communs >= 2 || mots.size === 1))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((n) => n.e);
}

export async function combien(): Promise<number> {
  return (await toutes()).length;
}
