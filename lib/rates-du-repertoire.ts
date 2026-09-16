/* ── CE QUI MANQUE À SON RÉPERTOIRE, MESURÉ AU LIEU D'ÊTRE DEVINÉ ───────────

   Lamine, le 17 septembre 2026, après avoir regardé Abena AI — l'assistant
   ghanéen qui tourne HORS LIGNE, et qui répond donc instantanément :

     « Qu'est-ce qu'on peut copier chez eux ? »

   Ma réponse : leur vitesse, et il l'a déjà payée. Une phrase du répertoire
   sort du téléphone en un dixième de seconde, dans la voix de Kha, sans
   modèle et sans réseau — c'est son hors-ligne à lui. Il en a 42. Et sur ses
   soixante derniers tours, UN SEUL en est venu.

   Puis il a demandé la liste de ce qui manque, et j'ai dû me reprendre : je
   lui avais dit que le serveur l'avait. Il ne l'avait pas. Il comptait les
   tours par provenance, jamais les questions qui passaient à côté.

   ── CE QU'ON NOTE, ET CE QU'ON NE NOTE PAS ─────────────────────────────────

   Une question n'est une CANDIDATE que si une phrase enregistrée aurait pu y
   répondre. Une demande de devis, une leçon de wolof, un calcul : non. Ce
   qu'on cherche, ce sont les formules — les choses qu'on redit tous les
   jours, et qui ne devraient jamais coûter dix secondes.

   ET ON COMPTE LES RÉPÉTITIONS. Une question posée une fois ne vaut pas un
   enregistrement ; la même posée quinze fois en vaut un tout de suite. C'est
   le seul chiffre qui dit par où commencer, et c'est pour ça que ce fichier
   regroupe au lieu d'empiler.

   ── LE REGROUPEMENT SE FAIT SUR LA FORME SONNÉE ────────────────────────────

   « naka nga def », « naka nga deff », « naka ngadef » : c'est la même
   question, entendue trois fois par une oreille qui n'écrit jamais le wolof
   deux fois pareil. Compter les orthographes séparément donnerait quinze
   questions à une occurrence là où il y en a une à quinze. C'est exactement
   la leçon de lib/souvenirs.ts, et elle vaut ici aussi.                     */

import { normaliser, sonne } from "./normaliser";

/* Au-delà, ce n'est plus une formule mais une demande — et une demande ne
   s'enregistre pas. Le même seuil que le répertoire lui-même. */
export const MOTS_AU_PLUS = 9;

/* On garde les cent formes les plus vues. Au-delà c'est une traîne d'une
   occurrence chacune, qui ne dit rien et qui pèse à chaque lecture. */
const FORMES_GARDEES = 100;

type Rate = { dit: string; vus: number; quand: number };

/* Rangé par forme sonnée ; `dit` garde la dernière orthographe entendue,
   parce que c'est celle qu'il reconnaîtra en la lisant. */
let parForme = new Map<string, Rate>();
let examinees = 0;

/* ── CE QUI DISQUALIFIE UNE QUESTION ───────────────────────────────────────

   Ces mots disent « ceci n'est pas une formule ». Une phrase qui les porte
   demande un travail, et un travail ne se met pas en conserve. */
const PAS_UNE_FORMULE = [
  "devis", "facture", "mail", "message", "lettre", "courriel",
  "memorise", "retiens", "apprends", "oublie", "corrige",
  "combien", "calcule", "traduis", "cherche", "montre", "emmene",
];

/* ── ET CE QUI N'EST QU'UN ACQUIESCEMENT ───────────────────────────────────

   « oui », « ok », « et toi » se rangeraient en tête du classement sans
   qu'aucun enregistrement ne les couvre utilement : ils ne veulent rien dire
   hors de la phrase d'avant.

   MON PREMIER JET LES ÉCARTAIT PAR LA LONGUEUR — moins de trois mots, dehors.
   L'épreuve a montré ce que ça coûtait : « naka ngadef », que l'oreille écrit
   en deux mots, tombait avec eux. Or c'est LA salutation de Dakar. On nomme
   donc les acquiescements au lieu de les deviner à la taille. */
