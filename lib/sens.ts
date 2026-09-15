/* ── CE QUE SA PHRASE VEUT DIRE, ET D'OÙ ON LE TIENT ───────────────────────

   Lamine, le 15 septembre 2026, en m'expliquant ce qui manquait au mode
   apprentissage :

     « Si elle connaît ce que ça veut dire en français, après avoir répété la
       phrase exactement, elle doit me dire ça veut dire ça en français. Si
       elle ne connaît pas, elle doit me le demander pour que je puisse
       corriger ça une deuxième fois en appuyant sur le bouton bleu. »

   Puis, quand je lui ai proposé de redire le français lui-même à chaque coup :

     « Si elle comprend le sens, elle le dit en français, ce n'est pas la peine
       que je lui répète ça. Je dois tout simplement confirmer et passer à
       l'étape suivante. C'est plus simple comme ça. »

   ── LE PIÈGE, ET COMMENT ON LE TIENT SANS L'ALOURDIR ───────────────────────

   « Connaître » veut dire deux choses très différentes ici :

     — ELLE SAIT : la paire est déjà dans ses leçons, c'est LUI qui la lui a
       donnée. C'est sûr.
     — ELLE DEVINE : le modèle traduit son wolof. C'est précisément là qu'il
       se trompe, et il se trompe du même ton assuré que quand il a raison.

   Sans cette distinction, une devinette validée par inattention devient une
   vérité permanente dans sa mémoire — le défaut qu'on passe nos journées à
   empêcher ailleurs.

   MAIS IL A DEMANDÉ DE LA SIMPLICITÉ, et il a raison : une cérémonie de deux
   phrases à chaque mot rendrait ses soirées interminables. La distinction ne
   passe donc PAS par sa bouche à elle — elle passe par l'écran. Elle dit le
   français, point. Le bandeau, lui, montre d'où ça vient. Il ne perd pas une
   seconde et sait d'un coup d'œil ce qui mérite un regard.

   ── ON CHERCHE D'ABORD CHEZ LUI ────────────────────────────────────────────

   Ses leçons portent le wolof et le français côte à côte — c'est la forme
   qu'il a lui-même dictée le 13 septembre. Quand la phrase y est, on rend SON
   français, pas celui du modèle. C'est gratuit, instantané, et c'est le sien.

   Je n'écris pas une syllabe de wolof ici : ce fichier ne fait que retrouver
   les siennes.                                                              */

import { leconsSousLaMain, lecconsActives } from "@/lib/lecons";
import { normaliser } from "@/lib/normaliser";

export type Sens = {
  /** Le français. */
  francais: string;
  /** Vrai quand ça vient de LUI ; faux quand c'est le modèle qui a traduit. */
  sur: boolean;
  /** D'où ça sort, en clair, pour le tableau de bord. */
  ou: "leçon" | "modèle";
};

/* ── DANS SES LEÇONS ────────────────────────────────────────────────────────

   On compare sur la forme normalisée : l'oreille n'écrit pas comme il écrit,
   et exiger l'égalité des lettres ne retrouverait jamais rien de ce qui passe
   par le micro. On ne va PAS jusqu'à sonne() ici : deux phrases wolof
   différentes peuvent sonner pareil une fois réduites, et servir le mauvais
   français est pire que ne rien servir. */
export function sensDansSesLecons(phrase: string): string | null {
  if (!lecconsActives()) return null;
  const cherche = normaliser(phrase);
  if (!cherche) return null;
  for (const lecon of leconsSousLaMain()) {
    for (const p of lecon.repond) {
      if (p.wolof.trim() && p.francais.trim() && normaliser(p.wolof) === cherche) {
        return p.francais.trim();
      }
    }
    /* Les façons de le DIRE portent parfois leur français, quand il l'a
       écrit. Elles valent aussi : c'est sa main. */
    for (const p of lecon.dit) {
      if (p.wolof.trim() && p.francais.trim() && normaliser(p.wolof) === cherche) {
        return p.francais.trim();
      }
    }
  }
  return null;
}

/* ── CE QU'ON DEMANDE AU MODÈLE, QUAND ELLE NE SAIT PAS ─────────────────────

   Une consigne courte et fermée. Trois choses comptent :

   1. LE FRANÇAIS SEUL. Pas de préambule, pas de « cela signifie » — le
      téléphone met la phrase dans une bouche, et une phrase qui commence par
      « Bien sûr ! » s'entend comme une bêtise.

   2. QU'IL AVOUE. Un modèle qui ne connaît pas un mot wolof en invente un
      sens plutôt que de se taire. On lui donne donc un mot pour dire non, et
      on le lui rend obligatoire — c'est ce mot qui fait que Lamine sera
      questionné au lieu d'être trompé.

   3. COURT. C'est une traduction, pas un commentaire. */
export const CONSIGNE_DU_SENS = [
  "Tu traduis une phrase wolof en français, et RIEN d'autre.",
  "",
  "Réponds par la traduction française seule : pas de préambule, pas de",
  "guillemets, pas d'explication. Une phrase, la plus naturelle possible,",
  "comme on le dirait vraiment à Dakar.",
  "",
  "SI TU N'ES PAS SÛR DU SENS, réponds exactement : XAMUMA",
  "Un sens inventé est bien pire qu'un aveu : il sera enregistré comme vrai",
  "et ne sera jamais rattrapé. Devant le moindre doute, XAMUMA.",
].join("\n");

/** Le mot par lequel le modèle avoue. Il n'est jamais montré tel quel. */
export const AVEU = "XAMUMA";

/** Ce que le modèle a rendu est-il une vraie traduction ? */
export function traductionUtilisable(rendu: string): string | null {
  const t = String(rendu || "").trim().replace(/^["«\s]+|["»\s]+$/g, "");
  if (!t) return null;
  if (t.toUpperCase().includes(AVEU)) return null;
  /* Un modèle qui recopie la phrase wolof au lieu de la traduire n'a rien
     traduit. Ça arrive, et ça passerait pour une réponse. */
  if (t.length > 300) return null;
  return t;
}
