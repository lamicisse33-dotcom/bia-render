/* ── COMPTER, ET COMPTER DE L'ARGENT — DEUX CHOSES DIFFÉRENTES ──────────────

   Lamine, le 12 septembre 2026 :

     « Sur les calculs, en wolof, je vais t'expliquer une chose que tu dois
       comprendre. Quand tu comptes les chiffres, si tu dis 10, c'est 10 en
       wolof = fukk. En argent, quand tu dis 10 F, ce n'est pas 10 F, c'est
       2 dërëm, c'est-à-dire ñaari dërëm. »

     « C'est pour ça que jusqu'à présent, ChatGPT ne peut pas calculer en
       wolof, ni aucune intelligence artificielle actuelle. C'est ce qu'elle
       ne comprend pas. Nous pouvons être les premiers à le réussir. »

   ── CE QUE CE FICHIER EST ─────────────────────────────────────────────────

   Jusqu'ici, les nombres wolof de BIA étaient une LISTE : 68 lignes écrites à
   la main, et tout ce qui n'y figurait pas se disait en français. 37 400 F
   n'était pas dans la liste, donc il se disait « trente-sept mille quatre
   cents ».

   Ce fichier remplace la liste par la RÈGLE. Il compose n'importe quel nombre
   de 0 à 999 999, et n'importe quel montant, à partir des mêmes briques —
   celles de sa table. Ce n'est pas une traduction : c'est son système de
   numération, écrit une fois.

   ── COMMENT ON SAIT QUE C'EST JUSTE ───────────────────────────────────────

   On ne le sait pas parce que je l'affirme. epreuve-wolof-nombres.ts fait
   composer au programme les 63 nombres que Lamine a relus et corrigés de sa
   main, et exige le MOT POUR MOT. Ses lignes sont les vecteurs d'épreuve : si
   la règle écrite ici s'écartait de son wolof, ne serait-ce que d'un « i » de
   liaison, l'épreuve tomberait.

   ── LES QUATRE RÈGLES ─────────────────────────────────────────────────────

   1. LES DIZAINES se bâtissent sur fukk : ñaar-fukk, ñett-fukk… et l'unité
      s'ajoute avec « ak » — fukk ak juróom-ñett, 18.

   2. LE « i » DE LIAISON attache un nombre au mot qu'il compte :
      ñaar + téeméer → ñaari téeméer. Un mot qui finit déjà par « i » ne le
      reprend pas : junni reste junni.

   3. CHAQUE PART GARDE SON JUNNI. C'est sa règle, celle où je m'étais trompé
      le 10 septembre : 15 000 n'est pas « fukk ak juróomi junni » mais
      « fukki junni ak juróomi junni » — dix-mille et cinq-mille, chacun son
      millier.

   4. L'ARGENT SE DIVISE PAR CINQ AVANT D'ÊTRE DIT. Un dërëm vaut cinq
      francs. On ne prononce jamais un montant en francs : on le convertit,
      puis on dit dërëm. Et si le montant n'est pas divisible par cinq, on
      REFUSE de le dire en wolof — parce qu'il n'existe pas en dërëm.

   ── ET LA RÈGLE DE PRUDENCE, QUI NE BOUGE PAS ─────────────────────────────

   Un nombre composé par la règle sort marqué « propose » tant que Lamine ne
   l'a pas entendu ; seuls ceux qu'il a relus sortent « relu ». C'est à
   l'appelant de décider — et pour un PRIX, tant qu'il n'a pas relu la forme,
   on dit le français. Une erreur sur un montant coûte de l'argent à
   quelqu'un : cette phrase est de nous deux et elle tient toujours.        */

import { NOMBRES } from "./nombres-textes";

/* ═══ LES BRIQUES ════════════════════════════════════════════════════════ */

/** 0 à 9, tels qu'il les a écrits. */
export const UNITES = [
  "tus", "benn", "ñaar", "ñett", "ñeent",
  "juróom", "juróom-benn", "juróom-ñaar", "juróom-ñett", "juróom-ñeent",
] as const;

export const DIX = "fukk";
export const CENT = "téeméer";
export const MILLE = "junni";
export const MILLION = "million";
export const DEREM = "dërëm";

/** Cinq francs font un dërëm. Le nombre le plus important du fichier. */
export const FRANCS_PAR_DEREM = 5;

/** Jusqu'où on compose. Au-delà, rien : mieux vaut du français qu'une somme
    inventée à neuf chiffres. */
export const PLAFOND = 999_999_999;

/** Et jusqu'où on est sur SON terrain à lui. En dessous, chaque forme sort
    de règles qu'il a écrites et relues. Au-dessus, le million — le seul mot
    de la liste qui soit emprunté au français, et le seul dont il n'ait donné
    qu'un exemple : « benn million ». Le pluriel (« ñaari million » ?) est
    composé PAR ANALOGIE avec junni, et c'est précisément l'objet de la
    deuxième fiche qu'il doit me renvoyer, celle des « 2 millions ».
    D'ici là, tout ce qui passe ce seuil sort marqué « propose ». */
