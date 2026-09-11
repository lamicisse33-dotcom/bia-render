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
  return null;
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
