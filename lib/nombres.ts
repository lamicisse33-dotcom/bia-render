/* ── DIRE LES NOMBRES, PAS LES ÉPELER ──────────────────────────────────────

   Signalé par Lamine le 10 septembre 2026 : « quand elle parle des chiffres,
   elle ne cite pas carrément le chiffre — 300 000, elle dit 3.0.0.0. »

   POURQUOI. Le moteur de voix reçoit du texte et ne sait pas lire « 300 000 » :
   il l'épelle, chiffre par chiffre. Aucun réglage ne corrige ça, parce que le
   problème n'est pas dans la voix — il est dans ce qu'on lui donne. La seule
   solution est d'écrire le nombre EN TOUTES LETTRES avant de le lui passer.

   CE QUI RESTE À L'ÉCRAN NE CHANGE PAS. On ne touche qu'au texte envoyé à la
   voix : la conversation continue d'afficher « 300 000 », parce qu'un montant
   se vérifie à l'œil, en chiffres. C'est la même règle que sur le devis.

   ── LE WOLOF N'EST PAS À MOI ───────────────────────────────────────────────

   J'avais d'abord écrit les nombres wolof moi-même. Deux fois de suite, ils
   étaient faux : d'abord sur les milliers composés, puis — bien plus grave —
   sur l'argent. Lamine :

       « Le wolof ne compte pas l'argent en francs. Il commence à cinq francs,
         il considère le cinq francs comme un frein. »

   C'est le DËRËM : 1 dërëm = 5 francs CFA. 25 000 F CFA ne se disent donc pas
   « vingt-cinq mille » mais « juróomi junni dërëm » — cinq mille dërëm. Une
   assistante qui lit un devis à voix haute en multipliant les prix par cinq
   fait perdre de l'argent à quelqu'un.

   Lamine a donc écrit lui-même le module wolof, avec ses tests :
   bia-wolof-numbers.mjs. C'est SA base, elle ne se réécrit pas ici. Ce
   fichier-ci ne fait plus que deux choses : le français, et décider quel
   nombre est un montant.

   POUR LA METTRE À JOUR : remplacer bia-wolof-numbers.mjs par sa nouvelle
   version et relancer `node lib/bia-wolof-numbers.test.mjs`.

   CE QU'ON N'ÉPELLE PAS EN MOTS :
   - les numéros de téléphone : chiffre par chiffre, c'est justement la bonne
     façon de les dire, et « soixante-dix-sept millions… » serait absurde ;
   - les heures écrites 14h30, qui ont leur propre tournure.                */

import { numberToWolof, moneyToWolof } from "./bia-wolof-numbers.mjs";

const unitesFr = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept",
  "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const dizainesFr = ["", "", "vingt", "trente", "quarante", "cinquante",
  "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function sousCentFr(n: number): string {
  if (n <= 16) return unitesFr[n];
  if (n < 20) return `dix-${unitesFr[n - 10]}`;
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) return `${dizainesFr[d]}-${sousCentFr(n - (d === 7 ? 60 : 80))}`;
  const base = dizainesFr[d] + (d === 8 && u === 0 ? "s" : "");
  if (u === 0) return base;
  if (u === 1 && d !== 8) return `${base} et un`;
  return `${base}-${unitesFr[u]}`;
}

/* « cent » ne s'accorde que s'il TERMINE le nombre : deux cents, mais deux
   cent cinquante, et trois cent mille — devant mille ou million il reste
   invariable. D'où `suivi`, vrai quand ce groupe en multiplie un autre. */
function groupeFr(n: number, suivi = false): string {
  if (n < 100) return sousCentFr(n);
  const c = Math.floor(n / 100), r = n % 100;
  const cent = c === 1 ? "cent" : `${unitesFr[c]} cent${r === 0 && !suivi ? "s" : ""}`;
  return r ? `${cent} ${sousCentFr(r)}` : cent;
}

export function nombreEnFrancais(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n < 0) return `moins ${nombreEnFrancais(-n)}`;
  if (n === 0) return "zéro";

  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  if (millions) parts.push(millions === 1 ? "un million" : `${groupeFr(millions, true)} millions`);
  if (milliers) parts.push(milliers === 1 ? "mille" : `${groupeFr(milliers, true)} mille`);
  if (reste) parts.push(groupeFr(reste));
  return parts.join(" ");
}

/** Un nombre ordinaire — une quantité, une date, un rang. Jamais un montant. */
export function enLettres(n: number, langue: "wo" | "fr"): string {
  if (langue === "fr") return nombreEnFrancais(n);
  try { return String(numberToWolof(n)); } catch { return String(n); }
}

/** Un MONTANT. En wolof il passe en dërëm ; en français il reste en francs.
 *  `sigle` dit si la monnaie était écrite « CFA » dans le texte : on ne
 *  l'ajoute pas si la personne ne l'a pas dit. */
