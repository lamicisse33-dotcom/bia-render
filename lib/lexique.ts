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

const normaliser = (s: string) => String(s || "").toLowerCase()
  .replace(/[’']/g, "'").replace(/[.,!?;:()«»"…]/g, " ").replace(/\s+/g, " ").trim();

const motsUtiles = (t: string) => new Set(normaliser(t).split(" ").filter((m) => m.length > 2));

/** Correction exacte de la même phrase : elle fait autorité, on la sert telle quelle. */
export async function correctionExacte(texte: string): Promise<Entree | null> {
  const cle = normaliser(texte);
  return (await toutes()).find((e) => normaliser(e.source) === cle) || null;
}

/** Les corrections les plus proches, à montrer au modèle comme exemples. */
export async function exemplesPour(texte: string, max = 8): Promise<Entree[]> {
  const entrees = await toutes();
  if (!entrees.length) return [];
  const mots = motsUtiles(texte);
  if (!mots.size) return entrees.slice(0, Math.min(3, max));

  return entrees
    .map((e) => {
      const siens = motsUtiles(e.source);
      let communs = 0;
      for (const m of mots) if (siens.has(m)) communs += 1;
      return { e, score: communs };
    })
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((n) => n.e);
}

export async function combien(): Promise<number> {
  return (await toutes()).length;
}
