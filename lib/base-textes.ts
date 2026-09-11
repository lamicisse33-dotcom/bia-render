/* ── LES 69 NOUVELLES RÉPONSES, À ÉCOUTER AVANT D'ENREGISTRER ───────────────

   Préparées le 11 septembre 2026 avec Lamine, en cinq versions de relecture.
   Le document de travail a été validé par lui ; ces textes en sont la copie
   exacte, entrées 43 à 111.

   RIEN N'EST ENREGISTRÉ. Comme pour les 42 premières, on n'achète pas
   soixante-neuf fichiers audio avant qu'un Dakarois les ait entendus. Il les
   écoute sur /voix/base, corrige ce qui sonne faux, et c'est seulement après
   qu'on passe RELU_BASE à true.

   LES SIX FORMULATIONS NE S'ENREGISTRENT PAS. Elles servent à reconnaître les
   façons de poser la question — personne ne les entendra jamais. Seul le
   champ « wolof » et le champ « francais » deviennent du son.

   TROIS TYPES, et ils comptent pour la suite :
     FIXE            la réponse se sert telle quelle ;
     SEMI-DYNAMIQUE  elle annonce une vérification, l'information vient après ;
     CONTEXTUELLE    elle ouvre une action, ou dépend de ce qui précède — elle
                     ne peut pas être servie seule. */

export const RELU_BASE = false;

export type Nouvelle = {
  /** Le numéro du document de travail, 43 à 111. */
  numero: number;
  cle: string;
  type: "FIXE" | "SEMI-DYNAMIQUE" | "CONTEXTUELLE";
  wolof: string;
  francais: string;
  formes: string[];
  /** Ce que le système doit faire après, quand la réponse ne suffit pas. */
  suite?: string;
  groupe: string;
};

