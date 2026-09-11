import { lexiqueConfig } from "./lexique";
import { REPERTOIRE, RELU } from "./repertoire-textes";
import type { Entree } from "./repertoire-textes";

/* ── CE QU'ELLE DIT SOUVENT, PAYÉ UNE SEULE FOIS ────────────────────────────

   Lamine, le 11 septembre 2026 : « ce que tu avais promis de réaliser hier,
   que tu allais garder les enregistrements des mots courants, il faut le faire
   en une fois — comme ça on n'aura plus à payer ces mots-là. »

   Il a raison, et c'est le seul endroit où l'on gagne à la fois les deux
   choses qui font mal : le temps et l'argent.

   CE QUE COÛTE UNE RÉPONSE ORDINAIRE. Le modèle réfléchit (4,8 s, quelques
   centimes), puis Soynade fabrique la voix (8 s, 0,22 $ les mille signes).
   Sur « naka nga def ? », on paie donc huit secondes et deux fabrications pour
   une phrase qui ne change jamais.

   CE QUE COÛTE UNE RÉPONSE DU RÉPERTOIRE. Rien. Le texte est écrit d'avance,
   le son est déjà fabriqué et rangé chez Supabase, et BIA le sert en une
   fraction de seconde. Ni jeton, ni signe, ni attente. Pour toujours.

   ── CE QUI ENTRE ICI, ET CE QUI N'Y ENTRE PAS ─────────────────────────────

   SEULEMENT ce qui ne dépend de rien : les salutations, qui elle est, ce
   qu'elle sait faire, les produits de KHALAM. Des phrases dont la réponse
   serait identique demain, pour n'importe qui.

   JAMAIS une question dont la réponse dépend de la personne, du moment, du
   fil de la conversation ou du monde. Une réponse enregistrée servie au
   mauvais moment est bien pire que huit secondes d'attente : c'est une
   machine qui récite, et on ne lui reparle pas.

   D'où la règle de correspondance, volontairement sévère : on ne répond de
   mémoire que si la question est COURTE et qu'elle correspond FRANCHEMENT.
   Au moindre doute, on laisse le modèle travailler. Un répertoire qui se
   trompe une fois sur dix ne vaut pas d'exister. */

const SEAU = process.env.SUPABASE_BUCKET_REPERTOIRE || "repertoire";

export type { Entree } from "./repertoire-textes";
export { REPERTOIRE, RELU } from "./repertoire-textes";


/* ── LA CORRESPONDANCE, ET POURQUOI ELLE EST SÉVÈRE ────────────────────────

   Une question longue n'est jamais une salutation : « salaam, dama bëgg xam
   naka lañuy defar ab devis » commence par « salaam » mais demande autre
   chose. On exige donc que la question SOIT la formule, à la ponctuation et
   aux politesses près — pas qu'elle la contienne.

   Le prix d'une erreur est asymétrique : rater une correspondance coûte huit
   secondes ; en inventer une fait répondre à côté. On rate volontiers. */

const CIVILITES = /\b(stp|svp|s il te plait|s il vous plait|bia|please)\b/g;

