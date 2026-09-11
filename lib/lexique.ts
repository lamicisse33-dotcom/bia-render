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
  /* Ajoutés le 11 septembre 2026, trouvés par l'épreuve : « Et toi ? » passait
     pour une question qui se suffit à elle-même, parce que « toi » manquait à
     cette liste — et on aurait resservi la réponse d'une autre conversation. */
  "toi","moi","soi","eux","oui","non","ouais","hein","voila","voilà","ok","dac",
]);

const motsUtiles = (t: string) =>
  new Set(normaliser(t).split(" ").filter((m) => m.length > 2 && !OUTILS.has(m)));

/* ── UNE QUESTION SE SUFFIT-ELLE À ELLE-MÊME ? ──────────────────────────────

   « Comment se passe ta journée ? » veut dire la même chose pour tout le
   monde, à n'importe quel moment. « Et ça ? », « Pourquoi ? », « Combien ? »
   ne veulent rien dire sans ce qui précède.

   La différence tient en un mot : les secondes n'ont que des mots-outils —
   des pronoms, des interrogatifs, des liaisons. Dès qu'il reste un mot PLEIN,
   la question porte son propre sujet.

   C'est ce qui décide si l'on peut resservir une réponse corrigée telle
   quelle : sur « comment se passe ta journée » oui, sur « pourquoi ? » jamais,
   parce que la réponse d'hier parlait d'autre chose. */
export const seSuffitAElleMeme = (texte: string) => motsUtiles(texte).size > 0;

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

/* Combien de corrections viennent de CHAQUE application.

   Le total seul ne prouvait rien : la table est partagée entre BIA, BIBA et
   l'Interprète, et trente corrections pouvaient très bien venir toutes de
   l'Interprète pendant que celles de BIA se perdaient en silence. Demandé
   par Lamine le 10 septembre 2026 : « vérifie si les corrections de BIA sont
   bien enregistrées. » Maintenant ça se lit dans /api/etat. */
export async function combienParApplication(): Promise<Record<string, number>> {
  const compte: Record<string, number> = {};
  for (const e of await toutes()) {
    const qui = String(e.application || "sans origine");
    compte[qui] = (compte[qui] || 0) + 1;
  }
  return compte;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LES MOTS CORRIGÉS — CE QUI MANQUAIT VRAIMENT
   ═══════════════════════════════════════════════════════════════════════════

   Signalé par Lamine le 11 septembre 2026 : « on dirait que les corrections
   elle ne les utilise pas. Elle répète les mêmes mots avec les mêmes fautes.
   J'ai corrigé plusieurs fois, et chaque fois qu'elle doit le dire, elle le
   dit de l'autre manière. »

   IL AVAIT RAISON, ET VOICI POURQUOI. Une correction était rangée sous la
   QUESTION qui l'avait produite, et ressortie seulement quand on reposait une
   question qui lui ressemblait — deux mots pleins en commun au minimum. Or
   quand on corrige un MOT, ce mot revient dans des phrases entièrement
   différentes : on demande le prix du riz aujourd'hui, la semaine prochaine
   on parle d'un mariage, et le même mot mal dit revient. La correction, elle,
   dormait, attachée à une question qu'on ne reposera jamais.

   Autrement dit : on avait rangé de la LANGUE dans une boîte à RÉPONSES.

   CE QU'ON FAIT MAINTENANT. On compare ce que BIA avait dit et ce que la
   personne a écrit à la place, et on en tire les mots qui ont changé. « Elle
   dit ceci, on dit cela » : ça, ce n'est plus attaché à une question, ça vaut
   dans toutes ses phrases, pour toujours. C'est ce qu'un correcteur croit
   faire quand il corrige un mot, et c'est ce qui se passe enfin.

   ON RESTE PRUDENT. Seuls les remplacements COURTS sont retenus — trois mots
   au plus de chaque côté. Quand quelqu'un réécrit une phrase entière, la
   comparaison ne donne rien de sûr : on préfère ne rien apprendre plutôt
   qu'apprendre de travers. Et un mot corrigé plusieurs fois passe devant les
   autres : c'est celui qui gêne le plus. */

export type MotCorrige = { faux: string; juste: string; fois: number };

/* On garde les mots tels qu'ils s'écrivent — accents et lettres wolof
   comprises — et on ne coupe que sur la ponctuation et les espaces. */
const decouperMots = (t: string) =>
  String(t || "")
    .replace(/[.,;:!?«»"()\[\]…]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/* La plus longue sous-suite commune, en table. Deux phrases d'une centaine de
   mots au plus : la table tient sans peine, et c'est la seule façon d'aligner
   deux versions sans se fier à l'ordre des mots. */
function alignement(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length, m = b.length;
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const bas = (x: string) => x.toLowerCase();
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i][j] = bas(a[i]) === bas(b[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  const paires: Array<[number, number]> = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (bas(a[i]) === bas(b[j])) { paires.push([i, j]); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) i++;
    else j++;
  }
  return paires;
}

/** Les remplacements courts entre ce qu'elle a dit et ce qu'on a écrit. */
function remplacements(dit: string, voulu: string): Array<{ faux: string; juste: string }> {
  const a = decouperMots(dit), b = decouperMots(voulu);
  /* Une phrase très longue des deux côtés, c'est une réécriture complète :
     on n'en tire aucune règle de vocabulaire fiable. */
  if (!a.length || !b.length || a.length > 120 || b.length > 120) return [];

  const communs = alignement(a, b);
  const sortie: Array<{ faux: string; juste: string }> = [];
  let i = 0, j = 0;
  const bloc = (finA: number, finB: number) => {
    const gauche = a.slice(i, finA), droite = b.slice(j, finB);
    // Un ajout pur ou une suppression pure n'apprend pas comment DIRE un mot.
    if (!gauche.length || !droite.length) return;
    if (gauche.length > 3 || droite.length > 3) return;
    const faux = gauche.join(" "), juste = droite.join(" ");
    if (faux.toLowerCase() === juste.toLowerCase()) return;
    // Des chiffres seuls changent d'une phrase à l'autre : ce n'est pas de la langue.
    if (/^[\d\s.,%-]+$/.test(faux) || /^[\d\s.,%-]+$/.test(juste)) return;
    sortie.push({ faux, juste });
  };
  for (const [ia, jb] of communs) { bloc(ia, jb); i = ia + 1; j = jb + 1; }
  bloc(a.length, b.length);
  return sortie;
}

/**
 * Ce que les locuteurs ont corrigé dans SA FAÇON DE DIRE, indépendamment de
 * la question. Le plus souvent corrigé vient en premier.
 */
export async function motsCorriges(max = 40): Promise<MotCorrige[]> {
  const compte = new Map<string, MotCorrige>();
  for (const e of await toutes()) {
    if (!e.proposee || !e.corrigee) continue;
    for (const r of remplacements(e.proposee, e.corrigee)) {
      const cle = `${r.faux.toLowerCase()}→${r.juste.toLowerCase()}`;
      const deja = compte.get(cle);
      if (deja) deja.fois += 1;
      else compte.set(cle, { faux: r.faux, juste: r.juste, fois: 1 });
    }
  }
  return [...compte.values()]
    .sort((x, y) => y.fois - x.fois || x.faux.length - y.faux.length)
    .slice(0, max);
}
