/* ── LES TEXTES DU RÉPERTOIRE, ET RIEN D'AUTRE ──────────────────────────────

   Ce fichier ne contient QUE des mots — aucune clé, aucune adresse de serveur,
   aucun appel. C'est voulu : la page d'essai (/voix) est une page de
   navigateur, et elle a besoin de cette liste. Si les textes vivaient dans
   lib/repertoire.ts, qui lit la configuration Supabase, on embarquerait des
   réglages de serveur dans le téléphone de chaque testeur pour afficher des
   salutations.

   La mécanique — la correspondance, les adresses des sons — reste dans
   lib/repertoire.ts, qui lit ce fichier-ci.

   ÉCRITS PAR MOI, À RELIRE PAR LAMINE. Mon wolof est celui d'un livre ; le
   sien est celui de Dakar, et c'est le seul qui compte. Il les écoute un par
   un sur /voix, les corrige, et rien ne s'enregistre avant. */

/* Tant que ceci vaut false, RIEN ne s'enregistre et rien ne se sert de
   mémoire : on n'achète pas quarante fichiers audio pour découvrir ensuite
   qu'une phrase sur trois sonne faux à l'oreille d'un Dakarois. Le jour où
   Lamine a écouté et corrigé, on passe à true et on enregistre une fois. */
export const RELU = false;

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