export const SUR_SON_TERRAIN = 999_999;

/** Le « i » de liaison, posé sur le dernier mot — et jamais deux fois.
    « ñaar » → « ñaari » ;  « juróom-benn » → « juróom-benni » ;
    « junni » → « junni » (il finit déjà par i, la liaison est absorbée). */
export function liaison(mots: string): string {
  const bouts = mots.trim().split(" ");
  const dernier = bouts[bouts.length - 1];
  if (!dernier) return mots;
  bouts[bouts.length - 1] = dernier.endsWith("i") ? dernier : dernier + "i";
  return bouts.join(" ");
}

/* ═══ COMPTER ════════════════════════════════════════════════════════════ */

/** 0 à 99. Les dizaines se bâtissent sur fukk, l'unité s'ajoute avec « ak ». */
function sousCent(n: number): string {
  if (n < 10) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  const dizaine = d === 1 ? DIX : `${UNITES[d]}-${DIX}`;
  return u ? `${dizaine} ak ${UNITES[u]}` : dizaine;
}

/** 0 à 999. Cent seul se dit « téeméer », sans « benn » devant. */
function sousMille(n: number): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (!c) return sousCent(n);
  const centaine = c === 1 ? CENT : `${liaison(UNITES[c])} ${CENT}`;
  return r ? `${centaine} ak ${sousMille(r)}` : centaine;
}

/** Sa règle numéro 3 : chaque part garde son junni.
    15 → « fukk ak juróom » → « fukki junni ak juróomi junni ». */
function enMilliers(m: number): string {
  return sousMille(m)
    .split(" ak ")
    .map((part) => (part === UNITES[1] ? MILLE : `${liaison(part)} ${MILLE}`))
    .join(" ak ");
}

/** Les millions. Sa seule ligne : 1 000 000 → « benn million ». Le million
    GARDE son « benn », là où junni et téeméer le perdent — c'est un mot
    emprunté, il se compte comme une chose. Le reste suit junni par analogie,
    en attendant sa deuxième fiche. */
function enMillions(m: number): string {
  return sousMille(m)
    .split(" ak ")
    .map((part) => (part === UNITES[1] ? `${UNITES[1]} ${MILLION}` : `${liaison(part)} ${MILLION}`))
    .join(" ak ");
}

/** Un entier, en wolof. Rend null au-delà du plafond, ou si ce n'est pas un
    entier — on préfère le français à une somme inventée. */
export function enWolof(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > PLAFOND) return null;
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  if (millions) parts.push(enMillions(millions));
  if (milliers) parts.push(enMilliers(milliers));
  if (reste || !parts.length) parts.push(sousMille(reste));
  return parts.join(" ak ");
}

/* ═══ COMPTER DE L'ARGENT ════════════════════════════════════════════════ */

/** Un montant en francs CFA, dit en dërëm — sa règle numéro 4.

    On divise par cinq AVANT de composer. Et un montant qui n'est pas
    divisible par cinq n'a pas de nom en dërëm : on rend null, et il se dira
    en français. Mieux vaut du français juste qu'un prix wolof approximatif. */
export function enDeremWolof(francs: number): string | null {
  if (!Number.isInteger(francs) || francs <= 0) return null;
  if (francs % FRANCS_PAR_DEREM !== 0) return null;
  const derem = francs / FRANCS_PAR_DEREM;
  /* L'ARGENT RESTE SUR SON TERRAIN. Un montant qui demanderait des MILLIONS
     de dërëm — au-delà de cinq millions de francs — se dirait avec le seul
     mot dont je n'ai qu'un exemple de lui, et sur lequel la liaison elle-même
     est douteuse (« benn million dërëm » ? « benn millioni dërëm » ?). On
     refuse : ce prix-là se dira en français jusqu'à sa deuxième fiche. */
  if (derem > SUR_SON_TERRAIN) return null;
  const dit = enWolof(derem);
  return dit ? `${liaison(dit)} ${DEREM}` : null;
}

/** Et le chemin inverse, pour vérifier : combien de francs vaut ce qu'on
    vient de dire. Sert à l'épreuve, et à ne jamais prononcer un prix sans
    l'avoir recompté. */
export function enFrancs(derem: number): number {
  return derem * FRANCS_PAR_DEREM;
}

/* ═══ LES POURCENTAGES ═══════════════════════════════════════════════════ */

/** « ci téeméer bu nekk » — pour chaque centaine. Sa correction du
    12 septembre, qui a chassé le « pour cent » français du milieu du wolof. */
