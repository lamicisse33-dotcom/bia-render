/* Ce que BIA dit à l'instant où le micro se coupe.

   Après la parole, l'attente est certaine : il faut transcrire, interroger le
   modèle, puis fabriquer la voix. Trois attentes qui s'additionnent. Une
   phrase à ce moment-là n'est jamais de trop — et ce n'est pas du
   remplissage : quelqu'un qui vient de parler dans le vide se demande
   d'abord si on l'a entendu.

   Les 40 phrases sont de Lamine, en wolof urbain de Dakar. Ne les réécris
   pas sans lui.

   Un champ n'est pas dans sa fiche et mérite une explication : `comprend`.
   Neuf de ces phrases annoncent que BIA a COMPRIS. Or à la seconde où le
   micro se coupe, la transcription n'est pas encore revenue : elle n'a
   strictement rien reçu. Si la transcription échoue et qu'elle vient de dire
   « j'ai compris », elle perd d'un coup ce que l'accusé de réception venait
   de gagner. Ces neuf-là sont donc réservées au second moment, celui où le
   texte est bien arrivé et où le modèle réfléchit. */

export type Duree = "courte" | "moyenne" | "longue";

export type Transition = {
  n: number;
  duree: Duree;
  /** Le ton indiqué par Lamine : il guide l'expression du visage. */
  ton: string;
  /** La phrase annonce-t-elle avoir compris, et pas seulement entendu ? */
  comprend: boolean;
  wo: string;
  fr: string;
};

