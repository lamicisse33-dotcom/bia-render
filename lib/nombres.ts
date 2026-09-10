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

   CE QU'ON N'ÉPELLE PAS EN MOTS :
   - les numéros de téléphone : chiffre par chiffre, c'est justement la bonne
     façon de les dire, et « soixante-dix-sept millions… » serait absurde ;
   - les heures écrites 14h30, qui ont leur propre tournure.                */

const unitesWo = ["", "benn", "ñaar", "ñett", "ñeent", "juróom",
  "juróom-benn", "juróom-ñaar", "juróom-ñett", "juróom-ñeent"];

/* En wolof, un nombre qui en MULTIPLIE un autre prend un -i final :
   ñaar → ñaari téeméer, fukk → fukki junni, téeméer → ñetti téeméeri junni.
   La marque se pose sur le DERNIER mot du groupe, jamais au milieu. */
const avecI = (groupe: string) => {
  const mots = groupe.split(" ");
  mots[mots.length - 1] += "i";
  return mots.join(" ");
};

/** 0 à 99. */
function sousCentWo(n: number): string {
  if (n < 10) return unitesWo[n];
  const d = Math.floor(n / 10), u = n % 10;
  const dizaine = d === 1 ? "fukk" : `${unitesWo[d]}-fukk`;
  return u ? `${dizaine} ak ${unitesWo[u]}` : dizaine;
}

/** 0 à 999. */
function groupeWo(n: number): string {
  if (n < 100) return sousCentWo(n);
  const c = Math.floor(n / 100), r = n % 100;
  const cent = c === 1 ? "téeméer" : `${avecI(unitesWo[c])} téeméer`;
  return r ? `${cent} ak ${sousCentWo(r)}` : cent;
}

/* ── LES MILLIERS COMPOSÉS : CHAQUE PART GARDE SON « JUNNI » ────────────────

   Règle donnée par Lamine le 10 septembre 2026, dans son document « BIA
   nombres en wolof pour intégration » — wolof urbain de Dakar :

       « Milliers composés. Chaque partie conserve junni. »

   C'est là que je m'étais trompé. J'écrivais 15 000 « fukk ak juróomi junni »,
   comme si le junni portait sur l'ensemble. Il porte sur CHAQUE part :

       15 000  →  fukki junni ak juróomi junni
       25 000  →  ñaar-fukki junni ak juróomi junni
      250 000  →  ñaari téeméeri junni ak juróom-fukki junni

   On découpe donc le multiplicateur en ses morceaux — centaines, dizaines,
   unités — et chacun repart avec son -i et son junni. 300 000 ne fait qu'un
   seul morceau : « ñetti téeméeri junni ». */
function parMorceaux(n: number): string[] {
  const c = Math.floor(n / 100), r = n % 100, d = Math.floor(r / 10), u = r % 10;
  const morceaux: string[] = [];
  if (c) morceaux.push(c === 1 ? "téeméer" : `${avecI(unitesWo[c])} téeméer`);
  if (d) morceaux.push(d === 1 ? "fukk" : `${unitesWo[d]}-fukk`);
  if (u) morceaux.push(unitesWo[u]);
  return morceaux;
}

const avecUnite = (n: number, unite: string) =>
  parMorceaux(n).map((m) => `${avecI(m)} ${unite}`).join(" ak ");

export function nombreEnWolof(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n < 0) return `moins ${nombreEnWolof(-n)}`;
  if (n === 0) return "tus";

  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  // « million » reste en français, comme dans le wolof de Dakar. Et un
  // million se dit « benn million », jamais « million » tout seul.
  if (millions) parts.push(millions === 1 ? "benn million" : avecUnite(millions, "million"));
  if (milliers) parts.push(milliers === 1 ? "junni" : avecUnite(milliers, "junni"));
  if (reste) parts.push(groupeWo(reste));
  return parts.join(" ak ");
}

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

export const enLettres = (n: number, langue: "wo" | "fr") =>
  langue === "wo" ? nombreEnWolof(n) : nombreEnFrancais(n);

/* Un numéro de téléphone sénégalais : 77 123 45 67, +221 77 123 45 67,
   77-123-45-67. On le laisse en chiffres — c'est ainsi qu'on le dit. */
const TELEPHONE = /(?:\+?221[\s.-]?)?(?:7[0678]|3[03])[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g;
/* 14h30, 9 h, 07h05 : l'heure a sa propre tournure, on n'y touche pas. */
const HEURE = /\b\d{1,2}\s?[hH]\s?\d{0,2}\b/g;

/** Les nombres, avec ou sans séparateur de milliers : 300 000, 12.500, 1 250 000. */
const NOMBRE = /\d{1,3}(?:[   .,]\d{3})+|\d+(?:[.,]\d+)?/g;

/* La marque qui met un morceau de côté le temps de la conversion. ELLE NE
   DOIT CONTENIR AUCUN CHIFFRE : au premier essai elle en contenait, la
   conversion l'a dévorée, et « 77 123 45 67 » ressortait en « tus ci benn ».
   Des lettres, donc, et un encadrement qu'aucun texte écrit ne produit. */
const lettresDe = (i: number) => {
  let s = "", n = i + 1;
  while (n > 0) { s = String.fromCharCode(97 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
const MARQUE = /@@([a-z]+)@@/g;

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

  /* « F CFA » épelé donne « èf-cé-èf-a » : illisible à l'oreille. Règle de
     Lamine : on dit « francs CFA ». Le sigle CFA, lui, se dit bien lettre par
     lettre — c'est ainsi qu'on le prononce partout. */
  t = t.replace(/\b(?:F\s?CFA|FCFA|XOF)\b/gi, "francs CFA");
  t = t.replace(/(\d)\s*F\b(?!\s?CFA)/g, "$1 francs");

  t = t.replace(NOMBRE, (brut) => {
    // Séparateurs de milliers : espace, espace fine, point ou virgule suivis
    // de trois chiffres. Ce qui reste après nettoyage est le nombre.
    const groupe = /^\d{1,3}(?:[   .,]\d{3})+$/.test(brut);
    const nettoye = groupe ? brut.replace(/[   .,]/g, "") : brut.replace(",", ".");
    const n = Number(nettoye);
    if (!Number.isFinite(n)) return brut;
    // Au-delà de ce que le mot « million » couvre proprement, on laisse tel
    // quel : mieux vaut épeler qu'inventer une tournure fausse.
    if (Math.abs(n) >= 1_000_000_000) return brut;

    if (Number.isInteger(n)) return enLettres(n, langue);
    const [ent, dec] = nettoye.split(".");
    const chiffres = dec.split("").map((c) => enLettres(Number(c), langue)).join(" ");
    return `${enLettres(Number(ent), langue)} virgule ${chiffres}`;
  });

  return t.replace(MARQUE, (_, c: string) => {
    let i = 0;
    for (const lettre of c) i = i * 26 + (lettre.charCodeAt(0) - 96);
    return gardes[i - 1] ?? "";
  });
}
