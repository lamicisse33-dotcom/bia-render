/* ── « JE LUI AI DEMANDÉ DES NOMBRES EN WOLOF. ELLE DONNAIT DES RÉPONSES
      FAUSSES. ET POURTANT, JE T'AVAIS DONNÉ MA LISTE. » ────────────────────

   Lamine, le 15 septembre 2026 au soir. Il a raison sur toute la ligne, et
   voici ce que j'ai trouvé en cherchant.

   ── UN : SA TABLE N'ÉTAIT BRANCHÉE À RIEN ──────────────────────────────────

   lib/wolof-nombres.ts fait 492 lignes. Il compose n'importe quel nombre et
   n'importe quel montant à partir de SA table, il applique ses quatre règles,
   et 63 de ses nombres relus servent de vecteurs d'épreuve. Il marche.

   Il n'était importé par AUCUN fichier. Pas un. Écrit le 12 septembre,
   éprouvé, jamais relié. C'est le même défaut que ses leçons, trouvé le même
   soir : la matière est là, et rien ne va la chercher.

   ── DEUX : LA CONSIGNE LUI INTERDISAIT EXPRESSÉMENT DE RÉPONDRE ────────────

   Et c'est pire, parce que ça, c'est moi qui l'ai écrit :

     « LES NOMBRES S'ÉCRIVENT EN CHIFFRES, ET SE DISENT EN FRANÇAIS. […]
       JAMAIS en wolof. Pas de "ñaar-fukk", pas de "juróomi junni". »

   La règle est bonne là où elle est née : au milieu d'une phrase, un montant
   mal dit coûte de l'argent à quelqu'un. Mais elle ne distingue pas le
   montant lâché dans une conversation de la QUESTION DIRECTE « comment on dit
   250 en wolof ». Sur cette question-là, elle lui interdisait la seule bonne
   réponse. Le modèle a fait ce que font les modèles quand on leur interdit de
   répondre : il a inventé une excuse — « je n'ai pas reçu de fichier » — puis
   il a inventé des nombres.

   ── CE QUE CE FICHIER FAIT ─────────────────────────────────────────────────

   Il reconnaît la question directe, et rien d'autre. Sur celle-là, la réponse
   ne vient plus du modèle : elle est COMPOSÉE par sa table, servie
   instantanément, et gratuite.

   LA RÈGLE DE L'ARGENT TIENT TOUJOURS. « Comment on dit 250 » et « comment on
   dit 250 francs » ne sont pas la même question : la seconde passe par
   enDeremWolof(), divise par cinq, et n'est jamais prononcée sans le mot
   dërëm. Un montant qui n'est pas divisible par cinq n'a pas de nom en dërëm
   et on refuse de le dire — c'est sa règle numéro 4, et elle ne plie pas.

   ET ON NE DEVINE PAS AU-DELÀ DE SA TABLE. Là où wolof-nombres.ts rend null,
   on ne rend rien : elle le dira en français plutôt que d'inventer. Une
   réponse fausse dite avec assurance est exactement ce dont il se plaint ce
   soir.

   Je n'écris pas une syllabe de wolof ici : tout ce qui est prononcé sort de
   sa table, à travers enWolof() et enDeremWolof().                          */

import { NOMBRES } from "./nombres-textes";
import { enDeremWolof, enWolof } from "./wolof-nombres";

/* ── RECONNAÎTRE LA QUESTION, SANS ATTRAPER LE RESTE ────────────────────────

   Le risque n'est pas de manquer une question — il redemandera. Le risque est
   d'attraper une phrase qui n'en est pas une et de répondre par un nombre nu
   au milieu d'une conversation. On exige donc DEUX choses ensemble : qu'on
   parle de dire/traduire, et que le wolof soit nommé. « Il me faut 250 » n'a
   ni l'un ni l'autre et ne déclenche rien. */