export const PAR_CENTAINE = "ci téeméer bu nekk";

export function enPourcent(n: number): string | null {
  const dit = enWolof(n);
  return dit ? `${dit} ${PAR_CENTAINE}` : null;
}

/* ═══ LES QUATRE OPÉRATIONS ══════════════════════════════════════════════ */

/** Les mots qu'il a donnés le 12 septembre, à la place de mes mots français. */
export const MOTS_DU_CALCUL = {
  plus: "yokaci",
  moins: "wangici",
  fois: "fulko ak",
  divise: "sédeléko ak",
  donc: "mu don",
} as const;

export type Operation = keyof Omit<typeof MOTS_DU_CALCUL, "donc">;

/** Un calcul dit à voix haute, en wolof, nombres composés par la règle.

    Si `argent` est vrai, LES TROIS nombres passent en dërëm — jamais un
    mélange : « trois mille dërëm plus deux mille francs » serait un piège. */
export function calculEnWolof(
  a: number, op: Operation, b: number, resultat: number, argent = false,
): string | null {
  const dire = argent ? enDeremWolof : enWolof;
  const [x, y, z] = [dire(a), dire(b), dire(resultat)];
  if (!x || !y || !z) return null;
  return `${x} ${MOTS_DU_CALCUL[op]} ${y}, ${MOTS_DU_CALCUL.donc} ${z}`;
}

/* ═══ RELU, OU SEULEMENT PROPOSÉ ═════════════════════════════════════════

   Le problème, posé simplement : la règle compose un million de nombres, et
   Lamine ne peut pas en relire un million. Mais il n'a pas besoin de le
   faire — un nombre n'emploie que quelques MOTIFS d'assemblage, et il y en a
   dix-huit en tout dans la langue.

   Alors on ne demande pas à un nombre « es-tu dans sa liste ? », on lui
   demande « de quels motifs es-tu fait, et les a-t-il vus ? ». Un motif qu'il
   a relu une fois vaut pour tous les nombres qui s'en servent :
   « fukk ak juróom » relu dans 15 000 rend « fukk ak juróom-ñett » sûr.

   Et ce qui reste à lui demander devient un très petit nombre de lignes —
   motifsEnAttente() les sort. C'est ça qu'on lui met sous les yeux. */

/** Ce qu'on rend à l'appelant : le wolof, et sur quel pied il est.

    « relu »    tous les motifs employés viennent de ses lignes à lui ;
    « propose » au moins un motif qu'il n'a jamais vu écrit. */
export type Dit = { wolof: string; sur: "relu" | "propose"; enAttente?: string[] };

/** Les dix-huit façons d'assembler un nombre, chacune avec le plus petit
    exemple qui la montre. C'est la fiche de relecture, et elle se tient en
    une page. */
export const MOTIFS: Record<string, { quoi: string; exemple: number; argent?: boolean }> = {
  zero: { quoi: "zéro", exemple: 0 },
  unites: { quoi: "de un à neuf", exemple: 7 },
  dix: { quoi: "dix", exemple: 10 },
  "dix-ak-unite": { quoi: "de onze à dix-neuf — dix, puis l'unité", exemple: 18 },
  dizaine: { quoi: "les dizaines rondes, bâties sur fukk", exemple: 40 },
  "dizaine-ak-unite": { quoi: "une dizaine PLUS une unité", exemple: 37 },
  cent: { quoi: "cent, sans « benn » devant", exemple: 100 },
  centaines: { quoi: "plusieurs centaines, avec le « i » de liaison", exemple: 400 },
  "cent-ak-reste": { quoi: "des centaines PLUS un reste", exemple: 250 },
  mille: { quoi: "mille, sans « benn » devant", exemple: 1000 },
  milliers: { quoi: "plusieurs milliers", exemple: 2000 },
  "milliers-partages": { quoi: "chaque part garde son junni", exemple: 15000 },
  "mille-ak-reste": { quoi: "des milliers PLUS un reste en dessous de mille", exemple: 2500 },
  million: { quoi: "un million — le seul à garder son « benn »", exemple: 1_000_000 },
  millions: { quoi: "plusieurs millions", exemple: 2_000_000 },
  "million-ak-reste": { quoi: "un million PLUS un reste", exemple: 1_500_000 },
  derem: { quoi: "un montant, dit en dërëm", exemple: 500, argent: true },
  "par-centaine": { quoi: "un pourcentage, « ci téeméer bu nekk »", exemple: 18 },
};

function motifsSousCent(n: number, dans: Set<string>): void {
  if (n === 0) dans.add("zero");
  else if (n < 10) dans.add("unites");
  else if (n === 10) dans.add("dix");
  else if (n < 20) { dans.add("dix-ak-unite"); dans.add("unites"); }
  else {
    dans.add("dizaine");
    if (n % 10) { dans.add("dizaine-ak-unite"); dans.add("unites"); }
  }
}