export function normaliser(texte: string): string {
  return String(texte || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(CIVILITES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── ENTENDRE, PAS LIRE ─────────────────────────────────────────────────────

   Signalé par Lamine le 11 septembre 2026, en essayant le répertoire à la
   voix : « il y a des réponses qu'elle n'amène pas. »

   Sa question était « naka waa kër ga ». Tapée telle quelle, elle marche.
   Dite au micro, elle ne marchait pas — et la faute est la mienne.

   J'avais écrit les formes dans l'orthographe savante du wolof : « kër »,
   « jërëjëf », « ñaar ». Le moteur de reconnaissance, lui, écrit ce qu'il
   entend avec les lettres du français : « keur », « djeredjef », « gnar ».
   Aucun des deux n'a tort. Ils ne s'écrivent simplement pas pareil, et
   comparer des lettres revenait à exiger que le micro connaisse mon
   orthographe.

   ON COMPARE DONC CE QUE ÇA SONNE, pas ce que ça s'écrit. Les équivalences
   ci-dessous sont celles que le français impose au wolof quand on l'écrit
   à l'oreille — rien d'inventé, rien de savant.

   CE N'EST PAS UN RELÂCHEMENT DE LA SÉVÉRITÉ. On exige toujours l'ÉGALITÉ :
   la question doit ÊTRE la formule, pas la contenir. Et l'épreuve vérifie
   deux choses qu'on ne peut pas juger à l'œil : qu'aucune de ces
   équivalences ne fait se confondre deux entrées entre elles, et que les
   phrases qui ne doivent PAS répondre du répertoire n'y répondent toujours
   pas. */
const SONS: Array<[RegExp, string]> = [
  [/tch/g, "c"],     // tchi → ci
  [/dj/g, "j"],      // djam → jam
  [/di(?=[aeiouy])/g, "j"], // « diam » est la façon française d'écrire jàmm
  [/gui\b/g, "gi"], // « keur gui » → kër gi
  [/kh/g, "x"],      // khalam s'entend xalam
  [/gn/g, "n"],      // gnar → ñaar, dont l'accent est déjà tombé
  [/ph/g, "f"],
  [/qu?/g, "k"],
  [/ou/g, "u"],      // juroom / jurum
  [/eu/g, "e"],      // keur → ker : c'est celle qui manquait
  [/(.)\1+/g, "$1"], // waa → wa, fukk → fuk, téeméer → temer
  [/\be\b/g, " "],  // un « e » resté seul ne s'entend pas
  [/(\w)e\b/g, "$1"], // kère → ker, jamme → jam
];

/** Ce que la phrase SONNE, une fois écrite à l'oreille du français. */
export function sonne(texte: string): string {
  let s = normaliser(texte);
  for (const [de, vers] of SONS) s = s.replace(de, vers);
  return s.replace(/\s+/g, " ").trim();
}

/* Une lettre d'écart — « ga » pour « gi », un « r » avalé. On ne l'accorde
   qu'à une formule assez longue pour rester reconnaissable, et seulement si
   UNE SEULE entrée est à cette distance : deux candidates à égalité, c'est
   qu'on ne sait pas, et on préfère le dire en laissant le modèle répondre. */
function uneLettreDEcart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, faute = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++faute > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return faute + (a.length - i) + (b.length - j) <= 1;
}

/** Rend l'entrée si la question EST cette formule. Sinon null. */
export function trouverDansRepertoire(question: string): Entree | null {
  const q = normaliser(question);
  if (!q) return null;
  // Au-delà de six mots, ce n'est plus une formule : c'est une demande.
  if (q.split(" ").length > 6) return null;

  /* DEUX PASSES, ET L'ORDRE COMPTE — l'épreuve me l'a appris.

     « c'est quoi KHALAM » tombait sur « qui es-tu », parce que la forme
     « c'est quoi BIA » perd son seul mot distinctif en passant par
     normaliser() (qui retire « bia » comme une politesse) : il ne restait que
     « c est quoi », qui attrape tout ce qui commence ainsi. La forme fautive
     est partie — mais le vrai défaut était de laisser une correspondance
     approchée gagner contre une correspondance EXACTE située plus bas dans la
     liste. On regarde donc d'abord toutes les égalités parfaites, et
     seulement ensuite les approchées. */
  for (const e of REPERTOIRE) {
    for (const f of e.formes) {
      if (q === normaliser(f)) return e;
    }
  }

  for (const e of REPERTOIRE) {
    for (const f of e.formes) {
      const forme = normaliser(f);
      /* Une formule trop courte après nettoyage n'est plus distinctive :
         mieux vaut la laisser passer que de servir une réponse au hasard. */
      if (forme.length < 5) continue;
      /* On tolère ce qui entoure une salutation sans rien y ajouter :
         « bonjour bia », « salaam waalekum salaam ». Rien de plus. */
      if (q.length <= forme.length + 12 && (q.startsWith(forme + " ") || q.endsWith(" " + forme))) return e;
    }
  }

  /* TROISIÈME PASSE : ce que ça sonne. C'est celle qui rattrape le micro. */
  const dit = sonne(question);
  if (!dit) return null;
  for (const e of REPERTOIRE) {
    for (const f of e.formes) {
      if (dit === sonne(f)) return e;
    }
  }

  /* QUATRIÈME ET DERNIÈRE : une lettre d'écart, et une seule candidate. */
  const proches = new Set<Entree>();
  for (const e of REPERTOIRE) {
    for (const f of e.formes) {
      const forme = sonne(f);
      if (forme.length >= 8 && uneLettreDEcart(dit, forme)) proches.add(e);
    }
  }
  return proches.size === 1 ? [...proches][0] : null;
}

/** L'adresse du son déjà fabriqué, chez Supabase. */
export function sonDe(cle: string, langue: "wo" | "fr"): string {
  return `${lexiqueConfig.url}/storage/v1/object/public/${SEAU}/${langue}/${encodeURIComponent(cle)}.wav`;
}

export const repertoireActif = () => Boolean(lexiqueConfig.url && lexiqueConfig.cle);

/** Ce que /api/etat montre : combien d'entrées, et si les textes sont relus. */
export function etatRepertoire() {
  return {
    entrees: REPERTOIRE.length,
    textes_relus_par_lamine: RELU,
    seau: SEAU,
    actif: repertoireActif() && RELU,
  };
}