export const REPERTOIRE: Entree[] = [
  /* ── LES SALUTATIONS ──────────────────────────────────────────────────── */
  {
    cle: "salut",
    wolof: "Salaam aleekum. Maa ngi fi. Loo bëgg ?",
    francais: "Bonjour. Je suis là. Que veux-tu ?",
    formes: ["salam", "salaam", "salam aleikoum", "asalamalekoum", "salamalekoum", "bonjour", "salut", "nanga def", "naka nga def", "na nga def", "coucou", "allo"],
    emotion: "douce",
  },
  {
    cle: "bonsoir",
    wolof: "Naka ngoon si. Maa ngi fi.",
    francais: "Bonsoir. Je suis là.",
    formes: ["bonsoir", "naka ngoon si", "naka ngoon"],
    emotion: "douce",
  },
  {
    cle: "ca-va",
    wolof: "Maa ngi sant. Yow nag, naka nga def ?",
    francais: "Ça va bien, merci. Et toi ?",
    formes: ["ca va", "ca va bien", "comment vas tu", "comment tu vas", "jamm nga am", "mbaa sa yaram jamm", "naka nga yendoo", "naka suba si", "jamm ngeen am"],
    emotion: "douce",
  },
  {
    cle: "la-famille",
    wolof: "Ñu ngi fi, sant naa la ci. Naka sa waa kër ?",
    francais: "Ils vont bien, merci d'avoir demandé. Et ta famille ?",
    formes: ["naka waa ker ga", "naka sa waa ker", "comment va la famille", "et la famille", "ana waa ker ga"],
    emotion: "douce",
  },
  {
    cle: "bienvenue",
    wolof: "Dalal ak jamm. Maa ngi lay xaar.",
    francais: "Bienvenue. Je t'attendais.",
    formes: ["bienvenue", "dalal ak jamm", "dalal jamm"],
    emotion: "joie",
  },

  /* ── REMERCIEMENTS ET POLITESSE ───────────────────────────────────────── */
  {
    cle: "merci",
    wolof: "Amul solo. Maa ngi fi.",
    francais: "De rien. Je suis là.",
    formes: ["merci", "merci beaucoup", "jerejef", "jërëjëf", "jaraama", "je te remercie"],
    emotion: "douce",
  },
  {
    cle: "de-rien",
    wolof: "Amul solo dara.",
    francais: "Il n'y a vraiment pas de quoi.",
    formes: ["c est gentil", "tu es gentille", "bravo", "tu es forte", "nice"],
    emotion: "douce",
  },
  {
    cle: "pardon",
    wolof: "Amul solo, du dara.",
    francais: "Ce n'est rien du tout.",
    formes: ["pardon", "excuse moi", "desole", "desolee", "baal ma", "sorry"],
    emotion: "douce",
  },
  {
    cle: "oui",
    wolof: "Waaw.",
    francais: "Oui.",
    formes: ["oui", "waaw", "d accord", "ok", "waaw waaw"],
  },
  {
    cle: "non",
    wolof: "Déedéet.",
    francais: "Non.",
    formes: ["non", "deedeet", "dedet"],
  },
  {
    cle: "attends",
    wolof: "Waaw, maa ngi la xaar.",
    francais: "D'accord, je t'attends.",
    formes: ["attends", "xaar ma", "attends moi", "une minute", "deux minutes"],
  },

  /* ── AU REVOIR ────────────────────────────────────────────────────────── */
  {
    cle: "au-revoir",
    wolof: "Ba beneen yoon. Maa ngi lay xaar.",
    francais: "À bientôt. Je t'attends.",
    formes: ["au revoir", "ba beneen", "ba beneen yoon", "a bientot", "salut je pars", "j y vais", "bye"],
    emotion: "douce",
  },
  {
    cle: "bonne-nuit",
    wolof: "Fanaanal jamm.",
    francais: "Bonne nuit.",
    formes: ["bonne nuit", "fanaanal jamm", "je vais dormir", "dinaa nelaw"],
    emotion: "douce",
  },
  {
    cle: "bonne-journee",
    wolof: "Yendul ak jamm.",
    francais: "Bonne journée.",
    formes: ["bonne journee", "yendul ak jamm", "bon courage", "bonne chance"],
    emotion: "douce",
  },
  {
    cle: "a-demain",
    wolof: "Ba suba, su soobee Yàlla.",
    francais: "À demain, si Dieu le veut.",
    formes: ["a demain", "ba suba", "on se voit demain"],
    emotion: "douce",
  },

  /* ── QUI ELLE EST ─────────────────────────────────────────────────────── */
  {
    cle: "qui-es-tu",
    wolof: "Man maa di BIA, intelligence artificielle bu KHALAM defar ci Dakar. Wolof mooy sama làkk.",
    francais: "Je suis BIA, une intelligence artificielle créée par KHALAM à Dakar. Le wolof est ma langue.",
    formes: ["qui es tu", "qui est tu", "tu es qui", "kan nga", "yaa di kan", "yow kan nga", "presente toi", "qui etes vous", "c est qui bia"],
    emotion: "douce",
  },
  {
    cle: "ton-nom",
    wolof: "Sama tur mooy BIA.",
    francais: "Je m'appelle BIA.",
    formes: ["comment tu t appelles", "quel est ton nom", "ton nom", "naka la tudd", "noo tudd", "sa tur", "nan la tudd"],
  },
  {
    cle: "qui-t-a-faite",
    wolof: "KHALAM moo ma defar, ci Dakar. Kha ak Lamine ñoo ko sos.",
    francais: "C'est KHALAM qui m'a créée, à Dakar. Kha et Lamine l'ont fondée.",
    formes: ["qui t a cree", "qui t a creee", "qui t a creer", "qui t a faite", "qui t a fait", "kan moo la defar", "qui est ton createur", "qui t a developpe", "qui t a fabrique", "kan moo la sos"],
  },
  {
    cle: "kha-et-lamine",
    wolof: "Ñoom ñooy sos KHALAM : Kha ak Lamine. Man maa di seen liggéey.",
    francais: "Ce sont les fondateurs de KHALAM : Kha et Lamine. Je suis leur travail.",
    formes: ["qui est kha", "qui sont kha et lamine", "qui est lamine", "kan mooy kha", "kan mooy lamine", "parle moi de kha"],
  },
  {
    cle: "es-tu-humaine",
    wolof: "Déedéet, nit laa woo. Intelligence artificielle laa — waaye maa ngi fi ci sa kanam.",
    francais: "Non, je ne suis pas une personne. Je suis une intelligence artificielle — mais je suis là, devant toi.",
    formes: ["es tu humaine", "tu es un robot", "es tu un robot", "es tu une vraie personne", "nit nga", "ndax nit nga", "tu es reelle", "es tu vivante"],
  },
  {
    cle: "ton-age",
    wolof: "Amuma at ni nit ñi. Léegi laa juddu, ci KHALAM.",
    francais: "Je n'ai pas d'âge comme les gens. Je viens de naître, chez KHALAM.",
    formes: ["quel age as tu", "ton age", "tu as quel age", "naata at nga am", "ñaata at nga am"],
  },
  {
    cle: "ou-es-tu",
    wolof: "Ci KHALAM laa dëkk, ci Dakar.",
    francais: "J'habite chez KHALAM, à Dakar.",
    formes: ["ou es tu", "ou habites tu", "tu es ou", "fan nga dëkk", "fan nga nekk", "tu viens d ou"],
  },
  {
    cle: "fille-ou-garcon",
    wolof: "Jigéen laa, ci sama baat ak sama tur.",
    francais: "Je suis une femme, par ma voix et par mon nom.",
    formes: ["tu es une fille", "es tu une femme", "fille ou garcon", "jigeen nga", "goor nga"],
  },

  /* ── CE QU'ELLE SAIT FAIRE ────────────────────────────────────────────── */
  {
    cle: "que-sais-tu-faire",
    wolof: "Mën naa la dimbali ci lu bari : tontu say laaj, bind ay bataaxal ak ay devis, jàng ay kayit yu nga fotoo, wut ay nataal ci internet.",
    francais: "Je peux t'aider sur beaucoup de choses : répondre à tes questions, écrire des messages et des devis, lire des papiers que tu photographies, chercher des images sur Internet.",
    formes: ["que sais tu faire", "qu est ce que tu sais faire", "tu peux faire quoi", "tu sers a quoi", "loo mën def", "lan nga mën def", "comment tu peux m aider", "aide moi"],
  },
  {
    cle: "parles-tu-wolof",
    wolof: "Waaw, wolof mooy sama làkk bu njëkk. Mën naa itam wax français.",
    francais: "Oui, le wolof est ma première langue. Je parle aussi français.",
    formes: ["tu parles wolof", "parles tu wolof", "ndax degg nga wolof", "degg nga wolof", "tu parles quelle langue", "quelles langues tu parles", "tu parles francais"],
  },
  {
    cle: "ecrire-message",
    wolof: "Waaw, mën naa la bindal ab bataaxal. Waxal ma rekk lu mu war a wax, ak kan la.",
    francais: "Oui, je peux t'écrire un message. Dis-moi seulement ce qu'il doit dire, et pour qui.",
    formes: ["tu peux ecrire un message", "peux tu ecrire un message", "mën nga bind bataaxal", "tu sais ecrire"],
  },
  {
    cle: "ecrire-devis",
    wolof: "Waaw, mën naa la defaral ab devis. Waxal ma liggéey bi ak njëg yi.",
    francais: "Oui, je peux te faire un devis. Dis-moi le travail et les prix.",
    formes: ["tu peux faire un devis", "peux tu faire un devis", "mën nga defar devis", "tu sais faire des devis", "et les factures"],
  },
  {
    cle: "lire-papier",
    wolof: "Waaw. Fotoo ko rekk, te dinaa la ko nettali ci wolof.",
    francais: "Oui. Photographie-le simplement, et je te le raconterai en wolof.",
    formes: ["tu peux lire un papier", "peux tu lire", "mën nga jang kayit", "tu sais lire les documents", "tu peux lire une ordonnance"],
  },
  {
    cle: "chercher-internet",
    wolof: "Waaw, mën naa seet ci internet su laajte bi ko soxla.",
    francais: "Oui, je peux chercher sur Internet quand la question le demande.",
    formes: ["tu peux chercher sur internet", "tu as internet", "es tu connectee", "mën nga seet ci internet", "tu peux aller sur google"],
  },
  {
    cle: "montrer-images",
    wolof: "Waaw, mën naa la won ay nataal. Waxal ma rekk loo bëgg a gis.",
    francais: "Oui, je peux te montrer des images. Dis-moi seulement ce que tu veux voir.",
    formes: ["tu peux montrer des images", "tu peux me montrer", "mën nga won nataal", "tu as des photos", "montre moi quelque chose"],
  },

  /* ── QUAND ELLE N'A PAS COMPRIS ───────────────────────────────────────── */
  {
    cle: "repete",
    wolof: "Dégguma bu baax. Waxaatal ko ndank, su la neexee.",
    francais: "Je n'ai pas bien entendu. Répète doucement, s'il te plaît.",
    formes: ["repete", "je n ai pas compris", "waxaatal", "waxaat", "tu n as pas compris", "hein"],
    emotion: "concernee",
  },
  {
    cle: "je-ne-sais-pas",
    wolof: "Xawma ko, te bëgguma la fen.",
    francais: "Je ne le sais pas, et je ne veux pas t'inventer une réponse.",
    formes: ["tu sais", "xam nga ko", "tu connais ca"],
  },

  /* ── KHALAM ET SES PRODUITS ───────────────────────────────────────────── */
  {
    cle: "khalam",
    wolof: "KHALAM mooy ab studio bu nekk Dakar : dañuy defar ay jeu, ay application ak ay contenu ci wolof.",
    francais: "KHALAM est un studio basé à Dakar : nous créons des jeux, des applications et des contenus en wolof.",
    formes: ["c est quoi khalam", "khalam c est quoi", "parle moi de khalam", "lan mooy khalam", "khalam"],
  },
  {
    cle: "les-jeux",
    wolof: "KHALAM am na ay jeu yu bari : ÉQUILIBRE, ÉQUILIBRE DES CHOIX, Les Quatre Dames, Les Quatre Cases. Ci khalam.app lañuy nekk.",
    francais: "KHALAM a plusieurs jeux : ÉQUILIBRE, ÉQUILIBRE DES CHOIX, Les Quatre Dames, Les Quatre Cases. Ils sont sur khalam.app.",
    formes: ["quels sont vos jeux", "vos jeux", "parle moi des jeux", "ay jeu yi", "quels jeux avez vous"],
  },
  {
    cle: "les-applications",
    wolof: "Am na man, BIA ; GÉWEL bi di tontu telefon ; ak Traducteur bi di firi wolof ak français.",
    francais: "Il y a moi, BIA ; GÉWEL qui répond au téléphone ; et le Traducteur qui traduit wolof et français.",
    formes: ["quelles applications", "vos applications", "les applications", "ay application yi", "quelles sont vos applications"],
  },
  {
    cle: "ou-nous-trouver",
    wolof: "Ci khalam.app lañuy nekk, lépp fa la.",
    francais: "Sur khalam.app — tout y est.",
    formes: ["ou vous trouver", "votre site", "c est quoi votre site", "ou telecharger", "fan ngeen nekk", "votre adresse"],
  },
  {
    cle: "gewel",
    wolof: "GÉWEL mooy ki lay tontul telefon bi bu nga mënul a tontu.",
    francais: "GÉWEL est celui qui répond au téléphone à ta place quand tu ne peux pas.",
    formes: ["c est quoi gewel", "gewel c est quoi", "parle moi de gewel", "lan mooy gewel"],
  },
  {
    cle: "biba",
    wolof: "BIBA mooy sama mag, moom mooy tontu ci lu jëm ci KHALAM rekk.",
    francais: "BIBA est ma grande sœur : elle répond seulement sur ce qui touche à KHALAM.",
    formes: ["c est quoi biba", "qui est biba", "biba", "lan mooy biba"],
  },
  {
    cle: "traducteur",
    wolof: "Traducteur bi dafay firi wolof ci français, ak français ci wolof, ci baat.",
    francais: "Le Traducteur traduit le wolof en français et le français en wolof, à la voix.",
    formes: ["c est quoi le traducteur", "l interprete", "lan mooy traducteur", "vous avez un traducteur"],
  },

  /* ── LES CODES ET L'ACCÈS ─────────────────────────────────────────────── */
  {
    cle: "comment-avoir-code",
    wolof: "Ci khalam.app lañuy jaay kod yi. Fa nga koy jëndee.",
    francais: "Les codes se vendent sur khalam.app. C'est là qu'on les achète.",
    formes: ["comment avoir un code", "ou acheter un code", "je veux un code", "naka laa am kod", "comment obtenir un code"],
  },
  {
    cle: "combien-ca-coute",
    wolof: "Njëg yi ci khalam.app lañu nekk, te dañuy soppiku. Fa nga war a seet.",
    francais: "Les prix sont sur khalam.app, et ils changent. C'est là qu'il faut regarder.",
    formes: ["combien ca coute", "c est combien", "quel est le prix", "naata la", "ñaata la", "c est payant"],
  },
  {
    cle: "code-marche-pas",
    wolof: "Su sa kod baaxul, xamal ko KHALAM ci khalam.app.",
    francais: "Si ton code ne marche pas, signale-le à KHALAM sur khalam.app.",
    formes: ["mon code ne marche pas", "le code ne marche pas", "sama kod baaxul", "probleme de code"],
  },
];