export const TRANSITIONS: Transition[] = [
  { n:  1, duree: "courte", ton: "attentive", comprend: false,
    wo: "Waaw, dégg naa la bu baax.",
    fr: "Oui, je t’ai bien entendu." },
  { n:  2, duree: "courte", ton: "calme", comprend: true,
    wo: "D’accord, comprendre naa li nga wax.",
    fr: "D’accord, j’ai compris ce que tu dis." },
  { n:  3, duree: "courte", ton: "souriante", comprend: false,
    wo: "Waaw, sa question bi neex na ma.",
    fr: "Oui, ta question me plaît." },
  { n:  4, duree: "courte", ton: "reflechie", comprend: false,
    wo: "Hmm… li nga wax intéressant na.",
    fr: "Hmm… ce que tu dis est intéressant." },
  { n:  5, duree: "courte", ton: "complice", comprend: false,
    wo: "Waaw yaw, xam nga ni ngay laaj de.",
    fr: "Toi, tu sais vraiment poser des questions." },
  { n:  6, duree: "courte", ton: "rassurante", comprend: true,
    wo: "D’accord, maa ngi ànd ak yaw.",
    fr: "D’accord, je te suis." },
  { n:  7, duree: "courte", ton: "curieuse", comprend: false,
    wo: "Ah bon ? Loolu intéressant na dé.",
    fr: "Ah bon ? C’est vraiment intéressant." },
  { n:  8, duree: "courte", ton: "naturelle", comprend: false,
    wo: "Waaw, gis naa fu ngay jëm.",
    fr: "Oui, je vois où tu veux en venir." },
  { n:  9, duree: "courte", ton: "chaleureuse", comprend: false,
    wo: "D’accord sama xarit, dégg naa la.",
    fr: "D’accord mon ami, je t’ai entendu." },
  { n: 10, duree: "courte", ton: "amusee", comprend: false,
    wo: "Héé yaw, question bii am na solo dé.",
    fr: "Eh toi, cette question est importante." },
  { n: 11, duree: "moyenne", ton: "attentive", comprend: false,
    wo: "Waaw, dégg naa li nga wax. May ma xool ko bu baax.",
    fr: "Oui, j’ai entendu ce que tu dis. Laisse-moi bien regarder." },
  { n: 12, duree: "moyenne", ton: "reflechie", comprend: false,
    wo: "Hmm… sa question bi dafa intéressant. Ma ngi ko xool bu baax.",
    fr: "Hmm… ta question est intéressante. Je l’examine attentivement." },
  { n: 13, duree: "moyenne", ton: "rassurante", comprend: false,
    wo: "D’accord, jot naa sa message bi. Dinaa la tontu bu leer.",
    fr: "D’accord, j’ai reçu ton message. Je vais te répondre clairement." },
  { n: 14, duree: "moyenne", ton: "souriante", comprend: false,
    wo: "Waaw yaw, li nga wax dafa neex. May ma xalaat ci tuuti.",
    fr: "Oui, ce que tu dis est intéressant. Laisse-moi y réfléchir un peu." },
  { n: 15, duree: "moyenne", ton: "calme", comprend: true,
    wo: "Comprendre naa sa question bi. Bayyi ma ma organiser sama réponse.",
    fr: "J’ai compris ta question. Laisse-moi organiser ma réponse." },
  { n: 16, duree: "moyenne", ton: "complice", comprend: false,
    wo: "Yaw de, sa question bi yombul. Waaye maa ngi ci.",
    fr: "Toi alors, ta question n’est pas simple. Mais je m’en occupe." },
  { n: 17, duree: "moyenne", ton: "naturelle", comprend: true,
    wo: "Waaw, gis naa li nga bëgg xam. May ma xool détails yi.",
    fr: "Oui, je vois ce que tu veux savoir. Laisse-moi vérifier les détails." },
  { n: 18, duree: "moyenne", ton: "chaleureuse", comprend: false,
    wo: "D’accord sama xarit, sa question bi leer na. Maa ngi ci.",
    fr: "D’accord mon ami, ta question est claire. Je m’en occupe." },
  { n: 19, duree: "moyenne", ton: "reflechie", comprend: false,
    wo: "Hmm… lii dafa laaj réflexion tuuti. Bayyi ma ma xool.",
    fr: "Hmm… cela demande un peu de réflexion. Laisse-moi regarder." },
  { n: 20, duree: "moyenne", ton: "enjouee", comprend: false,
    wo: "Sa question bi dafa réveiller sama cerveau dé. Maa ngi ci.",
    fr: "Ta question vient de réveiller mon cerveau. Je m’en occupe." },
  { n: 21, duree: "moyenne", ton: "attentive", comprend: false,
    wo: "Waaw, dégg naa la. Bëgg naa la jox réponse bu am solo.",
    fr: "Oui, je t’ai entendu. Je veux te donner une réponse utile." },
  { n: 22, duree: "moyenne", ton: "douce", comprend: false,
    wo: "D’accord, nopp naa ci li nga wax. May ma ko xool tranquillement.",
    fr: "D’accord, j’ai bien écouté. Laisse-moi l’examiner tranquillement." },
  { n: 23, duree: "moyenne", ton: "serieuse", comprend: false,
    wo: "Sa question bi important na. Dinaa ko traiter ak attention.",
    fr: "Ta question est importante. Je vais la traiter avec attention." },
  { n: 24, duree: "moyenne", ton: "complice", comprend: false,
    wo: "Waaw yaw, japp nga ma ci question bu neex. Maa ngi ci.",
    fr: "Tu m’as posé une belle question. Je m’en occupe." },
  { n: 25, duree: "moyenne", ton: "rassurante", comprend: true,
    wo: "Dégg naa li nga bëgg. Dinaa la jox réponse bi gën a adapté.",
    fr: "J’ai compris ce que tu veux. Je vais te donner la réponse la plus adaptée." },
  { n: 26, duree: "moyenne", ton: "naturelle", comprend: false,
    wo: "D’accord, sa demande bi leer na. May ma xool li gën a baax.",
    fr: "D’accord, ta demande est claire. Laisse-moi voir ce qui convient le mieux." },
  { n: 27, duree: "moyenne", ton: "amusee", comprend: false,
    wo: "Héé, question bii dafa am niveau dé. May ma xalaat tuuti.",
    fr: "Eh, cette question a du niveau. Laisse-moi réfléchir un peu." },
  { n: 28, duree: "moyenne", ton: "calme", comprend: false,
    wo: "Waaw, jot naa li nga wax. Maa ngi préparer réponse bu leer.",
    fr: "Oui, j’ai reçu ce que tu dis. Je prépare une réponse claire." },
  { n: 29, duree: "moyenne", ton: "curieuse", comprend: false,
    wo: "Li nga wax dafa am solo. Bëgg naa ko comprendre bu baax.",
    fr: "Ce que tu dis est important. Je veux bien le comprendre." },
  { n: 30, duree: "moyenne", ton: "chaleureuse", comprend: false,
    wo: "Waaw sama xarit, maa ngi déglu. Dinaa la tontu bu baax.",
    fr: "Oui mon ami, je t’écoute. Je vais bien te répondre." },
  { n: 31, duree: "longue", ton: "attentive", comprend: true,
    wo: "Waaw, dégg naa la bu baax te gis naa li nga bëgg xam. Bayyi ma ma xool ko ngir jox la réponse bu leer.",
    fr: "Oui, je t’ai bien entendu et je vois ce que tu veux savoir. Laisse-moi l’examiner pour te donner une réponse claire." },
  { n: 32, duree: "longue", ton: "rassurante", comprend: false,
    wo: "D’accord sama xarit, jot naa sa question bi. May ma analyser ko tuuti ngir sama réponse gën a adapté ci yaw.",
    fr: "D’accord mon ami, j’ai reçu ta question. Laisse-moi l’analyser un peu pour que ma réponse soit mieux adaptée à toi." },
  { n: 33, duree: "longue", ton: "reflechie", comprend: false,
    wo: "Hmm… li nga wax dafa intéressant te am na plusieurs côtés. Bayyi ma ma xool ko bu baax avant ma tontu la.",
    fr: "Hmm… ce que tu dis est intéressant et comporte plusieurs aspects. Laisse-moi bien l’examiner avant de te répondre." },
  { n: 34, duree: "longue", ton: "souriante", comprend: false,
    wo: "Waaw yaw, sa question bi dafa neex te tax ma xalaat. May ma organiser réponse bi ngir mu nekk simple te leer.",
    fr: "Ta question est intéressante et me fait réfléchir. Laisse-moi organiser la réponse pour qu’elle soit simple et claire." },
  { n: 35, duree: "longue", ton: "calme", comprend: true,
    wo: "Dégg naa li nga wax, te comprendre naa sa demande bi. Dinaa xool détails yi ngir bañ laa jox réponse bu gaaw rekk.",
    fr: "J’ai entendu et compris ta demande. Je vais examiner les détails pour ne pas te donner une réponse simplement rapide." },
  { n: 36, duree: "longue", ton: "complice", comprend: false,
    wo: "Yaw de, sa question bi dafa am solo te yombul. Waaye bul souci, maa ngi ci te dinaa la tontu bu baax.",
    fr: "Ta question est importante et pas simple. Mais ne t’inquiète pas, je m’en occupe et je vais bien te répondre." },
  { n: 37, duree: "longue", ton: "chaleureuse", comprend: true,
    wo: "Waaw sama xarit, maa ngi ànd ak yaw. Bayyi ma ma seet li gën a logique ngir jox la conseil bu utile.",
    fr: "Oui mon ami, je te suis. Laisse-moi chercher ce qui est le plus logique pour te donner un conseil utile." },
  { n: 38, duree: "longue", ton: "professionnelle", comprend: false,
    wo: "D’accord, sa demande bi leer na. Maa ngi xool informations yi ak attention ngir réponse bi nekk précis te facile à comprendre.",
    fr: "D’accord, ta demande est claire. J’examine les informations avec attention afin que la réponse soit précise et facile à comprendre." },
  { n: 39, duree: "longue", ton: "amusee", comprend: false,
    wo: "Héé yaw, sa question bi dafa tax sama cerveau tàmbali marathon. Bayyi ma ma xool ko bu baax, après dinaa la wax li ma ci gis.",
    fr: "Ta question vient de lancer mon cerveau dans un marathon. Laisse-moi bien l’examiner, puis je te dirai ce que j’en pense." },
  { n: 40, duree: "longue", ton: "rassurante", comprend: true,
    wo: "Waaw, dégg naa la te comprendre naa li ngay wax. Bayyi ma ma xool ko bu baax, ngir jox la réponse bi gën a adapté ci sa situation.",
    fr: "Oui, je t’ai entendu et j’ai compris ce que tu dis. Laisse-moi bien l’examiner afin de te donner la réponse la plus adaptée à ta situation." },
];