const ACQUIESCEMENTS = new Set([
  "oui", "non", "ok", "daccord", "waaw", "deedeet", "bon", "voila",
  "merci", "et toi", "toi", "moi", "hein", "quoi", "ah", "bien",
]);

export function estCandidate(question: string): boolean {
  const q = normaliser(question);
  if (!q) return false;
  const mots = q.split(" ").filter(Boolean);
  if (mots.length > MOTS_AU_PLUS) return false;
  if (!mots.length) return false;
  if (/\d/.test(q)) return false;
  /* Un seul mot, ou une phrase entièrement faite d'acquiescements. */
  if (mots.every((m) => ACQUIESCEMENTS.has(m))) return false;
  if (mots.length < 2) return false;
  return !PAS_UNE_FORMULE.some((m) => mots.includes(m));
}

/**
 * Une question est partie au modèle alors que le répertoire aurait pu la
 * prendre. On la note, regroupée sur ce qu'elle SONNE.
 */
export function noterRate(question: string): void {
  if (!estCandidate(question)) return;
  examinees++;
  /* ── ET ON RETIRE AUSSI LES ESPACES ──────────────────────────────────

     Trouvé par l'épreuve : sonne() rapproche « def » et « deff », mais pas
     « nga def » et « ngadef ». Or l'oreille fait les deux — elle recolle ou
     sépare les mots wolof selon ce qu'elle croit entendre, et « naka ngadef »
     est la salutation la plus courante de Dakar.

     Sur des formules de moins de dix mots, regrouper un peu trop est bien
     moins grave que pas assez : si rien n'a l'air de revenir, il
     n'enregistrera rien, et c'est tout l'objet de cette liste qui tombe. */
  const cle = sonne(question).replace(/ /g, "");
  if (!cle) return;
  const deja = parForme.get(cle);
  if (deja) {
    deja.vus++;
    deja.dit = String(question || "").trim().slice(0, 120);
    deja.quand = Date.now();
    return;
  }
  if (parForme.size >= FORMES_GARDEES) {
    /* Plein : on fait de la place en jetant la moins vue, jamais la plus
       récente. Ce qui revient souvent est ce qu'on cherche. */
    let pire: string | null = null;
    let moins = Infinity;
    for (const [k, v] of parForme) if (v.vus < moins) { moins = v.vus; pire = k; }
    if (moins > 1 || !pire) return;
    parForme.delete(pire);
  }
  parForme.set(cle, { dit: String(question || "").trim().slice(0, 120), vus: 1, quand: Date.now() });
}

/** Les comptes seuls — ils ne disent rien de son wolof, donc ils peuvent
    s'afficher partout, y compris sur une page qui ne demande aucun code. */
export function resumeDesRates() {
  if (!examinees) return null;
  let repetees = 0;
  for (const v of parForme.values()) if (v.vus > 1) repetees++;
  return {
    questions_examinees: examinees,
    formes_distinctes: parForme.size,
    /* LA LIGNE QUI DIT S'IL Y A QUELQUE CHOSE À FAIRE : une forme revue
       plusieurs fois est un enregistrement qui se rentabilise tout seul. */
    formes_repetees: repetees,
  };
}

/**
 * La liste elle-même, la plus vue d'abord.
 *
 * SES PHRASES NE SORTENT QU'AVEC SON CODE. C'est la décision du 16
 * septembre, et elle tient ici aussi : /api/etat est ouvert à qui connaît
 * l'adresse, et son wolof est ce qu'il a de plus précieux — il a demandé le
 * 15 si un fournisseur pouvait le récupérer. Des nombres sur un mur ouvert,
 * jamais ses phrases.
 */
export function listeDesRates(combien = 40): Array<{ dit: string; vus: number }> {
  return [...parForme.values()]
    .sort((a, b) => b.vus - a.vus || b.quand - a.quand)
    .slice(0, combien)
    .map(({ dit, vus }) => ({ dit, vus }));
}

export function oublierLesRates(): void {
  parForme = new Map();
  examinees = 0;
}
