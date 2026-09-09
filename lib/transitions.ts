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

/* Les trois premières longueurs sont celles de la fiche d’origine. Les trois
   suivantes sont nées de la mesure : il manquait tout le haut de la gamme, et
   le milieu, entre quatre et sept secondes. */
export type Duree = "courte" | "moyenne" | "longue" | "ample" | "tres_longue" | "immense";

/** Les longueurs, du plus court au plus long. */
export const DUREES: Duree[] = ["courte", "moyenne", "ample", "longue", "tres_longue", "immense"];

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

  /* ── Les seize de la mesure ──────────────────────────────────────────
     Écrites en français d’après les durées qui manquaient — l’attente
     mesurée le 9 septembre 2026 était de seize secondes et demie, quand la
     plus longue phrase existante en faisait huit — puis traduites par
     Lamine en wolof urbain de Dakar. Comme les quarante premières : ne les
     réécris pas sans lui. */
  { n: 41, duree: "ample", ton: "attentive", comprend: false,
    wo: "Waaw, dégg naa la bu baax. Bayyi ma tuuti ma xool ko comme il faut.",
    fr: "Oui, je t’ai bien entendu. Laisse-moi juste le temps de regarder ça comme il faut." },
  { n: 42, duree: "ample", ton: "rassurante", comprend: false,
    wo: "D’accord, bul souci dara. Maa ngi ci, te dinaa la tontu dans un petit instant.",
    fr: "D’accord, ne t’inquiète pas du tout. Je m’en occupe, et je reviens vers toi dans un instant." },
  { n: 43, duree: "ample", ton: "reflechie", comprend: false,
    wo: "Hmm… bëgg naa jël ñaari seconde, xalaat ko bu baax avant ma wax la dara ci lii.",
    fr: "Hmm… je préfère prendre deux secondes pour bien y réfléchir avant de te dire quoi que ce soit." },
  { n: 44, duree: "ample", ton: "chaleureuse", comprend: false,
    wo: "Waaw sama xarit, maa ngi fi ak yaw. Bayyi ma ma rassembler li ma war a wax.",
    fr: "Oui mon ami, je suis là avec toi. Laisse-moi rassembler ce qu’il faut vraiment te dire." },
  { n: 45, duree: "ample", ton: "complice", comprend: false,
    wo: "Yaw de, doo laaj mukk question yu yomb. May ma tuuti pour xool lii bu baax.",
    fr: "Toi alors, tu ne poses jamais les questions faciles. Laisse-moi un petit instant pour ça." },
  { n: 46, duree: "ample", ton: "calme", comprend: true,
    wo: "Comprendre naa bu baax li ngay laaj. Maa ngi organiser sama réponse, ma ñëw.",
    fr: "J’ai bien compris ce que tu demandes. Je mets de l’ordre dans ma réponse et j’arrive." },
  { n: 47, duree: "tres_longue", ton: "rassurante", comprend: true,
    wo: "D’accord, comprendre naa bu baax li ngay laaj. Bayyi ma ma xool ko ci bépp côté, ndax bëgg naa jox la réponse bu juste te utile, waaye du réponse bu gaaw rekk. Maa ngi ci.",
    fr: "D’accord, j’ai bien compris ce que tu me demandes là. Laisse-moi le temps de regarder ça sous tous les angles, parce que je préfère te donner une réponse juste plutôt qu’une réponse rapide." },
  { n: 48, duree: "tres_longue", ton: "reflechie", comprend: false,
    wo: "Hmm… li nga wax dafa tax ma xalaat, ndax mën nañu ko gis ci plusieurs façons. Bayyi ma ma peser lépp tuuti, après dinaa la wax li ma ci gën a gis dëgg.",
    fr: "Hmm… ce que tu dis me fait vraiment réfléchir, parce qu’il y a plusieurs façons de le voir. Laisse-moi peser tout ça un instant, et je te dirai ce qui me paraît le plus vrai." },
  { n: 49, duree: "tres_longue", ton: "chaleureuse", comprend: true,
    wo: "Waaw sama xarit, gis naa bu baax li nga bëgg xam. Bayyi ma tuuti ma seet li dina la gën a jariñ, ndax réponse bu incomplète du la yóbbu fenn, te loolu neexul ma.",
    fr: "Oui mon ami, je vois très bien ce que tu veux savoir. Laisse-moi juste le temps de chercher ce qui te sera vraiment utile, parce qu’une réponse à moitié ne t’avancerait à rien." },
  { n: 50, duree: "tres_longue", ton: "attentive", comprend: false,
    wo: "Waaw, dégg naa la dale ci début ba ci fin, te bàyyiwuma benn détail ci li nga wax. Léegi, bayyi ma ma xool ko tranquillement ngir sama réponse mën laa jariñ.",
    fr: "Oui, je t’ai entendu du début à la fin, et je n’ai rien perdu de ce que tu as dit. Maintenant laisse-moi regarder ça tranquillement pour que ma réponse te serve vraiment." },
  { n: 51, duree: "tres_longue", ton: "serieuse", comprend: true,
    wo: "Li ngay laaj dafa important, te bëgguma la tontu à la légère. May ma ma examiner lépp bu baax, après dinaa la wax li ma ci xalaat franchement te ak lu leer.",
    fr: "Ce que tu me demandes est important, et je ne veux pas te répondre à la légère. Donne-moi le temps de bien examiner tout ça, et je te dirai ce que j’en pense honnêtement." },
  { n: 52, duree: "tres_longue", ton: "douce", comprend: false,
    wo: "D’accord, déglu naa la bu baax. Toogal ak man tuuti, ma dajale lépp li ma soxla, après dinaa la expliquer ko tranquillement, dale ci début ba ci fin.",
    fr: "D’accord, j’ai bien écouté. Reste avec moi un instant, le temps que je réunisse tout ce qu’il faut, et après je t’explique ça calmement, du début jusqu’à la fin." },
  { n: 53, duree: "immense", ton: "rassurante", comprend: true,
    wo: "D’accord, comprendre naa sa question bi te maa ngi ko gardé ci sama xel. Bayyi ma ma xool ko ci bépp côté, ndax ci ce genre de chose, réponse bu gaaw du jariñ dara. Toogal ak man tuuti, maa ngi ñëw, te bul souci dara.",
    fr: "D’accord, j’ai bien compris ta question et je la garde en tête. Laisse-moi le temps de la regarder sous tous ses angles, parce que sur ce genre de chose une réponse trop rapide ne sert à rien du tout. Reste avec moi, j’arrive tout de suite." },
  { n: 54, duree: "immense", ton: "reflechie", comprend: false,
    wo: "Hmm… li nga wax dafa mérite ñu xool ko bu baax. Mën nañu ko gis ci plusieurs façons, te bëgguma jël première réponse bi ma gis. Bayyi ma ma peser lépp tranquillement, après dinaa la wax li ma ci gën a gis juste.",
    fr: "Hmm… ce que tu me dis là mérite qu’on s’y arrête un peu. Il y a plusieurs façons de le voir, et je n’ai pas envie de choisir la première venue. Laisse-moi peser tout ça calmement, et après je te dis ce qui me paraît le plus juste." },
  { n: 55, duree: "immense", ton: "chaleureuse", comprend: true,
    wo: "Waaw sama xarit, gis naa exactement fu ngay jëm, te sa question bi baax na. Bayyi ma tuuti ma seet li dina la gën a jariñ, du li neex rekk ci dégg. Bëgg naa jox la réponse bu solide te utile. Bayyi ma ma xool ko bu baax.",
    fr: "Oui mon ami, je vois exactement où tu veux en venir, et c’est une bonne question. Laisse-moi juste le temps de chercher ce qui va vraiment t’aider, pas ce qui sonne bien. Je préfère te faire attendre un peu et te donner quelque chose de solide." },
  { n: 56, duree: "immense", ton: "attentive", comprend: false,
    wo: "Waaw, topp naa la dale ci début ba ci fin, te bàyyiwuma benn détail ci li nga wax. Léegi, bayyi ma ma organiser lépp ci sama xel, ngir réponse bi ma lay jox mën laa jariñ dëgg-dëgg, te nekk lu leer te utile.",
    fr: "Oui, je t’ai suivi du début à la fin, et je n’ai rien laissé passer de ce que tu as dit. Maintenant laisse-moi le temps de mettre tout ça en ordre dans ma tête, pour que ce que je vais te répondre te serve vraiment à quelque chose." },
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