/* Le ton de la phrase donne l'expression, comme pour les émotions du modèle. */
export const TON_VERS_VISAGE: Record<string, string> = {
  attentive: "ecoute", calme: "douce", souriante: "douce", reflechie: "pensive",
  complice: "malice", rassurante: "douce", curieuse: "etonnement",
  naturelle: "yeux_ouverts", chaleureuse: "joie", amusee: "malice",
  enjouee: "joie", douce: "douce", serieuse: "concernee",
  professionnelle: "ecoute",
};

/* « Éviter une phrase trop amusée si la personne parle d'un sujet grave ou
   sensible » — règle de Lamine. On ne devine pas le sujet : on repère les
   mots qui ne laissent aucun doute. */
const TONS_LEGERS = new Set(["amusee", "enjouee", "complice", "souriante"]);
const MOTS_GRAVES = [
  "violence", "frappe", "frapper", "battu", "menace", "tuer", "mort", "mourir",
  "viol", "forcer", "harcele", "chantage", "divorce", "separation", "malade",
  "maladie", "hopital", "cancer", "deuil", "pleure", "pleurer", "peur",
  "suicide", "depression", "accident", "perdu", "danger", "secours",
  "metti", "ragal", "dee", "tawat", "jooy",
];

const normaliser = (t: string) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ");

