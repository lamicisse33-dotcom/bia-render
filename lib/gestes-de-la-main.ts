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

export type Geste = "salut" | "aurevoir" | "coeur" | "bouche_etonne" | "bouche_grosmot" | "paume";

export const GESTES_DU_REPERTOIRE: Record<string, Geste> = {
  /* elle accueille */
  salut: "salut", bonsoir: "salut", "ca-va": "salut", "la-famille": "salut",
  bienvenue: "salut", "quoi-de-neuf": "salut",
  /* la main sur le cœur : merci, pardon, sincérité */
  merci: "coeur", "de-rien": "coeur", pardon: "coeur", alhamdoulilah: "coeur",
  "kha-et-lamine": "coeur",
  /* elle prend congé */
  "au-revoir": "aurevoir", "bonne-nuit": "aurevoir", "bonne-journee": "aurevoir", "a-demain": "aurevoir",
  /* un instant */
  attends: "paume",
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
