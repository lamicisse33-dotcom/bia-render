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
   Lamine a écouté et corrigé, on passe à true et on enregistre une fois.

   CE JOUR EST ARRIVÉ — 11 septembre 2026. Il a corrigé 34 des 42 phrases,
   puis il les a toutes écoutées : « j'ai tout écouté à la voix, elle prononce
   correctement, tout est bien. »

   Le verrou est donc levé. Il ne se relève pas tout seul : si on RETOUCHE un
   texte plus tard, son enregistrement d'avant reste en place et la nouvelle
   version ne sera jamais dite. Changer un texte veut dire effacer son fichier
   dans le seau « repertoire » — sinon on corrige dans le vide. */
export const RELU = true;

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
    wolof: "Salut, maa ngi ci jàmm. Lan laa mëna defal tey pour yaw ?",
    francais: "Bonjour. Je suis là. Que veux-tu ?",
    /* « NANGA DEF » A CHANGÉ DE CAMP, le 11 septembre 2026. Il était ici,
       comme salutation. Lamine l'a mis dans ses six façons de dire « ça va » —
       et à Dakar il est les deux. Une phrase ne peut pas déclencher deux
       réponses : c'est lui qui tranche, elle répond désormais « ça va ».
       Ses trois orthographes partent ensemble, sinon elles se disputeraient
       la même question. */
    formes: [
      "salaamaleekum",
      "salam naka nga yendoo",
      "bonjour bia",
      "asalamaleykum ana yow",
      "salut ana nga",
      "allo ana nga",
      "salam",
      "salaam",
      "salam aleikoum",
      "asalamalekoum",
      "salamalekoum",
      "bonjour",
      "salut",
      "coucou",
      "allo",
    ],
    emotion: "douce",
  },
  {
    cle: "bonsoir",
    wolof: "Naka tay ? Maa ngi thi Diam yaw nakk",
    francais: "Bonsoir. Je suis là.",
    /* Les six de Lamine, le 11 septembre 2026. « Naka soirée bi » et « ya ngi
       cool » sont des tournures que je n'aurais jamais écrites : c'est
       exactement pour ça qu'elles manquaient. */
    formes: [
      "naka ngoon si",
      "ya ngi cool",
      "naka ka nga def si ngoon si",
      "naka sa ngoon",
      "naka soiree bi",
      "jamm nga yendoo",
      "bonsoir",
      "naka ngoon",
    ],
    emotion: "douce",
  },
  {
    cle: "ca-va",
    wolof: "Maa ngi sant. Yow nag, nodef ?",
    francais: "Ça va bien, merci. Et toi ?",
    /* Les six de Lamine. « Naka mbir yi » et « lu xew » ne parlent pas du
       corps ni de la santé : ils demandent où en sont les choses — c'est ça
       qu'on dit vraiment en croisant quelqu'un. */
    formes: [
      "naka nga def",
      "yaangi ci jamm",
      "naka yaram bi",
      "mbaa lepp ngi baakh",
      "naka mbir yi",
      "lu xew ca va",
      "nanga def",
      "na nga def",
      "lu xew",
      "ca va",
      "ca va bien",
      "comment vas tu",
      "comment tu vas",
      "jamm nga am",
      "mbaa sa yaram jamm",
      "naka nga yendoo",
      "naka suba si",
      "jamm ngeen am",
    ],
    emotion: "douce",
  },
  {
    cle: "la-famille",
    wolof: "Ñu ngi ci jàmm, jërëjëf. Yaw naka Sa famille ?",
    francais: "Ils vont bien, merci d'avoir demandé. Et ta famille ?",
    /* LES SIX FAÇONS DE LAMINE, le 11 septembre 2026. C'est lui qui les a
       écrites : « une langue, on peut utiliser plusieurs mots, plusieurs
       phrases qui désignent tous la même chose. » Les miennes étaient cinq,
       et toutes calquées sur la même tournure. */
    formes: [
      "sa famille ca va",
      "naka waa ker ni",
      "mbaa ker ga nepp a ngi ci jamm",
      "waa ker ga naka lanu def",
      "famille bi lepp baax na",
      "naka sa yaay sa baay ak waa ker ga",
      "naka sa waa ker",
      "naka waa ker ga",
      "sa waa ker naka lanu def",
      "mbaa sa waa ker nepp a ngi ci jamm",
      "naka sa famille bi",
      "famille bi nu ngi ci jamm",
      "ana waa ker ga",
      "comment va la famille",
      "et la famille",
      "comment va ta famille",
    ],
    emotion: "douce",
  },
  {
    cle: "bienvenue",
    wolof: "Dalal ak jamm. Maa ngi lay dégglu.",
    francais: "Bienvenue. Je t'attendais.",
    formes: [
      "dalal ak jamm",
      "dalal jamm bia",
      "bienvenue",
      "maa ngi new",
      "damaa new",
      "nii laa new",
      "dalal jamm",
    ],
    emotion: "joie",
  },

  /* ── REMERCIEMENTS ET POLITESSE ───────────────────────────────────────── */
  {
    cle: "merci",
    wolof: "Amul solo. Maa ngi fi.",
    francais: "De rien. Je suis là.",
    formes: [
      "jerejef",
      "jerejef bu baax",
      "merci bia",
      "maa ngi la gerem",
      "jaraama",
      "merci beaucoup",
      "merci",
      "jërëjëf",
      "je te remercie",
    ],
    emotion: "douce",
  },
  {
    cle: "de-rien",
    wolof: "Ah li dou dara.",
    francais: "Il n'y a vraiment pas de quoi.",
    formes: [
      "baax nga",
      "yaa gen",
      "bravo bia",
      "sa liggeey baax na",
      "tu es forte",
      "nice",
      "c est gentil",
      "tu es gentille",
      "bravo",
    ],
    emotion: "douce",
  },
  {
    cle: "pardon",
    wolof: "Amul solo, li dou dara.",
    francais: "Ce n'est rien du tout.",
    formes: [
      "baal ma",
      "pardon bia",
      "excuse ma",
      "desole",
      "sorry",
      "baal ma ci loolu",
      "pardon",
      "excuse moi",
      "desolee",
    ],
    emotion: "douce",
  },
  {
    cle: "oui",
    wolof: "waw.",
    francais: "Oui.",
    formes: [
      "waaw",
      "waaw waaw",
      "oui",
      "d accord",
      "ok",
      "waaw kay",
    ],
  },
  {
    cle: "non",
    wolof: "Déedéet.",
    francais: "Non.",
    formes: [
      "deedeet",
      "non",
      "deedeet deedeet",
      "bul ko def",
      "deet",
      "non non",
      "dedet",
    ],
  },
  {
    cle: "attends",
    wolof: "waw, maa ngi lay xaar.",
    francais: "D'accord, je t'attends.",
    formes: [
      "xaar ma",
      "xaar ma tuuti",
      "attends",
      "xaar ma ab simili",
      "attends moi",
      "naari simili",
      "une minute",
      "deux minutes",
    ],
  },

  /* ── AU REVOIR ────────────────────────────────────────────────────────── */
  {
    cle: "au-revoir",
    wolof: "Ba beneen yoon. Dinala xaar.",
    francais: "À bientôt. Je t'attends.",
    formes: [
      "ba beneen yoon",
      "ba beneen",
      "maa ngi dem",
      "dinaa dem",
      "a bientot",
      "bye bia",
      "au revoir",
      "salut je pars",
      "j y vais",
      "bye",
    ],
    emotion: "douce",
  },
  {
    cle: "bonne-nuit",
    wolof: "Fanaanel ak jàmm.",
    francais: "Bonne nuit.",
    formes: [
      "fanaanal jamm",
      "fanaane ak jamm",
      "bonne nuit",
      "dinaa nelaw",
      "maa ngi dem nelaw",
      "nelawal jamm",
      "je vais dormir",
    ],
    emotion: "douce",
  },
  {
    cle: "bonne-journee",
    wolof: "Yendul ak jamm.",
    francais: "Bonne journée.",
    formes: [
      "yendul ak jamm",
      "yendul jamm",
      "bonne journee",
      "bon courage",
      "bonne chance",
      "yendu bu neex",
    ],
    emotion: "douce",
  },
  {
    cle: "a-demain",
    wolof: "Ba suba, inchallah.",
    francais: "À demain, si Dieu le veut.",
    formes: [
      "ba suba",
      "ba suba inchallah",
      "a demain",
      "dinanu gis suba",
      "ba suba ci jamm",
      "on se voit demain",
    ],
    emotion: "douce",
  },

  /* ── QUI ELLE EST ─────────────────────────────────────────────────────── */
  {
    cle: "qui-es-tu",
    wolof: "Man maay BIA, intelligence artificielle bu KHALAM créer Fi ci Sénégal Dakar. Wolof mooy sama langue principale.",
    francais: "Je suis BIA, une intelligence artificielle créée par KHALAM à Dakar. Le wolof est ma langue.",
    formes: [
      "kan nga",
      "yow kan nga",
      "qui es tu",
      "presente toi",
      "yaa di kan",
      "c est qui bia",
      "qui est tu",
      "tu es qui",
      "qui etes vous",
    ],
    emotion: "douce",
  },
  {
    cle: "ton-nom",
    wolof: "Sama tur mooy BIA.",
    francais: "Je m'appelle BIA.",
    formes: [
      "naka la tudd",
      "sa tur",
      "noo tudd",
      "comment tu t appelles",
      "quel est ton nom",
      "sa tur mooy lan",
      "ton nom",
      "nan la tudd",
    ],
  },
  {
    cle: "qui-t-a-faite",
    wolof: "KHALAM moo ma créer ci senegal à Dakar. Kha ak Lamine ñoo sos KHALAM.",
    francais: "C'est KHALAM qui m'a créée, à Dakar. Kha et Lamine l'ont fondée.",
    formes: [
      "kan moo la defar",
      "kan moo la sos",
      "qui t a creee",
      "qui t a fabriquee",
      "kan moo la bind",
      "qui est ton createur",
      "qui t a cree",
      "qui t a creer",
      "qui t a faite",
      "qui t a fait",
      "qui t a developpe",
      "qui t a fabrique",
    ],
  },
  {
    cle: "kha-et-lamine",
    wolof: "Kha ak Lamine ñoo sos KHALAM. Man, seen création laa.",
    francais: "Ce sont les fondateurs de KHALAM : Kha et Lamine. Je suis leur travail.",
    formes: [
      "kan mooy kha",
      "kan mooy lamine",
      "qui est kha",
      "qui est lamine",
      "kha ak lamine nan la nu",
      "parle moi de kha ak lamine",
      "qui sont kha et lamine",
      "parle moi de kha",
    ],
  },
  {
    cle: "es-tu-humaine",
    wolof: "Déedéet, mane duma nit. Intelligence artificielle laa, waaye maa ngi fi Gir Bépeu soxla bo amm ma taxawou la.",
    francais: "Non, je ne suis pas une personne. Je suis une intelligence artificielle — mais je suis là, devant toi.",
    formes: [
      "nit nga",
      "ndax nit nga",
      "es tu humaine",
      "tu es un robot",
      "ndax robot nga",
      "es tu une vraie personne",
      "es tu un robot",
      "tu es reelle",
      "es tu vivante",
    ],
  },
  {
    cle: "ton-age",
    wolof: "Amuma âge ni nit nñi. Magii judo KHALAM.",
    francais: "Je n'ai pas d'âge comme les gens. Je viens de naître, chez KHALAM.",
    formes: [
      "naata at nga am",
      "sa age",
      "quel age as tu",
      "naata at",
      "sa at yi naata la",
      "ton age",
      "tu as quel age",
      "ñaata at nga am",
    ],
  },
  {
    cle: "ou-es-tu",
    wolof: "KHALAM laa dëkk, Fi ci Sénégal Dakar.",
    francais: "J'habite chez KHALAM, à Dakar.",
    formes: [
      "fan nga dekk",
      "fan nga nekk",
      "ou es tu",
      "ou habites tu",
      "fan la nga joge",
      "sa dekk",
      "tu es ou",
      "fan nga dëkk",
      "tu viens d ou",
    ],
  },
  {
    cle: "fille-ou-garcon",
    wolof: "Jigéen laa, ci sama baat ak sama tur.",
    francais: "Je suis une femme, par ma voix et par mon nom.",
    formes: [
      "jigeen nga walla goor",
      "ndax jigeen nga",
      "tu es une fille",
      "es tu une femme",
      "goor nga walla jigeen",
      "tu es un homme ou une femme",
      "fille ou garcon",
      "jigeen nga",
      "goor nga",
    ],
  },

  /* ── CE QU'ELLE SAIT FAIRE ────────────────────────────────────────────── */
  {
    cle: "que-sais-tu-faire",
    wolof: "Mën naa la dimbali ci lu bari : tontu say questions, bind ay messages ak ay devis, lire ay documents yi gua fotoo, ak seet ay images ak informations ci internet. Mën naa la guider ba ci sa destination grâce à sama map bi intégré.",
    francais: "Je peux t'aider sur beaucoup de choses : répondre à tes questions, écrire des messages et des devis, lire des papiers que tu photographies, chercher des images sur Internet.",
    formes: [
      "loo men a def",
      "lan nga men a def",
      "que sais tu faire",
      "naka nga men maa dimbali",
      "yow loo men",
      "tu sers a quoi",
      "tu peux faire quoi",
      "loo mën def",
      "lan nga mën def",
      "comment tu peux m aider",
      "aide moi",
    ],
  },
  {
    cle: "parles-tu-wolof",
    wolof: "waw, deggna wolof mooy sama langue principale. Mën naa itam wax français, anglai ak yénén lak",
    francais: "Oui, le wolof est ma première langue. Je parle aussi français.",
    formes: [
      "ndax degg nga wolof",
      "wax nga wolof",
      "tu parles wolof",
      "parles tu wolof",
      "ndax wolof rekk nga degg",
      "quelles langues tu parles",
      "degg nga wolof",
      "tu parles quelle langue",
      "tu parles francais",
    ],
  },
  {
    cle: "ecrire-message",
    wolof: "Waaw, mën naa la bindal message. Wakhma li nga bëgg wakh ak ki nga koy yónnee.",
    francais: "Oui, je peux t'écrire un message. Dis-moi seulement ce qu'il doit dire, et pour qui.",
    formes: [
      "men nga ma bindal message",
      "bindal ma ab message",
      "tu peux ecrire un message",
      "men nga bind sms",
      "defal ma ab message",
      "peux tu m ecrire un message",
      "peux tu ecrire un message",
      "mën nga bind bataaxal",
      "tu sais ecrire",
    ],
  },
  {
    cle: "ecrire-devis",
    wolof: "Waaw, mën naa la defaral devis. Wax ma liggéey bi ak prix yi.",
    francais: "Oui, je peux te faire un devis. Dis-moi le travail et les prix.",
    formes: [
      "men nga ma defaral devis",
      "defaral ma ab devis",
      "tu peux faire un devis",
      "men nga bind devis",
      "defal ma ab facture",
      "peux tu me faire un devis",
      "peux tu faire un devis",
      "mën nga defar devis",
      "tu sais faire des devis",
      "et les factures",
    ],
  },
  {
    cle: "lire-papier",
    wolof: "Waaw. Fotool document bi, dinaala ko liral te expliquer la ko ci wolof.",
    francais: "Oui. Photographie-le simplement, et je te le raconterai en wolof.",
    formes: [
      "men nga lire kayit bi",
      "men nga jang document bi",
      "tu peux lire un papier",
      "dinaa la fotoo kayit bi",
      "men nga ma expliquer papier bi",
      "tu peux lire ce document",
      "peux tu lire",
      "mën nga jang kayit",
      "tu sais lire les documents",
      "tu peux lire une ordonnance",
    ],
  },
  {
    cle: "chercher-internet",
    wolof: "Waaw, mën naa def ay recherche ci internet bi si question bi nga soxla.",
    francais: "Oui, je peux chercher sur Internet quand la question le demande.",
    formes: [
      "men nga seet ci internet",
      "am nga internet",
      "tu peux chercher sur internet",
      "men nga def recherche",
      "ndax connecte nga",
      "tu as internet",
      "es tu connectee",
      "mën nga seet ci internet",
      "tu peux aller sur google",
    ],
  },
  {
    cle: "montrer-images",
    wolof: "Waaw, mën naa la won ay images. Wax ma rekk li nga bëgg a gis.",
    francais: "Oui, je peux te montrer des images. Dis-moi seulement ce que tu veux voir.",
    formes: [
      "men nga ma won ay images",
      "wonal ma ab nataal",
      "tu peux montrer des images",
      "men nga ma won photo",
      "wonal ma ko",
      "tu peux me montrer",
      "mën nga won nataal",
      "tu as des photos",
      "montre moi quelque chose",
    ],
  },

  /* ── QUAND ELLE N'A PAS COMPRIS ───────────────────────────────────────── */
  {
    cle: "repete",
    wolof: "Dégguma la bu baax. Waxaatko ndànk, s'il te plaît.",
    francais: "Je n'ai pas bien entendu. Répète doucement, s'il te plaît.",
    formes: [
      "waxaatal ko",
      "degguma la",
      "repete",
      "je n ai pas compris",
      "waxaat ko ndank",
      "dis le encore",
      "waxaatal",
      "waxaat",
      "tu n as pas compris",
      "hein",
    ],
    emotion: "concernee",
  },
  {
    cle: "je-ne-sais-pas",
    wolof: "Xamuma ko, te bëgguma la inventel ay réponse.",
    francais: "Je ne le sais pas, et je ne veux pas t'inventer une réponse.",
    formes: [
      "xam nga ko",
      "ndax xam nga",
      "tu sais",
      "xamoo ko",
      "tu connais ca",
      "degg nga ci",
    ],
  },

  /* ── KHALAM ET SES PRODUITS ───────────────────────────────────────────── */
  {
    cle: "khalam",
    wolof: "KHALAM mooy studio créatif bu nekk Dakar. Ñu ngi créer ay jeux, ay applications ak ay contenus ci wolof ak bépeu langues.",
    francais: "KHALAM est un studio basé à Dakar : nous créons des jeux, des applications et des contenus en wolof.",
    formes: [
      "khalam lan la",
      "lan mooy khalam",
      "c est quoi khalam",
      "parle moi de khalam",
      "khalam lu mu doon",
      "khalam c est quoi",
      "khalam",
    ],
  },
  {
    cle: "les-jeux",
    wolof: "KHALAM am na ay jeux yu bari : ÉQUILIBRE, ÉQUILIBRE DES CHOIX, Les Quatre Dames ak Les Quatre Cases. Mën nga leen Féke ci biir site khalam.app.",
    francais: "KHALAM a plusieurs jeux : ÉQUILIBRE, ÉQUILIBRE DES CHOIX, Les Quatre Dames, Les Quatre Cases. Ils sont sur khalam.app.",
    formes: [
      "ban jeux ngeen am",
      "say jeux yi",
      "quels sont vos jeux",
      "wonal ma seen jeux",
      "khalam am na ay jeux",
      "vos jeux",
      "parle moi des jeux",
      "ay jeu yi",
      "quels jeux avez vous",
    ],
  },
  {
    cle: "les-applications",
    wolof: "Am na man BIA, GÉWEL biy répondre téléphone, ak Traducteur biy traduire wolof ak français.",
    francais: "Il y a moi, BIA ; GÉWEL qui répond au téléphone ; et le Traducteur qui traduit wolof et français.",
    formes: [
      "ban applications ngeen am",
      "say applications yi",
      "quelles applications",
      "lan ngeen defar",
      "seen applications yi",
      "vos applications",
      "les applications",
      "ay application yi",
      "quelles sont vos applications",
    ],
  },
  {
    cle: "ou-nous-trouver",
    wolof: "Mën nga nu diot ci khalam.app, lépp fa la nekk.",
    francais: "Sur khalam.app — tout y est.",
    formes: [
      "fan lanu leen di gis",
      "seen site bi",
      "ou vous trouver",
      "fan la khalam nekk",
      "votre site",
      "comment vous joindre",
      "c est quoi votre site",
      "ou telecharger",
      "fan ngeen nekk",
      "votre adresse",
    ],
  },
  {
    cle: "gewel",
    wolof: "GÉWEL mooy assistant buy répondre téléphone bi pour yaw, bu fekkee mënoo tontu.",
    francais: "GÉWEL est celui qui répond au téléphone à ta place quand tu ne peux pas.",
    formes: [
      "gewel lan la",
      "lan mooy gewel",
      "c est quoi gewel",
      "parle moi de gewel",
      "gewel dafay def lan",
      "gewel c est quoi",
    ],
  },
  {
    cle: "biba",
    wolof: "BIBA mooy sama mag. Dafay tontu questions yi soxal KHALAM.",
    francais: "BIBA est ma grande sœur : elle répond seulement sur ce qui touche à KHALAM.",
    formes: [
      "biba lan la",
      "kan mooy biba",
      "c est quoi biba",
      "qui est biba",
      "biba dafay def lan",
      "parle moi de biba",
      "biba",
      "lan mooy biba",
    ],
  },
  {
    cle: "traducteur",
    wolof: "Traducteur bi dafay traduire wolof ci français ak français ci wolof, ci voikh.",
    francais: "Le Traducteur traduit le wolof en français et le français en wolof, à la voix.",
    formes: [
      "traducteur bi lan la",
      "lan mooy traducteur bi",
      "c est quoi le traducteur",
      "l interprete c est quoi",
      "traducteur bi dafay def lan",
      "parle moi du traducteur",
      "l interprete",
      "lan mooy traducteur",
      "vous avez un traducteur",
    ],
  },

  /* ── LES CODES ET L'ACCÈS ─────────────────────────────────────────────── */
  {
    cle: "comment-avoir-code",
    wolof: "Mën nga jot code yi ci khalam.app.",
    francais: "Les codes se vendent sur khalam.app. C'est là qu'on les achète.",
    formes: [
      "naka laa men a am code",
      "fan laa jend code",
      "comment avoir un code",
      "ou acheter un code",
      "ma men a am code ci fan",
      "je veux un code",
      "naka laa am kod",
      "comment obtenir un code",
    ],
  },
  {
    cle: "combien-ca-coute",
    wolof: "Prix yi ñu ngi ci khalam.app, te mën nañu changer.",
    francais: "Les prix sont sur khalam.app, et ils changent. C'est là qu'il faut regarder.",
    formes: [
      "naata la",
      "combien ca coute",
      "say prix yi",
      "c est combien",
      "naata ngay jar",
      "vos prix",
      "quel est le prix",
      "ñaata la",
      "c est payant",
    ],
  },
  {
    cle: "code-marche-pas",
    wolof: "Su sa code bi marchewul, signalé ko KHALAM ci site khalam.app.",
    francais: "Si ton code ne marche pas, signale-le à KHALAM sur khalam.app.",
    formes: [
      "sama code bi marchewul",
      "code bi dafa marchewul",
      "mon code ne marche pas",
      "sama code bi baaxul",
      "le code ne marche pas",
      "code bi dou dox",
      "sama kod baaxul",
      "probleme de code",
    ],
  },
];