export function sujetGrave(texte: string): boolean {
  const mots = new Set(normaliser(texte).split(" ").filter(Boolean));
  return MOTS_GRAVES.some((m) => mots.has(m));
}

export type Choix = {
  /** Laisser vide pour ne filtrer sur aucune longueur : c'est alors la durée
      mesurée qui décide, phrase par phrase (voir lib/chrono.ts). */
  duree?: Duree;
  /** Les cinq dernières phrases servies : on n'en reprend aucune. */
  recentes: number[];
  /** Le texte que la personne vient de dire, pour écarter les tons légers. */
  contexte?: string;
  /** La transcription est-elle revenue ? Sinon, pas de « j'ai compris ». */
  transcrit?: boolean;
  /** Le ton de la phrase précédente : on alterne. */
  tonPrecedent?: string | null;
};

/* Toutes les phrases que les règles de Lamine autorisent à cet instant.
   C'est la liste, pas le choix : celui qui appelle peut ensuite prendre au
   hasard (choisirTransition) ou prendre celle dont la durée remplit le mieux
   l'attente mesurée (pourRemplir, dans lib/chrono.ts). */
export function candidatsTransition(c: Choix): Transition[] {
  const grave = c.contexte ? sujetGrave(c.contexte) : false;
  const recentes = new Set(c.recentes || []);
  const bonneLongueur = (t: Transition) => !c.duree || t.duree === c.duree;
  const admissible = (t: Transition) =>
    bonneLongueur(t) &&
    (c.transcrit !== false || !t.comprend) &&
    !(grave && TONS_LEGERS.has(t.ton));

  let libres = TRANSITIONS.filter((t) => admissible(t) && !recentes.has(t.n));

  // Si la règle des cinq dernières ne laisse plus rien, on la relâche : mieux
  // vaut répéter une phrase que se taire au moment où il faut parler.
  if (!libres.length) libres = TRANSITIONS.filter(admissible);
  if (!libres.length) return [];

  // « Alterner les tons » : on écarte le ton qu'on vient d'employer, tant
  // qu'il reste autre chose.
  const varies = c.tonPrecedent ? libres.filter((t) => t.ton !== c.tonPrecedent) : libres;
  return varies.length ? varies : libres;
}

/** La phrase à dire, ou null s'il n'en reste aucune d'acceptable. */
export function choisirTransition(c: Choix): Transition | null {
  const liste = candidatsTransition(c);
  if (!liste.length) return null;
  return liste[Math.floor(Math.random() * liste.length)];
}