export function montantEnLettres(n: number, langue: "wo" | "fr", sigle = true): string {
  if (langue === "fr") {
    const francs = nombreEnFrancais(n);
    return `${francs} franc${Math.abs(n) >= 2 ? "s" : ""}${sigle ? " CFA" : ""}`;
  }
  try { return String(moneyToWolof(n)); } catch { return `${enLettres(n, "wo")} franc CFA`; }
}

/* Un numéro de téléphone sénégalais : 77 123 45 67, +221 77 123 45 67,
   77-123-45-67. On le laisse en chiffres — c'est ainsi qu'on le dit. */
const TELEPHONE = /(?:\+?221[\s.-]?)?(?:7[0678]|3[03])[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g;
/* 14h30, 9 h, 07h05 : l'heure a sa propre tournure, on n'y touche pas. */
const HEURE = /\b\d{1,2}\s?[hH]\s?\d{0,2}\b/g;

/* ── CE QUI FAIT QU'UN NOMBRE EST DE L'ARGENT ──────────────────────────────

   La question la plus dangereuse de ce fichier. Diviser par cinq un nombre
   qui n'est pas un montant, c'est dire « ñett » pour quinze articles. Ne pas
   diviser un vrai montant, c'est multiplier un prix par cinq à l'oreille de
   quelqu'un.

   La règle est donc la plus stricte possible : un nombre n'est un montant que
   si une marque de monnaie le SUIT immédiatement. Rien d'autre ne compte —
   ni le contexte, ni la phrase, ni ce qu'on devine. Dans le doute, c'est un
   nombre ordinaire. */
const MONNAIE = String.raw`\s*(F\s?CFA|FCFA|XOF|CFA|francs?|F)\b`;
const NOMBRE = String.raw`\d{1,3}(?:[   .,]\d{3})+|\d+(?:[.,]\d+)?`;
const MONTANT = new RegExp(`(${NOMBRE})${MONNAIE}`, "gi");
const SIMPLE = new RegExp(NOMBRE, "g");

/* La marque qui met un morceau de côté le temps de la conversion. ELLE NE
   DOIT CONTENIR AUCUN CHIFFRE : au premier essai elle en contenait, la
   conversion l'a dévorée, et « 77 123 45 67 » ressortait en « tus ci benn ». */
const lettresDe = (i: number) => {
  let s = "", n = i + 1;
  while (n > 0) { s = String.fromCharCode(97 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
const MARQUE = /@@([a-z]+)@@/g;

/** Le nombre écrit dans le texte, séparateurs de milliers enlevés. */
function lire(brut: string): number | null {
  const groupe = /^\d{1,3}(?:[   .,]\d{3})+$/.test(brut);
  const nettoye = groupe ? brut.replace(/[   .,]/g, "") : brut.replace(",", ".");
  const n = Number(nettoye);
  return Number.isFinite(n) ? n : null;
}

/**
 * Le texte tel qu'il doit être ENTENDU. À n'appliquer qu'avant la voix :
 * ce qui s'affiche garde ses chiffres.
 */
export function pourLaVoix(texte: string, langue: "wo" | "fr"): string {
  let t = String(texte || "");
  if (!t) return t;

  const gardes: string[] = [];
  const garder = (m: string) => `@@${lettresDe(gardes.push(m) - 1)}@@`;
  t = t.replace(TELEPHONE, garder).replace(HEURE, garder);

  // « 12 % » se lit « douze pour cent » : le signe seul n'est pas prononçable.
  t = t.replace(/\s*%/g, " pour cent");

  /* Les MONTANTS d'abord, avec leur marque de monnaie : elle est mangée au
     passage, puisque « dërëm » ou « francs CFA » la remplace. */
  t = t.replace(MONTANT, (tout, brut: string, monnaie: string) => {
    const n = lire(brut);
    if (n === null || !Number.isInteger(n) || Math.abs(n) >= 1_000_000_000_000) return tout;
    return montantEnLettres(n, langue, /cfa|xof/i.test(monnaie));
  });

  // Puis tout le reste : des nombres ordinaires, qu'on ne divise jamais.
  t = t.replace(SIMPLE, (brut) => {
    const n = lire(brut);
    if (n === null || Math.abs(n) >= 1_000_000_000_000) return brut;
    if (Number.isInteger(n)) return enLettres(n, langue);
    // Un décimal : la partie entière, puis les chiffres un à un.
    const [ent, dec] = String(n).split(".");
    const chiffres = dec.split("").map((c) => enLettres(Number(c), langue)).join(" ");
    return `${enLettres(Number(ent), langue)} virgule ${chiffres}`;
  });

  return t.replace(MARQUE, (_, c: string) => {
    let i = 0;
    for (const lettre of c) i = i * 26 + (lettre.charCodeAt(0) - 96);
    return gardes[i - 1] ?? "";
  });
}
