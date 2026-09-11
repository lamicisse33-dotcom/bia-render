import { lexiqueConfig } from "./lexique";

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

export type Entree = {
  /** Le nom du fichier son, et la clé de l'entrée. */
  cle: string;
  /** Ce qu'elle dit. C'est ce texte qui est enregistré, mot pour mot. */
  wolof: string;
  /** La même chose en français, pour qui lui écrit en français. */
  francais: string;
  /** Les formes qui doivent déclencher cette réponse, sans accent, en
      minuscules. Une seule suffit — mais elle doit être franche. */
  formes: string[];
  /** L'humeur du visage pendant qu'elle le dit. */
  emotion?: string;
};

/* ── LES TEXTES ─────────────────────────────────────────────────────────────

   ÉCRITS PAR MOI, À RELIRE PAR LAMINE AVANT TOUT ENREGISTREMENT. Mon wolof
   est celui d'un livre ; le sien est celui de Dakar, et c'est le seul qui
   compte. Tant que `RELU` vaut false, rien ne s'enregistre : on n'achète pas
   quarante fichiers audio pour découvrir ensuite qu'une phrase sur trois sonne
   faux. Le jour où il a corrigé les textes, on passe RELU à true et on
   enregistre une fois. */
export const RELU = false;

export const REPERTOIRE: Entree[] = [
  /* ── LES SALUTATIONS ──────────────────────────────────────────────────── */
  {
    cle: "salut",
    wolof: "Salaam. Maa ngi fi. Loo bëgg ?",
    francais: "Bonjour. Je suis là. Que veux-tu ?",
    formes: ["salam", "salaam", "asalamalekoum", "salamalekoum", "bonjour", "bonsoir", "salut", "nanga def", "naka nga def", "na nga def", "nanga def"],
    emotion: "douce",
  },
  {
    cle: "ca-va",
    wolof: "Maa ngi sant. Yow nag, naka nga def ?",
    francais: "Ça va bien, merci. Et toi ?",
    formes: ["ca va", "comment vas tu", "comment tu vas", "jamm nga am", "mbaa sa yaram jamm", "naka nga yendoo", "naka suba si"],
    emotion: "douce",
  },
  {
    cle: "merci",
    wolof: "Amul solo. Maa ngi fi.",
    francais: "De rien. Je suis là.",
    formes: ["merci", "jerejef", "jërëjëf", "jaraama", "merci beaucoup"],
    emotion: "douce",
  },
  {
    cle: "au-revoir",
    wolof: "Ba beneen yoon. Maa ngi lay xaar.",
    francais: "À bientôt. Je t'attends.",
    formes: ["au revoir", "ba beneen", "ba beneen yoon", "a bientot", "bonne nuit", "fanaanal jamm"],
    emotion: "douce",
  },

  /* ── QUI ELLE EST ─────────────────────────────────────────────────────── */
  {
    cle: "qui-es-tu",
    wolof: "Man maa di BIA, intelligence artificielle bu KHALAM defar ci Dakar. Wolof mooy sama làkk.",
    francais: "Je suis BIA, une intelligence artificielle créée par KHALAM à Dakar. Le wolof est ma langue.",
    formes: ["qui es tu", "qui est tu", "tu es qui", "kan nga", "yaa di kan", "yow kan nga", "presente toi", "qui etes vous"],
    emotion: "douce",
  },
  {
    cle: "ton-nom",
    wolof: "Sama tur mooy BIA.",
    francais: "Je m'appelle BIA.",
    formes: ["comment tu t appelles", "quel est ton nom", "ton nom", "naka la tudd", "noo tudd", "sa tur"],
  },
  {
    cle: "qui-t-a-faite",
    wolof: "KHALAM moo ma defar, ci Dakar. Kha ak Lamine ñoo ko sos.",
    francais: "C'est KHALAM qui m'a créée, à Dakar. Kha et Lamine l'ont fondée.",
    formes: ["qui t a cree", "qui t a creee", "qui t a creer", "qui t a faite", "qui t a fait", "kan moo la defar", "qui est ton createur", "qui t a developpe", "qui t a fabrique"],
  },
  {
    cle: "es-tu-humaine",
    wolof: "Déedéet, nit laa woo. Intelligence artificielle laa — waaye maa ngi fi ci sa kanam.",
    francais: "Non, je ne suis pas une personne. Je suis une intelligence artificielle — mais je suis là, devant toi.",
    formes: ["es tu humaine", "tu es un robot", "es tu un robot", "es tu une vraie personne", "nit nga", "ndax nit nga"],
  },

  /* ── CE QU'ELLE SAIT FAIRE ────────────────────────────────────────────── */
  {
    cle: "que-sais-tu-faire",
    wolof: "Mën naa la dimbali ci lu bari : laaj yi, bind ay bataaxal ak ay devis, jàng ay kayit yu nga fotoo, wut ay nataal ci internet. Laajal ma rek.",
    francais: "Je peux t'aider sur beaucoup de choses : répondre à tes questions, écrire des messages et des devis, lire des papiers que tu photographies, chercher des images sur Internet. Demande-moi, simplement.",
    formes: ["que sais tu faire", "qu est ce que tu sais faire", "tu peux faire quoi", "tu sers a quoi", "loo mën def", "lan nga mën def", "comment tu peux m aider"],
  },
  {
    cle: "parles-tu-wolof",
    wolof: "Waaw, wolof mooy sama làkk bu njëkk. Mën naa itam wax français.",
    francais: "Oui, le wolof est ma première langue. Je parle aussi français.",
    formes: ["tu parles wolof", "parles tu wolof", "ndax dégg nga wolof", "degg nga wolof", "tu parles quelle langue", "quelles langues tu parles"],
  },

  /* ── KHALAM ───────────────────────────────────────────────────────────── */
  {
    cle: "khalam",
    wolof: "KHALAM mooy ab studio bu nekk Dakar : dañuy defar ay jeu, ay application ak ay contenu ci wolof.",
    francais: "KHALAM est un studio basé à Dakar : nous créons des jeux, des applications et des contenus en wolof.",
    formes: ["c est quoi khalam", "khalam c est quoi", "parle moi de khalam", "lan mooy khalam", "khalam"],
  },
];

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
