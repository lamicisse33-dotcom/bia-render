/* ── DIRE LES NOMBRES, PAS LES ÉPELER ──────────────────────────────────────

   Signalé par Lamine le 10 septembre 2026 : « quand elle parle des chiffres,
   elle ne cite pas carrément le chiffre — 300 000, elle dit 3.0.0.0. »

   POURQUOI. Le moteur de voix reçoit du texte et ne sait pas lire « 300 000 » :
   il l'épelle, chiffre par chiffre. Aucun réglage ne corrige ça, parce que le
   problème n'est pas dans la voix — il est dans ce qu'on lui donne. La seule
   solution est d'écrire le nombre EN TOUTES LETTRES avant de le lui passer.

   ── LES NOMBRES SE DISENT EN FRANÇAIS, MÊME EN WOLOF ───────────────────────

   Décision de Lamine, le 10 septembre 2026, après deux allers-retours sur le
   wolof des nombres :

       « Il vaut mieux faire les calculs en français et ne plus citer les
         chiffres en wolof. Tout le monde comprend ça. »

   On avait essayé l'inverse — les nombres en wolof, l'argent converti en
   dërëm (1 dërëm = 5 francs). Trop d'erreurs, et une erreur sur un montant
   lu à voix haute coûte de l'argent à quelqu'un. Le module wolof et ses
   fiches sont donc retirés.

   Ce n'est pas un renoncement, c'est l'usage : à Dakar, les prix et les
   nombres se disent en français au milieu d'une phrase en wolof. C'est même
   déjà la règle de BIA pour tout mot difficile — le test du chauffeur de
   taxi. Un nombre n'y échappe pas.

   CE QUI RESTE À L'ÉCRAN NE CHANGE PAS. On ne touche qu'au texte envoyé à la
   voix : la conversation continue d'afficher « 300 000 », parce qu'un montant
   se vérifie à l'œil, en chiffres.

   CE QU'ON N'ÉPELLE PAS EN MOTS :
   - les numéros de téléphone : chiffre par chiffre, c'est justement la bonne
     façon de les dire, et « soixante-dix-sept millions… » serait absurde ;
   - les heures écrites 14h30, qui ont leur propre tournure.                */

const unites = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept",
  "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const dizaines = ["", "", "vingt", "trente", "quarante", "cinquante",
  "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function sousCent(n: number): string {
  if (n <= 16) return unites[n];
  if (n < 20) return `dix-${unites[n - 10]}`;
  const d = Math.floor(n / 10), u = n % 10;
  // Soixante-dix et quatre-vingt-dix se comptent par vingtaines.
  if (d === 7 || d === 9) return `${dizaines[d]}-${sousCent(n - (d === 7 ? 60 : 80))}`;
  const base = dizaines[d] + (d === 8 && u === 0 ? "s" : "");
  if (u === 0) return base;
  if (u === 1 && d !== 8) return `${base} et un`;
  return `${base}-${unites[u]}`;
}

/* « cent » ne s'accorde que s'il TERMINE le nombre : deux cents, mais deux
   cent cinquante, et trois cent mille — devant mille ou million il reste
   invariable. D'où `suivi`, vrai quand ce groupe en multiplie un autre. */
function groupe(n: number, suivi = false): string {
  if (n < 100) return sousCent(n);
  const c = Math.floor(n / 100), r = n % 100;
  const cent = c === 1 ? "cent" : `${unites[c]} cent${r === 0 && !suivi ? "s" : ""}`;
  return r ? `${cent} ${sousCent(r)}` : cent;
}

/** Un nombre entier, en toutes lettres. Toujours en français. */
export function enLettres(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n < 0) return `moins ${enLettres(-n)}`;
  if (n === 0) return "zéro";

  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  if (millions) parts.push(millions === 1 ? "un million" : `${groupe(millions, true)} millions`);
  if (milliers) parts.push(milliers === 1 ? "mille" : `${groupe(milliers, true)} mille`);
  if (reste) parts.push(groupe(reste));
  return parts.join(" ");
}

/* Un numéro de téléphone sénégalais : 77 123 45 67, +221 77 123 45 67,
   77-123-45-67. On le laisse en chiffres — c'est ainsi qu'on le dit. */
const TELEPHONE = /(?:\+?221[\s.-]?)?(?:7[0678]|3[03])[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g;
/* 14h30, 9 h, 07h05 : l'heure a sa propre tournure, on n'y touche pas. */
const HEURE = /\b\d{1,2}\s?[hH]\s?\d{0,2}\b/g;

/* La monnaie, écrite de toutes les façons qu'on rencontre. « F CFA » épelé
   donne « èf-cé-èf-a » : illisible à l'oreille. On dit « francs CFA », et le
   sigle CFA se prononce bien lettre par lettre — c'est ainsi partout. */
const MONNAIE = String.raw`\s*(F\s?CFA|FCFA|XOF|CFA|francs?|F)\b`;
const NOMBRE = String.raw`\d{1,3}(?:[   .,]\d{3})+|\d+(?:[.,]\d+)?`;
const MONTANT = new RegExp(`(${NOMBRE})${MONNAIE}`, "gi");
const SIMPLE = new RegExp(NOMBRE, "g");

/* La marque qui met un morceau de côté le temps de la conversion. ELLE NE
   DOIT CONTENIR AUCUN CHIFFRE : au premier essai elle en contenait, la
   conversion l'a dévorée, et « 77 123 45 67 » ressortait en toutes lettres. */
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
 *
 * La langue ne change rien aux nombres — ils sont dits en français dans les
 * deux cas. Le paramètre reste pour ne pas changer les appels, et parce que
 * la question pourrait se rouvrir un jour.
 */
export function pourLaVoix(texte: string, _langue: "wo" | "fr" = "fr"): string {
  let t = String(texte || "");
  if (!t) return t;

  const gardes: string[] = [];
  const garder = (m: string) => `@@${lettresDe(gardes.push(m) - 1)}@@`;
  t = t.replace(TELEPHONE, garder).replace(HEURE, garder);

  // « 12 % » se lit « douze pour cent » : le signe seul n'est pas prononçable.
  t = t.replace(/\s*%/g, " pour cent");

  // Les montants d'abord, pour ramasser leur marque de monnaie au passage.
  t = t.replace(MONTANT, (tout, brut: string) => {
    const n = lire(brut);
    if (n === null || !Number.isInteger(n) || Math.abs(n) >= 1_000_000_000) return tout;
    return `${enLettres(n)} franc${Math.abs(n) >= 2 ? "s" : ""} CFA`;
  });

  // Puis tous les autres nombres.
  t = t.replace(SIMPLE, (brut) => {
    const n = lire(brut);
    if (n === null || Math.abs(n) >= 1_000_000_000) return brut;
    if (Number.isInteger(n)) return enLettres(n);
    const [ent, dec] = String(n).split(".");
    const chiffres = dec.split("").map((c) => enLettres(Number(c))).join(" ");
    return `${enLettres(Number(ent))} virgule ${chiffres}`;
  });

  return t.replace(MARQUE, (_, c: string) => {
    let i = 0;
    for (const lettre of c) i = i * 26 + (lettre.charCodeAt(0) - 96);
    return gardes[i - 1] ?? "";
  });
}
