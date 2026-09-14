/* ── CE QUI ARRIVE QUAND IL LUI APPREND QUELQUE CHOSE ───────────────────────

   Lamine, le 14 septembre 2026 : « Bia dit qu'elle ne peut pas se souvenir
   des leçons que je lui ai donné car elles ne sont pas dans ses fiches, il
   faut vérifier ça. »

   J'ai vérifié, et voici ce que le rangement dit aujourd'hui :

     lexique_entrees   : 73
     lexique_auteurs   : { "sans auteur": 73 }

   Les soixante-treize lignes sont l'ANCIEN lexique — les corrections du
   bouton « Mal dit », posées avant qu'un auteur existe. La ligne qui écrit
   « maitre-vocal » n'est entrée dans le code qu'hier (602b6cb). Donc : aucune
   de ses leçons à la voix n'est jamais arrivée jusqu'à Supabase. Pas une.

   ── POURQUOI JE NE PEUX PAS DEVINER LAQUELLE DES QUATRE MARCHES A CÉDÉ ─────

   Entre sa phrase et la ligne écrite, il y a quatre marches, et une seule
   suffit à tout perdre :

     1. l'écoute a-t-elle transcrit ce qu'il a dit, ou autre chose ?
     2. la phrase transcrite est-elle reconnue comme un ordre ? La liste est
        FERMÉE et la comparaison EXACTE : « mémorise » tout seul n'y est pas,
        « voilà c'est bon mémorise ça » non plus ;
     3. le téléphone avait-il encore en main la phrase à garder ?
     4. et Supabase a-t-il accepté la ligne ?

   Je n'ai pas sa voix. Je ne peux donc pas essayer moi-même, et tant que rien
   n'est noté, chaque soirée se passe à supposer. On note.

   ── CE QUI EST NOTÉ, ET CE QUI NE L'EST PAS ────────────────────────────────

   On note les QUATRE marches pour chaque tentative, y compris — et surtout —
   celles où l'ordre n'a PAS été reconnu : une phrase de maître qui parle de
   mémoire et qui repart au modèle est exactement le défaut qu'on cherche, et
   c'est le seul cas qui, aujourd'hui, ne laisse aucune trace.

   Rien n'est noté pour un testeur : ce registre ne regarde que le maître.
   Et il vit en mémoire vive, comme les autres compteurs : il s'efface au
   redéploiement, ce qui suffit pour une soirée d'essais.

   CE FICHIER NE CHANGE AUCUN COMPORTEMENT. Il regarde.                     */

export type Tentative = {
  /** Ce qui a été entendu, tel quel — c'est souvent là qu'est la surprise. */
  dit: string;
  /** L'ordre reconnu (« retiens », « apprendre »…), ou null si aucun. */
  ordre: string | null;
  /** La phrase que le téléphone avait encore en main, s'il en avait une. */
  en_main: boolean;
  /** Combien de signes elle faisait — zéro dit « il n'y avait rien ». */
  signes_en_main: number;
  /** Écrit dans le rangement, ou non. */
  ecrit: boolean;
  /** Ce qui a empêché, en clair. */
  motif: string;
  quand: number;
};

const GARDEES = 40;
let tentatives: Tentative[] = [];

export function noterTentative(t: Omit<Tentative, "quand">) {
  tentatives = [...tentatives, {
    dit: String(t.dit || "").slice(0, 160),
    ordre: t.ordre ? String(t.ordre).slice(0, 20) : null,
    en_main: Boolean(t.en_main),
    signes_en_main: Math.max(0, Math.round(t.signes_en_main) || 0),
    ecrit: Boolean(t.ecrit),
    motif: String(t.motif || "").slice(0, 200),
    quand: Date.now(),
  }].slice(-GARDEES);
}

/* ── LES MOTS QUI TRAHISSENT UNE TENTATIVE ──────────────────────────────────

   Des RACINES, pas des mots entiers : « mémorise », « mémoriser »,
   « mémorisé » et « memorize » commencent tous par « memoris ». Le but n'est
   pas de reconnaître un ordre — c'est le travail de lireLOrdre() et il reste
   strict — mais de repérer qu'il a PARLÉ DE MÉMOIRE et que rien ne s'est
   passé. Large exprès : ici, une fausse alerte ne coûte qu'une ligne dans un
   tableau, alors qu'un silence coûte une soirée. */
const RACINES = [
  "memoris", "memorize", "retien", "retenir", "garde ", "gardes ", "garder",
  "apprend", "apprentissage", "oubli", "efface", "supprim", "corrig",
];

/** Est-ce que cette phrase parlait de mémoire, même si aucun ordre n'a été pris ? */
export function parleDeMemoire(texte: string): boolean {
  const dit = String(texte || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
  return RACINES.some((r) => dit.includes(r));
}

export function resumeLecons() {
  if (!tentatives.length) return null;
  const reconnues = tentatives.filter((t) => t.ordre);
  const ecrites = tentatives.filter((t) => t.ecrit);
  /* LA LIGNE QU'IL LIRA EN PREMIER : sur dix tentatives, combien sont
     arrivées au bout. Le reste du tableau explique les autres. */
  return {
    tentatives: tentatives.length,
    reconnues: reconnues.length,
    ecrites: ecrites.length,
    /* CE QUI A CÉDÉ, COMPTÉ. Une phrase de maître qui parle de mémoire et
       qu'aucun ordre n'attrape : c'est la liste fermée qui est trop étroite,
       pas lui qui s'y prend mal. */
    non_reconnues: tentatives.filter((t) => !t.ordre).map((t) => t.dit).slice(-10),
    rien_en_main: tentatives.filter((t) => t.ordre === "retiens" && !t.en_main).length,
    dernieres: tentatives.slice(-12),
  };
}

export function oublierLecons() { tentatives = []; }