const DEMANDE = /\b(comment|coment|kan|naka)\b[^?]{0,40}\b(dit|dis|dire|disent|traduit|traduis|traduire|appelle)\b/i;
const AUTREMENT = /\b(dis|dis-moi|donne|donne-moi|traduis|traduis-moi|c'est quoi|cest quoi)\b/i;
const EN_WOLOF = /\ben\s+(wolof|woloff|walaf|ouolof)\b|\bwolof\b/i;

/* Les mots qui font d'un nombre un MONTANT. Sans l'un d'eux, c'est un nombre
   simple — et un nombre simple ne porte jamais dërëm. */
const ARGENT = /\b(francs?|franc|cfa|f\s*cfa|xof|derem|dërëm|argent|prix|co[uû]te|payer)\b|\d\s*f\b/i;

export type Demande = {
  /** Le nombre lu dans sa phrase. */
  nombre: number;
  /** Est-ce un montant ? Alors il se dira en dërëm, jamais en francs. */
  argent: boolean;
};

/* ── LIRE LE NOMBRE TEL QU'IL L'ÉCRIT OU LE DIT ─────────────────────────────

   Il parle, donc l'oreille écrit « 250 », « 2 500 », « 2.500 » ou « 2500 »
   selon le jour. Les séparateurs sautent. On prend le PREMIER nombre de la
   phrase : « comment on dit 250 en wolof » n'en contient qu'un, et une phrase
   qui en contient deux n'est pas la question qu'on cherche. */
export function nombreDit(texte: string): number | null {
  const sansEspaces = String(texte || "").replace(/(\d)[  .](?=\d{3}\b)/g, "$1");
  const trouve = sansEspaces.match(/\d+/);
  if (!trouve) return null;
  const n = Number(trouve[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Est-ce qu'il demande un nombre en wolof ? Rend null si ce n'en est pas une :
 * dans le doute, la phrase repart par le chemin ordinaire.
 */
export function demandeDeNombre(texte: string): Demande | null {
  const dit = String(texte || "");
  if (!EN_WOLOF.test(dit)) return null;
  if (!DEMANDE.test(dit) && !AUTREMENT.test(dit)) return null;
  const nombre = nombreDit(dit);
  if (nombre === null) return null;
  return { nombre, argent: ARGENT.test(dit) };
}

export type Reponse = {
  /** Ce qu'elle dit — composé par sa table, jamais par moi. */
  dit: string;
  /** Relu de sa main, ou composé par la règle et pas encore entendu par lui. */
  relu: boolean;
};

/* ── LES NOMBRES QU'IL A RELUS DE SA MAIN ───────────────────────────────────

   Ils passent avant la règle : là où il a tranché lui-même, on ne recompose
   pas.

   ON NE GARDE QUE LES ÉTIQUETTES QUI SONT UN NOMBRE NU. Sa liste contient
   aussi « 5 % » et « 10 % », et l'épreuve les a attrapés tout de suite : en
   effaçant tout ce qui n'est pas un chiffre, « 5 % » devenait la clé « 5 » et
   écrasait le cinq tout court. BIA aurait répondu « juróom ci téeméer bu
   nekk » — cinq POUR CENT — à qui lui demande comment on dit cinq.

   C'est exactement la classe d'erreur dont il se plaint ce soir, et elle
   serait passée sans cette ligne. Un pourcentage et un nombre ne répondent
   pas à la même question. */
const NOMBRE_NU = /^[\d\s .]+$/;
const RELUS = new Map<string, string>(
  NOMBRES.filter((n) => n.groupe !== "argent" && NOMBRE_NU.test(n.etiquette))
    .map((n) => [n.etiquette.replace(/[^\d]/g, ""), n.wolof]),
);

/**
 * La réponse à sa question, ou null quand sa table ne couvre pas le cas —
 * auquel cas elle le dira en français plutôt que d'inventer.
 */
export function repondreAuNombre(d: Demande): Reponse | null {
  if (d.argent) {
    /* Sa règle numéro 4 : on divise par cinq avant de dire, et on refuse un
       montant qui n'existe pas en dërëm. enDeremWolof() est le seul chemin,
       et il ne rend jamais rien sans le mot. */
    const dit = enDeremWolof(d.nombre);
    return dit ? { dit, relu: false } : null;
  }
  const sien = RELUS.get(String(d.nombre));
  if (sien) return { dit: sien, relu: true };
  const compose = enWolof(d.nombre);
  return compose ? { dit: compose, relu: false } : null;
}
