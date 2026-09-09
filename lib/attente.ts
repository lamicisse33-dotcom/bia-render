/* Ce que BIA dit pendant qu'elle réfléchit.

   Le silence est ce qui trahit la machine : un visage figé pendant quatre
   secondes fait douter qu'il se passe quoi que ce soit. Une phrase brève,
   dans sa vraie voix, transforme l'attente en tour de conversation.

   Les formulations wolof viennent de Lamine — locuteur natif. Ne les
   réécris pas sans lui : c'est exactement le genre de correction que le
   lexique existe pour recueillir.

   Trois règles tiennent tout le reste :
   — une seule phrase par attente, jamais un enchaînement ;
   — jamais la même que la fois précédente ;
   — dès que la vraie réponse est prête, la phrase d'attente est coupée. */

export type Moment = "court" | "moyen" | "social" | "nom" | "long";

export type Attente = {
  id: string;
  /** Le nom de case du visage, tel que la planche des 24 expressions les nomme. */
  visage: string;
  wo: string;
  fr: string;
  quand: Moment;
};

export const ATTENTES: Attente[] = [
  // Retard très court — elle signale seulement qu'elle a entendu.
  { id: "ecoute",    quand: "court", visage: "ecoute",      wo: "Waaw, dégg naa la.", fr: "Oui, je t'écoute." },
  { id: "hee",       quand: "court", visage: "douce",       wo: "Héé…", fr: "Hé hé…" },
  { id: "xaaral",    quand: "court", visage: "pensive",     wo: "Xaaral tuuti…", fr: "Attends un instant…" },

  // Elle réfléchit pour de bon, et le dit.
  { id: "solo",      quand: "moyen", visage: "etonnement",  wo: "Sa laaj bi dafa am solo dé.", fr: "Ta question est importante." },
  { id: "xalaat",    quand: "moyen", visage: "regard_cote", wo: "Maangi xalaat ci sa laaj bi…", fr: "Je réfléchis à ta question…" },
  { id: "bayyil",    quand: "moyen", visage: "malice",      wo: "Bàyyil ma tuuti, dinaa la wax…", fr: "Laisse-moi un instant, je vais te répondre…" },

  // De temps en temps seulement : elle prend des nouvelles.
  { id: "journee",   quand: "social", visage: "joie",       wo: "Naka journée bi ?", fr: "Comment se passe ta journée ?" },
  { id: "fatigue",   quand: "social", visage: "douce",      wo: "Mbaa sonnóo trop tey ?", fr: "J'espère que tu n'es pas trop fatigué aujourd'hui ?" },
  { id: "tangaay",   quand: "social", visage: "etonnement", wo: "Naka tàngaay bi ci sa wet ? Tàng na walla sedd ?", fr: "Quel temps fait-il chez toi ? Il fait chaud ou froid ?" },
  { id: "famille",   quand: "social", visage: "joie",       wo: "Mbaa famille bi ñépp ngi ci jàmm ?", fr: "J'espère que toute la famille va bien ?" },

  // Une seule fois, et seulement si elle ne le connaît pas.
  { id: "tur",       quand: "nom",   visage: "malice",      wo: "Waaw, sa tur lan la déjà ?", fr: "Au fait, comment tu t'appelles déjà ?" },

  // Attente inhabituelle : elle rassure, franchement.
  { id: "systeme",   quand: "long",  visage: "rire",        wo: "Bul ragal, duma la fàtte, système bi rekk moo di daw tuuti !", fr: "Ne t'inquiète pas, je ne t'oublie pas, c'est seulement le système qui ralentit un peu !" },
];

/* En dessous de ce seuil, on ne dit rien : elle a répondu vite, une phrase
   d'attente ne ferait que retarder la vraie réponse. */
export const SEUIL_MS = 800;

const au_hasard = <T,>(liste: T[]): T | null =>
  liste.length ? liste[Math.floor(Math.random() * liste.length)] : null;

export type Contexte = {
  /** Depuis combien de temps on attend, en millisecondes. */
  attenteMs: number;
  /** L'identifiant de la phrase servie la fois d'avant — on ne la répète pas. */
  dernierId?: string | null;
  /** BIA connaît-elle déjà le prénom de la personne ? */
  nomConnu?: boolean;
  /** L'a-t-elle déjà demandé dans cette session ? */
  nomDejaDemande?: boolean;
  /** Autorise-t-on une question sociale à ce tour ? (une fois sur trois) */
  social?: boolean;
};

/** La phrase à dire, ou null s'il vaut mieux se taire. */
export function choisirAttente(c: Contexte): Attente | null {
  if (c.attenteMs < SEUIL_MS) return null;

  const libres = (moments: Moment[]) =>
    ATTENTES.filter((a) => moments.includes(a.quand) && a.id !== c.dernierId);

  // Attente inhabituelle : elle explique, c'est ce qui se supporte le mieux.
  if (c.attenteMs >= 6000) return au_hasard(libres(["long"])) || au_hasard(libres(["moyen"]));

  // Court : elle fait seulement savoir qu'elle a entendu.
  if (c.attenteMs < 2500) return au_hasard(libres(["court"]));

  // Entre les deux, il y a de la place pour un vrai tour de parole.
  if (!c.nomConnu && !c.nomDejaDemande) {
    const nom = libres(["nom"])[0];
    if (nom) return nom;
  }
  if (c.social) {
    const social = au_hasard(libres(["social"]));
    if (social) return social;
  }
  return au_hasard(libres(["moyen"]));
}

/** Le texte à prononcer, dans la langue où l'on écrit à BIA. */
export function texteAttente(a: Attente, langue: "wo" | "fr"): string {
  return langue === "fr" ? a.fr : a.wo;
}