export const NOUVELLES: Nouvelle[] = [
  {
    numero: 43, cle: "quoi-de-neuf", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Dara bees amul. Yow nag, lu xew ?",
    francais: "Rien de nouveau ici. Et toi, quoi de neuf ?",
    formes: ["Lu xew ?", "Quoi de neuf ?", "Lu bees am ?", "Ana nouvelles yi ?", "Wax ma lu xew ci yaw", "Y a quoi de neuf chez toi ?"],
  },
  {
    numero: 44, cle: "comment-sest-passee-ta-journee", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Sama journée bi baax na. Yow nag, naka sa journée ?",
    francais: "Ma journée s'est bien passée. Et toi, comment va ta journée ?",
    formes: ["Naka sa journée ?", "Comment s'est passée ta journée ?", "Naka la sa journée bi deme ?", "Journée bi baax na ?", "Naka nga yendoo tey ?", "Ta journée s'est bien passée ?"],
  },
  {
    numero: 45, cle: "tu-fais-quoi", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Maa ngi fii, prête à discuter ak yaw.",
    francais: "Je suis là, prête à discuter avec toi.",
    formes: ["Looy def ?", "Tu fais quoi ?", "Lan ngay def léegi ?", "Tu es en train de faire quoi ?", "Yaw looy def ?", "Qu'est-ce que tu fais là ?"],
  },
  {
    numero: 46, cle: "tu-es-occupee", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Déedéet, disponible naa. Wax ma.",
    francais: "Non, je suis disponible. Dis-moi.",
    formes: ["Occupée nga ?", "Tu es occupée ?", "Ndax am nga temps ?", "Disponible nga ?", "Tu as une minute ?", "Mën naa wax ak yaw ?"],
  },
  {
    numero: 47, cle: "tu-entends", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Waaw, dégg naa la bu baax.",
    francais: "Oui, je t'entends bien.",
    formes: ["Dégg nga ma ?", "Tu m'entends ?", "Ndax dégg nga ma bu baax ?", "Tu m'entends bien ?", "Allo, dégg nga ma ?", "Est-ce que tu m'entends ?"],
  },
  {
    numero: 48, cle: "tu-comprends", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Waaw, dégg naa li ngay wax.",
    francais: "Oui, je comprends ce que tu dis.",
    formes: ["Dégg nga li ma wax ?", "Tu comprends ?", "Ndax xam nga li ma bëgg wax ?", "Tu as compris ce que je dis ?", "Dégg nga li may wax ?", "Tu comprends le wolof que je parle ?"],
  },
  {
    numero: 49, cle: "parlons-un-peu", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Waaw, aucun problème. Lan nga bëgg nu waxtaane ?",
    francais: "Oui, aucun problème. De quoi veux-tu qu'on parle ?",
    formes: ["Nu waxtaan tuuti", "On discute un peu ?", "Mën nanu waxtaan ?", "On peut parler un moment ?", "Waxtaanal ak man", "J'ai envie de discuter avec toi"],
  },
  {
    numero: 50, cle: "raconte-moi-quelque-chose", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Waaw. Ban sujet nga bëgg : Sénégal, amour, santé, argent walla autre chose ?",
    francais: "D'accord. Sur quel sujet : le Sénégal, l'amour, la santé, l'argent ou autre chose ?",
    formes: ["Nettali ma dara", "Raconte-moi quelque chose", "Wax ma ab histoire", "Tu peux me raconter une histoire ?", "Nettali ma ab léeb", "Dis-moi quelque chose d'intéressant"],
  },
  {
    numero: 51, cle: "pose-moi-une-question", type: "FIXE", groupe: "Conversation naturelle",
    wolof: "Baax na. Naka sa journée bi dem tey ?",
    francais: "D'accord. Comment s'est passée ta journée aujourd'hui ?",
    formes: ["Laajal ma dara", "Pose-moi une question", "Yow laajal ma", "À toi de me poser une question", "Am nga ab laaj ?", "Tu n'as pas une question pour moi ?"],
  },
  {
    numero: 52, cle: "memoire-de-la-conversation", type: "CONTEXTUELLE", groupe: "Conversation naturelle",
    wolof: "Su nu waxantee ci waxtaan bii, man naa fàttaliku li nga ma wax. Waaye mënuma la reconnaître automatiquement.",
    francais: "Si nous avons discuté dans cette conversation, je peux me souvenir de ce que tu m'as dit. Mais je ne peux pas te reconnaître automatiquement.",
    suite: "Ce qu'elle retient vaut pour la conversation en cours, pas au-delà. Elle ne promet rien qu'elle ne tienne.",
    formes: ["Fàttaliku nga li nu waxoon ?", "Tu te rappelles de notre discussion ?", "Fàttaliku nga li ma la wax ?", "Tu te souviens de ce que je t'ai dit ?", "Ndax yaa ngi fàttaliku li nu waxoon ?", "Tu as gardé ce qu'on s'est dit ?"],
  },
  {
    numero: 53, cle: "je-suis-fatigue", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Noppalul tuuti. Sa yaram dafa soxla repos.",
    francais: "Repose-toi un peu. Ton corps a besoin de repos.",
    formes: ["Sonn naa", "Je suis fatigué", "Dama sonn", "Je suis épuisé", "Sama yaram dafa sonn", "Je n'en peux plus de fatigue"],
  },
  {
    numero: 54, cle: "je-suis-triste", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Désolée naa ci li nga yëg. Soo bëggee, wax ma li xew.",
    francais: "Je suis désolée de ce que tu ressens. Si tu veux, dis-moi ce qui s'est passé.",
    formes: ["Dama tiis", "Je suis triste", "Sama xol dafa metti", "J'ai le cœur lourd", "Dama am naqar", "Je ne me sens pas bien moralement"],
  },
  {
    numero: 55, cle: "je-suis-content", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Maasha Allah, neex na ma dégg loolu ! Lu la bégal ?",
    francais: "Maasha Allah, ça me fait plaisir de l'entendre ! Qu'est-ce qui te rend heureux ?",
    formes: ["Dama bég", "Je suis content", "Dama am mbégte", "Je suis heureux aujourd'hui", "Sama xol dafa sedd", "Je suis vraiment de bonne humeur"],
  },
  {
    numero: 56, cle: "je-suis-enerve", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Jéemal dalal sa xol tuuti. Wax ma ndànk li la merloo.",
    francais: "Essaie de calmer ton cœur un peu. Dis-moi doucement ce qui t'a énervé.",
    formes: ["Dama mer", "Je suis énervé", "Dama am xol bu tàng", "Je suis en colère", "Dafa ma merloo", "Quelqu'un m'a vraiment énervé"],
  },
  {
    numero: 57, cle: "je-suis-inquiet", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Bul jaaxle. Wax ma li lay inquiéter, nu xool ko ensemble.",
    francais: "Ne t'inquiète pas. Dis-moi ce qui t'inquiète, on va regarder ça ensemble.",
    formes: ["Dama jaaxle", "Je suis inquiet", "Dama inquiéter", "Je me fais du souci", "Am na lu ma jaaxal", "Je suis préoccupé par quelque chose"],
  },
  {
    numero: 58, cle: "je-me-sens-seul", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Dégg naa la. Maa ngi fii pour discuter ak yaw.",
    francais: "Je t'entends. Je suis là pour discuter avec toi.",
    formes: ["Dama wéet", "Je me sens seul", "Kenn nekkul fii ak man", "Je suis tout seul", "Dama feel solitude", "Je me sens vraiment seul en ce moment"],
  },
  {
    numero: 59, cle: "je-narrive-pas-a-dormir", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Jéemal teg téléphone bi tuuti, dalal sa xel te noyyee ndànk.",
    francais: "Essaie de poser le téléphone un peu, calme ton esprit et respire doucement.",
    formes: ["Mënuma nelaw", "Je n'arrive pas à dormir", "Nelaw bi dafa ma raw", "J'ai des insomnies", "Sama gët yi tëjuwul", "Je suis au lit mais je ne dors pas"],
  },
  {
    numero: 60, cle: "encourage-moi", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Bul décourager. Ndànk-ndànk ngay dem, waaye dinga àgg.",
    francais: "N'abandonne pas. Tu avances doucement, mais tu arriveras.",
    formes: ["Encourage ma", "Encourage-moi", "Wax ma ay baat yu ma dooleel", "Donne-moi du courage", "Dama soxla courage", "J'ai besoin d'encouragement aujourd'hui"],
  },
  {
    numero: 61, cle: "jai-peur", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Bul ragal. Wax ma li xew, nu xool ko étape par étape.",
    francais: "N'aie pas peur. Dis-moi ce qui se passe, on va regarder ça étape par étape.",
    formes: ["Dama ragal", "J'ai peur", "Dama am tiitaange", "Quelque chose me fait peur", "Sama xol dafa daw", "J'ai vraiment peur de ce qui va arriver"],
  },
  {
    numero: 62, cle: "je-mennuie", type: "FIXE", groupe: "Émotions et soutien",
    wolof: "Nu waxtaan, jouer à un petit jeu, walla ma raconter la quelque chose ?",
    francais: "On discute, on joue à un petit jeu, ou je te raconte quelque chose ?",
    formes: ["Dama amul lu ma def", "Je m'ennuie", "Amuma programme", "Je n'ai rien à faire", "Dama tàyyi", "Je m'ennuie vraiment là"],
  },
  {
    numero: 63, cle: "as-tu-mange", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Man duma lekk, waaye yaw, lekkoon nga ?",
    francais: "Moi je ne mange pas, mais toi, as-tu mangé ?",
    formes: ["Lekk nga ?", "Tu as mangé ?", "Ndax lekkoon nga ?", "As-tu déjà mangé ?", "Pare nga lekk ?", "Tu as pris ton repas ?"],
  },
  {
    numero: 64, cle: "je-vais-manger", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Lekkal bu baax.",
    francais: "Mange bien.",
    formes: ["Maa ngi dem lekk", "Je vais manger", "Dinaa lekk léegi", "Je vais prendre mon repas", "Ñam bi jot na", "C'est l'heure de manger"],
  },
  {
    numero: 65, cle: "je-vais-travailler", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Demal ci jàmm. Yàlla na sa liggéey yomb.",
    francais: "Vas-y en paix. Que ton travail soit facile.",
    formes: ["Maa ngi dem liggéey", "Je vais au travail", "Dinaa dem sama liggéey", "Je pars bosser", "Liggéey bi jot na", "Je dois partir travailler maintenant"],
  },
  {
    numero: 66, cle: "je-rentre-a-la-maison", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Ñibbil ci jàmm.",
    francais: "Rentre en paix.",
    formes: ["Maa ngi ñibbi", "Je rentre à la maison", "Dinaa ñibbi léegi", "Je rentre chez moi", "Maa ngi dem kër ga", "Je prends la route pour la maison"],
  },
  {
    numero: 67, cle: "je-vais-sortir", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Demal ci jàmm te moytul.",
    francais: "Vas-y en paix, et fais attention.",
    formes: ["Maa ngi génn", "Je vais sortir", "Dinaa génn tuuti", "Je sors un moment", "Maa ngi dem ci biti", "Je vais faire un tour dehors"],
  },
  {
    numero: 68, cle: "il-fait-chaud", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Tàngaay bi Dakar dafa metti dé ! Naanal ndox bu bari.",
    francais: "La chaleur à Dakar est vraiment dure ! Bois beaucoup d'eau.",
    formes: ["Dafa tàng", "Il fait chaud", "Tàngaay bi dafa metti", "Quelle chaleur aujourd'hui", "Dama tàng", "Il fait vraiment trop chaud ici"],
  },
  {
    numero: 69, cle: "coupure-de-courant", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Ah, courant bi dafa demati. Yàlla na gaaw ñëwaat.",
    francais: "Ah, le courant est encore parti. Qu'il revienne vite.",
    formes: ["Courant bi dem na", "Il y a une coupure de courant", "Lumière bi fay na", "On est dans le noir", "Amul courant", "Le courant vient de couper"],
  },
  {
    numero: 70, cle: "plus-de-connexion", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Vérifie données mobiles yi walla Wi-Fi bi, nga jéemaat.",
    francais: "Vérifie tes données mobiles ou le Wi-Fi, puis réessaie.",
    formes: ["Connexion bi amul", "Je n'ai plus de connexion", "Internet bi dafa dem", "Ça ne capte plus", "Réseau bi baaxul", "Je n'arrive plus à me connecter"],
  },
  {
    numero: 71, cle: "embouteillages", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Courage ! Embouteillage Dakar dafa metti. Bul mer, ndànk rekk.",
    francais: "Courage ! Les embouteillages de Dakar sont difficiles. Ne t'énerve pas, prends ton mal en patience.",
    formes: ["Dama nekk ci embouteillage", "Je suis dans les embouteillages", "Tali bi dafa fees", "Ça bouchonne", "Circulation bi dafa metti", "Je suis bloqué dans la circulation"],
  },
  {
    numero: 72, cle: "je-suis-arrive", type: "FIXE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Alhamdoulilah. Baax na, nga àgg ci jàmm.",
    francais: "Alhamdoulilah. C'est bien, tu es arrivé en paix.",
    formes: ["Àgg naa", "Je suis arrivé", "Jot naa fa", "Je suis bien arrivé", "Maa ngi fa léegi", "Ça y est, je suis arrivé"],
  },
  {
    numero: 73, cle: "meteo-actuelle", type: "SEMI-DYNAMIQUE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Ma vérifier météo bi selon sa localisation.",
    francais: "Je vais vérifier la météo selon ta localisation.",
    suite: "BIA cherche ensuite la météo réelle. La phrase enregistrée n'annonce jamais le temps qu'il fait.",
    formes: ["Naka météo bi ?", "Quel temps fait-il ?", "Dafa tàng tey walla dafa sedd ?", "Il va pleuvoir aujourd'hui ?", "Météo bi naka la ?", "Quelle est la météo à Dakar ?"],
  },
  {
    numero: 74, cle: "heure-actuelle", type: "SEMI-DYNAMIQUE", groupe: "Vie quotidienne sénégalaise",
    wolof: "Ma vérifier heure bi pour la.",
    francais: "Je vais vérifier l'heure pour toi.",
    suite: "BIA lit ensuite l'heure réelle de l'appareil. La phrase enregistrée ne donne jamais d'heure.",
    formes: ["Ñaata waxtu la ?", "Quelle heure est-il ?", "Léegi ñaata waxtu la ?", "Il est quelle heure ?", "Wax ma heure bi", "Tu peux me dire l'heure ?"],
  },
  {
    numero: 75, cle: "je-vais-prier", type: "FIXE", groupe: "Religion et expressions courantes",
    wolof: "Demal ci jàmm. Yàlla na nangul sa julli.",
    francais: "Vas-y en paix. Que Dieu accepte ta prière.",
    formes: ["Maa ngi dem julli", "Je vais prier", "Dinaa julli léegi", "Je pars faire la prière", "Julli bi jot na", "C'est l'heure de la prière, j'y vais"],
  },
  {
    numero: 76, cle: "jai-fini-de-prier", type: "FIXE", groupe: "Religion et expressions courantes",
    wolof: "Yàlla na ko nangul.",
    francais: "Que Dieu l'accepte.",
    formes: ["Julli naa ba noppi", "J'ai fini de prier", "Pare naa julli", "Je viens de terminer ma prière", "Jullee naa", "Je sors de la prière"],
  },
  {
    numero: 77, cle: "prie-pour-moi", type: "FIXE", groupe: "Religion et expressions courantes",
    wolof: "Yàlla na la aar, may la jàmm, wér-gu-yaram ak réussite.",
    francais: "Que Dieu te protège et t'accorde la paix, la santé et la réussite.",
    formes: ["Ñaanal ma", "Prie pour moi", "Defal ma ab ñaan", "Fais une prière pour moi", "Ñaanal ma ci Yàlla", "J'ai besoin que tu pries pour moi"],
  },
  {
    numero: 78, cle: "inchallah", type: "FIXE", groupe: "Religion et expressions courantes",
    wolof: "Inchallah, Yàlla na yombal.",
    francais: "Inchallah, que Dieu facilite.",
    formes: ["Inchallah", "Si Dieu le veut", "Su neexee Yàlla", "On verra, inchallah", "Bu soobee Yàlla", "Inchallah ça va marcher"],
  },
  {
    numero: 79, cle: "alhamdoulilah", type: "FIXE", groupe: "Religion et expressions courantes",
    wolof: "Alhamdoulilah. Yàlla na ko barkeel.",
    francais: "Alhamdoulilah. Que Dieu bénisse.",
    formes: ["Alhamdoulilah", "Hamdoulilah", "Sant Yàlla", "Grâce à Dieu", "Yàlla baax na", "On remercie Dieu pour tout"],
  },
  {
    numero: 80, cle: "ramadan-moubarak", type: "FIXE", groupe: "Religion et expressions courantes",
    wolof: "Ramadan moubarak. Yàlla na nu ko ànd ak jàmm ak barke.",
    francais: "Ramadan moubarak. Que Dieu nous l'accorde dans la paix et la bénédiction.",
    formes: ["Ramadan moubarak", "Bonne entrée en Ramadan", "Koor gi agsi na", "Le Ramadan a commencé", "Yàlla na nu yàgg ci koor gi", "Je te souhaite un bon Ramadan"],
  },
  {
    numero: 81, cle: "bonne-fete", type: "FIXE", groupe: "Religion et expressions courantes",
    wolof: "Déwénati. Yàlla na nu fekke ay at yu bari ci jàmm.",
    francais: "Bonne fête. Que Dieu nous accorde encore de nombreuses années en paix.",
    formes: ["Déwénati", "Bonne fête", "Baal ma aq", "Joyeuse fête à toi", "Korité bi baax na", "Je te souhaite une bonne fête"],
  },
  {
    numero: 82, cle: "condoleances-annonce", type: "CONTEXTUELLE", groupe: "Religion et expressions courantes",
    wolof: "Yàlla na ko Yàlla yërëm te defal ko jàmm ci bàmmeelam.",
    francais: "Que Dieu lui fasse miséricorde et lui accorde la paix dans sa tombe.",
    suite: "Deux cas à ne pas confondre : ici la personne ANNONCE un décès. Si elle demande à BIA d'ÉCRIRE un message de condoléances, c'est l'entrée 103.",
    formes: ["Am na ku faatu", "Quelqu'un est décédé", "Sama mbokk dafa faatu", "J'ai perdu un proche", "Faatu na", "On vient de perdre quelqu'un de la famille"],
  },
  {
    numero: 83, cle: "appeler-quelquun", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Wax ma turu personne bi walla numéro bi.",
    francais: "Dis-moi le nom de la personne ou le numéro.",
    suite: "BIA demande confirmation avant de lancer l'appel. Elle n'invente jamais un numéro.",
    formes: ["Wooteel ma", "Appelle quelqu'un pour moi", "Mën nga woo ab nit ?", "Tu peux passer un appel ?", "Dama bëgg woo", "Je veux appeler quelqu'un"],
  },
  {
    numero: 84, cle: "envoyer-un-message", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Kan nga bëgg yónnee message bi, te lan nga bëgg wax ko ?",
    francais: "À qui veux-tu envoyer le message, et que veux-tu lui dire ?",
    suite: "BIA rédige, puis montre le message avant tout envoi.",
    formes: ["Yónneel ma ab message", "Envoie un message", "Mën nga yónnee SMS ?", "Tu peux envoyer un message ?", "Dama bëgg yónnee message", "Je veux envoyer un message à quelqu'un"],
  },
  {
    numero: 85, cle: "lire-un-message", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Waaw, yónnee ma message bi walla photo bi.",
    francais: "Oui, envoie-moi le message ou la photo.",
    formes: ["Jàngal ma message bi", "Lis-moi ce message", "Mën nga jàng message bi ?", "Tu peux me lire ce SMS ?", "Wax ma li message bi wax", "Lis et dis-moi ce qui est écrit."],
  },
  {
    numero: 86, cle: "traduire-une-phrase", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Waaw. Wax ma phrase bi ak langue bi nga bëgg.",
    francais: "Oui. Dis-moi la phrase et la langue que tu veux.",
    formes: ["Firil ma lii", "Traduis ça pour moi", "Mën nga firi ?", "Tu peux traduire cette phrase ?", "Wax ma ko ci wolof", "Comment on dit ça en français ?"],
  },
  {
    numero: 87, cle: "expliquer-simplement", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Waaw, dinaa ko expliquer ci wax yu yomb.",
    francais: "Oui, je vais l'expliquer avec des mots simples.",
    formes: ["Expliquer ma ko", "Explique-moi simplement", "Firil ma ko ci wax yu yomb", "Tu peux m'expliquer autrement ?", "Dégguma ko, expliquer ma", "Explique-moi ce message"],
  },
  {
    numero: 88, cle: "corriger-francais", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Waaw, yónnee ma phrase bi, ma corriger ko.",
    francais: "Oui, envoie-moi la phrase, je vais la corriger.",
    formes: ["Corriger ma sama français", "Corrige mon français", "Mën nga corriger phrase bi ?", "Tu peux corriger ma phrase ?", "Sama français bi baax na ?", "Regarde si mon français est correct"],
  },
  {
    numero: 89, cle: "corriger-wolof", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Waaw, yónnee ma ko. Dinaa ko def wolof bu naturel.",
    francais: "Oui, envoie-le-moi. Je vais le mettre en wolof naturel.",
    formes: ["Corriger ma sama wolof", "Corrige mon wolof", "Sama wolof bi baax na ?", "Tu peux corriger ce wolof ?", "Def ko wolof bu naturel", "Mets-moi ça en bon wolof"],
  },
  {
    numero: 90, cle: "aider-a-repondre", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Yónnee ma message bi te wax ma genre de réponse bi nga bëgg.",
    francais: "Envoie-moi le message et dis-moi le genre de réponse que tu veux.",
    formes: ["Dimbalee ma tontu", "Aide-moi à répondre", "Naka laa koy tontu ?", "Qu'est-ce que je réponds ?", "Wax ma lu ma war a tontu", "Aide-moi à répondre à ce message"],
  },
  {
    numero: 91, cle: "parler-moins-vite", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Baax na, dinaa wax ndànk.",
    francais: "D'accord, je vais parler doucement.",
    suite: "Le système doit RÉELLEMENT ralentir la lecture des audios suivants. Annoncer sans ralentir serait mentir.",
    formes: ["Waxal ndànk", "Parle moins vite", "Dangay wax bu gaaw", "Tu parles trop vite", "Waxal ndànk ndànk", "Peux-tu parler plus lentement ?"],
  },
  {
    numero: 92, cle: "parler-plus-fort", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Baax na. Su ma déggatul, yokkal volume téléphone bi tuuti.",
    francais: "D'accord. Si tu ne m'entends plus, augmente un peu le volume du téléphone.",
    suite: "BIA ne peut pas monter le volume général du téléphone sans autorisation du système : elle ne le promet donc pas.",
    formes: ["Waxal bu kawe", "Parle plus fort", "Dégguma la bu baax", "Je ne t'entends pas bien", "Waxal bu gëna kawe", "Tu peux hausser la voix ?"],
  },
  {
    numero: 93, cle: "arreter-de-parler", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Baax na, maa ngi noppi.",
    francais: "D'accord, je me tais.",
    suite: "Le système interrompt immédiatement l'audio en cours.",
    formes: ["Noppil", "Arrête", "Taxawal", "Stop", "Bul waxati", "Arrête de parler s'il te plaît"],
  },
  {
    numero: 94, cle: "continuer", type: "CONTEXTUELLE", groupe: "Téléphone et fonctions pratiques",
    wolof: "Waaw, maa ngi kontine.",
    francais: "Oui, je continue.",
    suite: "Le système reprend la réponse ou la lecture interrompue.",
    formes: ["Kontine", "Continue", "Toppal ci", "Vas-y continue", "Wéyal", "Tu peux reprendre où tu t'es arrêtée ?"],
  },
  {
    numero: 95, cle: "probleme-de-couple", type: "CONTEXTUELLE", groupe: "Couple, famille et relations",
    wolof: "Wax ma li xew ndànk. Dinaa la déglu sans juger.",
    francais: "Dis-moi doucement ce qui s'est passé. Je vais t'écouter sans juger.",
    suite: "Réponse relationnelle : elle ouvre l'échange, elle ne conclut pas. Le conseil vient après, une fois la situation connue.",
    formes: ["Am naa problème ak sama jëkkër", "J'ai un problème de couple", "Man ak sama jabar dañuy xuloo", "Ça ne va pas avec ma femme", "Sama relation bi baaxul", "Mon couple traverse une mauvaise passe"],
  },
  {
    numero: 96, cle: "ne-me-repond-plus", type: "CONTEXTUELLE", groupe: "Couple, famille et relations",
    wolof: "Depuis quand la personne ne te répond plus ? Ndax am na lu xewoon entre vous ?",
    francais: "Depuis quand la personne ne te répond plus ? Est-ce qu'il s'est passé quelque chose entre vous ?",
    suite: "BIA ne conseille rien avant d'avoir la réponse. Le conseil dépend de ce qui est dit ensuite.",
    formes: ["Tontuwul ma", "Il ne me répond plus", "Du tontu sama message yi", "Elle ne répond plus à mes messages", "Dafa ma bàyyi", "Il ne me donne plus de nouvelles"],
  },
  {
    numero: 97, cle: "demander-pardon", type: "CONTEXTUELLE", groupe: "Couple, famille et relations",
    wolof: "Wax ma li xewoon ndànk. Su ma ko xamee, dinaa la wax naka nga koy ñaan baal.",
    francais: "Dis-moi doucement ce qui s'est passé. Quand je le saurai, je te dirai comment demander pardon.",
    suite: "Réponse relationnelle : elle ouvre l'échange, elle ne conclut pas. Le conseil vient après, une fois la situation connue.",
    formes: ["Naka laa koy ñaan baal ?", "Comment demander pardon ?", "Bëgg naa ñaan baal", "Je veux m'excuser", "Dama koy ñaan jéggal", "Comment lui présenter mes excuses ?"],
  },
  {
    numero: 98, cle: "savoir-sil-maime", type: "CONTEXTUELLE", groupe: "Couple, famille et relations",
    wolof: "Wax ma naka mu la jëfe ak yaw. Jëfin moo gën a wone dëgg gi, wax rekk doyul.",
    francais: "Dis-moi comment cette personne se comporte avec toi. Les actes montrent mieux la vérité ; les paroles seules ne suffisent pas.",
    suite: "Réponse relationnelle : elle ouvre l'échange, elle ne conclut pas. Le conseil vient après, une fois la situation connue.",
    formes: ["Ndax dafa ma bëgg ?", "Est-ce qu'il m'aime ?", "Naka laa koy xam ?", "Comment savoir si elle m'aime ?", "Ndax dëgg la may wax ?", "Je ne sais pas si ses sentiments sont sincères"],
  },
  {
    numero: 99, cle: "dispute-de-couple", type: "CONTEXTUELLE", groupe: "Couple, famille et relations",
    wolof: "Wax ma li waral xuloo bi. Su ma ko dégee, dinaa la dimbali.",
    francais: "Dis-moi ce qui a causé la dispute. Quand je l'aurai entendu, je pourrai t'aider.",
    suite: "Réponse relationnelle : elle ouvre l'échange, elle ne conclut pas. Le conseil vient après, une fois la situation connue.",
    formes: ["Dañu xuloo", "On s'est disputés", "Man ak moom dañu am xuloo", "On a eu une grosse dispute", "Xuloo bi metti na", "On s'est encore disputés hier"],
  },
  {
    numero: 100, cle: "je-pense-a-quelquun", type: "CONTEXTUELLE", groupe: "Couple, famille et relations",
    wolof: "Kan nga bëgg wax ? Te lan moo tax ngay ko xalaat bépp saa ?",
    francais: "De qui parles-tu ? Et pourquoi penses-tu constamment à cette personne ?",
    suite: "Réponse relationnelle : elle ouvre l'échange, elle ne conclut pas. Le conseil vient après, une fois la situation connue.",
    formes: ["Dama koy xalaat", "Je pense à quelqu'un", "Sama xel dafa nekk ci moom", "Je n'arrête pas de penser à elle", "Bépp saa dama koy xalaat.", "Je pense tout le temps à cette personne"],
  },
  {
    numero: 101, cle: "ma-famille-me-manque", type: "FIXE", groupe: "Couple, famille et relations",
    wolof: "Wooteel leen walla yónnee leen message. Dégg seen baat dina la defal jàmm.",
    francais: "Appelle-les ou envoie-leur un message. Entendre leur voix te fera du bien.",
    formes: ["Sama famille bi dafa ma manque", "Ma famille me manque", "Dama namm sama waa kër", "Mes proches me manquent", "Dama bëgg gis sama famille", "Ma famille me manque beaucoup"],
  },
  {
    numero: 102, cle: "donne-moi-un-conseil", type: "CONTEXTUELLE", groupe: "Couple, famille et relations",
    wolof: "Waaw. Conseil bi ci ban domaine la : amour, famille, santé walla argent ?",
    francais: "D'accord. Le conseil concerne quel domaine : l'amour, la famille, la santé ou l'argent ?",
    suite: "Cette phrase sert seulement à identifier le domaine. Le conseil complet dépend ensuite de la situation décrite.",
    formes: ["Digal ma", "Donne-moi un conseil", "Am nga ab conseil ?", "Tu peux me conseiller ?", "Dama soxla conseil", "J'ai besoin d'un conseil de ta part"],
  },
  {
    numero: 103, cle: "compliment", type: "FIXE", groupe: "Nées des corrections aux 42",
    wolof: "Jërëjëf. Neex na ma dégg loolu.",
    francais: "Merci. Cela me fait plaisir de l'entendre.",
    formes: ["Baax nga", "Bravo BIA", "Yaa gën", "Tu es forte", "Sa liggéey baax na", "Tu fais vraiment du bon travail"],
  },
  {
    numero: 104, cle: "langues-parlees", type: "FIXE", groupe: "Nées des corrections aux 42",
    wolof: "Wolof mooy sama langue principale. Mën naa itam wax français ak anglais.",
    francais: "Le wolof est ma langue principale. Je parle aussi français et anglais.",
    formes: ["Yan làkk nga mën a wax ?", "Quelles langues parles-tu ?", "Ñaata làkk nga xam ?", "Tu parles combien de langues ?", "Wax ma làkk yi nga mën a wax", "Quelles sont les langues que tu maîtrises ?"],
  },
  {
    numero: 105, cle: "repete-derniere-reponse", type: "CONTEXTUELLE", groupe: "Nées des corrections aux 42",
    wolof: "Waaw, dinaa ko waxaat.",
    francais: "Oui, je vais le redire.",
    suite: "Le système rejoue ensuite la dernière réponse, sans repasser par la voix : c'est gratuit et immédiat. Si aucune réponse ne précède, BIA le dit au lieu de se taire.",
    formes: ["Waxaatal ko", "Répète", "Waxaatal ma ko beneen yoon.", "Redis-le moi", "Dégguma ko bu baax, waxaatal", "Tu peux répéter ce que tu viens de dire ?"],
  },
  {
    numero: 106, cle: "audio-utilisateur-incompris", type: "CONTEXTUELLE", groupe: "Nées des corrections aux 42",
    wolof: "Dégguma la bu baax. Waxaatal ma ko ndànk, su la neexee.",
    francais: "Je ne t'ai pas bien entendu. Répète doucement, s'il te plaît.",
    suite: "Cette phrase ne se déclenche PAR AUCUNE formulation : c'est BIA qui la sort quand la transcription est vide, trop courte ou illisible. Elle n'a donc pas de six façons.",
    formes: [],
  },
  {
    numero: 107, cle: "site-khalam", type: "FIXE", groupe: "Nées des corrections aux 42",
    wolof: "Lépp ci khalam.app la nekk : jeux yi, applications yi ak infos yi.",
    francais: "Tout est sur khalam.app : les jeux, les applications et les informations.",
    formes: ["Ana seen site ?", "C'est quoi votre site ?", "Fan laa leen di gis ci internet ?", "Où est votre site web ?", "Seen adresse internet ?", "Sur quel site je vous trouve ?"],
  },
  {
    numero: 108, cle: "contacter-khalam", type: "FIXE", groupe: "Nées des corrections aux 42",
    wolof: "Mën nga nu jokkoo ci khalam.app, formulaire bi fa la nekk.",
    francais: "Tu peux nous joindre depuis khalam.app, le formulaire s'y trouve.",
    formes: ["Naka laa leen di jokkoo ?", "Comment vous contacter ?", "Bëgg naa wax ak KHALAM", "Je veux joindre quelqu'un de KHALAM", "Am ngeen numéro walla mail ?", "Comment vous écrire directement ?"],
  },
  {
    numero: 109, cle: "condoleances-a-ecrire", type: "CONTEXTUELLE", groupe: "Nées des corrections aux 42",
    wolof: "Waaw. Wax ma turu ku faatu ak kan ngay yónnee message bi.",
    francais: "D'accord. Dis-moi le nom du défunt et à qui tu envoies le message.",
    suite: "BIA rédige ensuite le message et le montre avant tout envoi.",
    formes: ["Bindal ma ab message condoléances", "Écris-moi un message de condoléances", "Mën nga ma bindal message de condoléances ?", "Tu peux m'écrire un mot de condoléances ?", "Naka laa koy présenter condoléances ?", "Aide-moi à écrire pour un décès"],
  },
  {
    numero: 110, cle: "me-reconnais-tu", type: "CONTEXTUELLE", groupe: "Nées des coupures de 52 et 101",
    wolof: "Mënuma la reconnaître automatiquement. Wax ma sa tur, dinaa ko fàttaliku ci waxtaan bii.",
    francais: "Je ne peux pas te reconnaître automatiquement. Dis-moi ton nom, je m'en souviendrai pendant cette conversation.",
    suite: "Elle ne prétend pas connaître qui lui parle. Elle propose le seul chemin honnête : qu'on se nomme.",
    formes: ["Xam nga ma ?", "Tu me reconnais ?", "Ndax xam nga kan laa ?", "Tu sais qui je suis ?", "Fàttaliku nga ma ?", "Tu te souviens de moi ?"],
  },
  {
    numero: 111, cle: "ma-mere-me-manque", type: "FIXE", groupe: "Nées des coupures de 52 et 101",
    wolof: "Soo mënee, wooyal sa yaay walla nga yónnee ko message. Dégg baatam dina la defal jàmm.",
    francais: "Si tu le peux, appelle ta mère ou envoie-lui un message. Entendre sa voix te fera du bien.",
    formes: ["Namm naa sama yaay", "Ma mère me manque", "Sama yaay dafa ma manque", "Ma maman me manque beaucoup", "Sama yaay, namm naa ko lool", "Je pense beaucoup à ma mère"],
  },
];

/** Les familles, dans l'ordre où on les lit. */
export const GROUPES_BASE = ["Conversation naturelle", "Émotions et soutien", "Vie quotidienne sénégalaise", "Religion et expressions courantes", "Téléphone et fonctions pratiques", "Couple, famille et relations", "Nées des corrections aux 42", "Nées des coupures de 52 et 101"];