function motifsSousMille(n: number, dans: Set<string>): void {
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (!c) { motifsSousCent(n, dans); return; }
  dans.add(c === 1 ? "cent" : "centaines");
  if (c > 1) motifsSousCent(c, dans);
  if (r) { dans.add("cent-ak-reste"); motifsSousCent(r, dans); }
}

/** De quels motifs ce nombre est fait. */
export function motifsDe(n: number): Set<string> {
  const dans = new Set<string>();
  if (!Number.isInteger(n) || n < 0 || n > PLAFOND) return dans;
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  if (millions) {
    dans.add(millions === 1 ? "million" : "millions");
    if (millions > 1) motifsSousMille(millions, dans);
    if (milliers || reste) dans.add("million-ak-reste");
  }
  if (milliers) {
    dans.add(milliers === 1 ? "mille" : "milliers");
    if (milliers > 1) motifsSousMille(milliers, dans);
    if (sousMille(milliers).includes(" ak ")) dans.add("milliers-partages");
    if (reste) dans.add("mille-ak-reste");
  }
  if (reste || !dans.size) motifsSousMille(reste, dans);
  return dans;
}

/** Les motifs qui sortent de SES lignes — calculés au chargement depuis sa
    table, jamais déclarés à la main. S'il corrige une ligne, ça suit ; s'il
    en ajoute une, un motif de plus s'ouvre tout seul. */
const MOTIFS_RELUS = new Set<string>();

for (const n of NOMBRES) {
  const valeur = Number(String(n.etiquette).replace(/[^0-9]/g, ""));
  if (!valeur && !/^n-0$/.test(n.cle)) continue;
  if (/^n-/.test(n.cle)) {
    for (const m of motifsDe(valeur)) MOTIFS_RELUS.add(m);
  } else if (/^f-/.test(n.cle) && valeur % FRANCS_PAR_DEREM === 0) {
    MOTIFS_RELUS.add("derem");
    for (const m of motifsDe(valeur / FRANCS_PAR_DEREM)) MOTIFS_RELUS.add(m);
  } else if (/^p-/.test(n.cle)) {
    MOTIFS_RELUS.add("par-centaine");
    for (const m of motifsDe(valeur)) MOTIFS_RELUS.add(m);
  }
}

/** Quand Lamine valide un motif de vive voix, il s'ajoute ici — une ligne,
    avec la date et ses mots. Rien d'autre à changer : tous les nombres qui
    s'en servent passent en « relu » du même coup. */
export const MOTIFS_VALIDES_PAR_LAMINE: string[] = [
  /* (en attente de sa relecture — voir motifsEnAttente()) */
];
for (const m of MOTIFS_VALIDES_PAR_LAMINE) MOTIFS_RELUS.add(m);

export function motifRelu(motif: string): boolean {
  return MOTIFS_RELUS.has(motif);
}

/** Ce qu'il reste à lui faire relire, avec un exemple de chaque. C'est court
    exprès : c'est la question qu'on lui pose. */
export function motifsEnAttente(): Array<{ motif: string; quoi: string; exemple: number; wolof: string }> {
  return Object.entries(MOTIFS)
    .filter(([m]) => !MOTIFS_RELUS.has(m))
    .map(([motif, d]) => ({
      motif, quoi: d.quoi, exemple: d.exemple,
      wolof: (d.argent ? enDeremWolof(d.exemple) : enWolof(d.exemple)) || "",
    }));
}

function juger(n: number, wolof: string, argent: boolean): Dit {
  const manquants = [...motifsDe(n)].filter((m) => !MOTIFS_RELUS.has(m));
  if (argent && !MOTIFS_RELUS.has("derem")) manquants.push("derem");
  return manquants.length
    ? { wolof, sur: "propose", enAttente: manquants }
    : { wolof, sur: "relu" };
}

/** Un nombre, avec son état de relecture. */
export function nombreDit(n: number): Dit | null {
  const wolof = enWolof(n);
  return wolof ? juger(n, wolof, false) : null;
}

/** Un montant, avec son état de relecture. C'est celui-ci qui compte : pour
    un PRIX, l'appelant ne dit le wolof que si `sur === "relu"`. */
export function montantDit(francs: number): Dit | null {
  const wolof = enDeremWolof(francs);
  return wolof ? juger(francs / FRANCS_PAR_DEREM, wolof, true) : null;
}

/** Et un pourcentage. */
export function pourcentDit(n: number): Dit | null {
  const wolof = enPourcent(n);
  if (!wolof) return null;
  const dit = juger(n, wolof, false);
  if (!MOTIFS_RELUS.has("par-centaine")) {
    return { wolof, sur: "propose", enAttente: [...(dit.enAttente || []), "par-centaine"] };
  }
  return dit;
}
