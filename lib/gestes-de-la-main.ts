/* ── QUEL GESTE VA AVEC QUELLE PHRASE ───────────────────────────────────────

   19 septembre 2026. Lamine : « je veux qu'il y ait des gestes de
   salutation avec la main. La main sur le cœur, la main sur la bouche,
   étonnement, quand quelqu'un dit un gros mot. »

   Les mains vivent sur public/bia-mains-24.webp (six gestes de quatre
   images). Elles ne peuvent bouger que quand la bouche ne parle pas — la
   bouche prend tout le visage pendant la voix. Donc : le geste vient JUSTE
   APRÈS la phrase, pas pendant. Elle dit « salaam », puis elle fait signe.

   Ce fichier ne contient que des correspondances. Les clés sont celles du
   répertoire (lib/repertoire-textes.ts) ; les gestes sont ceux de CYCLES
   dans app/page.tsx. C'est à Lamine de dire quelle phrase mérite quel geste
   — ce tableau est un premier jet, à corriger par lui. */

export type Geste = "salut" | "aurevoir" | "coeur" | "bouche_etonne" | "bouche_grosmot" | "paume"
  | "coeur_double" | "bisou" | "rire_main"
  /* 26 septembre 2026 : mains jointes et compter, tenue "nouvelle"
     seulement — voir CASES_DE_LA_QUATRIEME_PLANCHE dans page.tsx. Sur
     classique/wax, la garde côté page.tsx les ignore plutôt que
     d'afficher une case vide. */
  | "priere" | "compter";

/* 25 septembre 2026 : trois gestes de plus, livrés dans BIA-96-images-v2
   (huit images chacun, tenue wax seulement pour l'instant — voir
   lib/tenue.ts). Lamine : « elle doit rester joviale, agréable, visage
   souriant » — coeur_double et bisou remplacent le simple coeur/aurevoir
   aux moments les PLUS chaleureux ; le geste du quotidien (merci, au
   revoir en pleine journée) garde le geste simple. */
export const GESTES_DU_REPERTOIRE: Record<string, Geste> = {
  /* elle accueille */
  salut: "salut", bonsoir: "salut", "ca-va": "salut", "la-famille": "salut",
  bienvenue: "salut", "quoi-de-neuf": "salut",
  /* la main sur le cœur : merci, pardon — le geste simple, quotidien */
  merci: "coeur", "de-rien": "coeur", pardon: "coeur",
  /* le cœur à deux mains : gratitude et affection les plus fortes */
  alhamdoulilah: "coeur_double", "kha-et-lamine": "coeur_double",
  /* elle prend congé, au revoir simple en pleine journée */
  "au-revoir": "aurevoir", "bonne-journee": "aurevoir",
  /* les adieux les plus tendres : un bisou soufflé */
  "bonne-nuit": "bisou", "a-demain": "bisou",
  /* un instant */
  attends: "paume",
  /* mains jointes : "inchallah" existait déjà dans le répertoire
     (lib/base-textes.ts) sans geste associé — c'est le moment naturel */
  inchallah: "priere",
};

export function gesteDe(cle: string): Geste | "" {
  return GESTES_DU_REPERTOIRE[cle] || "";
}

/* ── LES GROS MOTS ─────────────────────────────────────────────────────────
   La main sur la bouche, dès que la personne en dit un — avant même la
   réponse. La liste est à Lamine (wolof et français) ; je ne l'écris pas.
   Vide, la détection ne se déclenche jamais. */
export const GROS_MOTS: string[] = [];

const sansAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function contientUnGrosMot(texte: string): boolean {
  if (!GROS_MOTS.length) return false;
  const mots = new Set(sansAccents(texte).split(/[^a-zñŋ']+/i).filter(Boolean));
  return GROS_MOTS.some((g) => mots.has(sansAccents(g)));
}
