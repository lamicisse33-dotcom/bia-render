/* ── CE QU'ELLE DIT EN EXÉCUTANT, ET QUAND ÇA NE MARCHE PAS ─────────────────

   Lamine, le 12 septembre 2026 :

     « On doit enregistrer la réponse de ses services afin qu'elle soit
       instantanée. Par exemple quand on lui demande, amène-moi quelque part
       sur la carte, elle doit répondre tout de suite : d'accord, j'exécute.
       Montre-moi une vidéo, elle doit dire d'accord, j'exécute. Et tout ça on
       doit le préenregistrer pour que ce soit plus instantané. »

   Puis : « essaye de voir de ton côté tout ce qui peut être utile, tout ce
   qui doit être immédiat, qu'on le mette. »

   ── POURQUOI C'EST LE MEILLEUR GAIN QUI RESTAIT ───────────────────────────

   Aujourd'hui, « emmène-moi à Ouakam » fait : transcription, puis le modèle
   écrit « d'accord, je t'emmène », puis Soynade fabrique cette phrase — DEUX
   SECONDES FIXES PLUS 36 ms PAR SIGNE, mesuré sur le vrai serveur. Elle
   parle donc quatre à six secondes plus tard, pendant que la carte est déjà
   en train de s'ouvrir. Pour une phrase qui ne change jamais.

   Enregistrée, elle part instantanément et pour zéro centime.

   ── CE QUE J'AI TROUVÉ EN CHERCHANT « TOUT CE QUI DOIT ÊTRE IMMÉDIAT » ────

   Deux familles, et la seconde vaut peut-être plus que la première.

   1. LES SERVICES, qu'il a demandés. Sept services, trois formulations
      chacun. Trois, et pas une : une seule phrase répétée, c'est le
      juke-box qu'on vient de retirer du répertoire six heures plus tôt.
      « D'accord, j'exécute » dit à l'identique vingt fois par jour redevient
      une machine.

   2. CE QU'ELLE DIT QUAND ÇA CASSE. Et là il y a pire que de la lenteur.

      Vérifié dans le code ce 12 septembre : « Mon oreille est en panne, ce
      n'est pas toi » est dite par la VOIX DE ROBOT du navigateur — parce
      qu'au moment où l'écoute est cassée, on ne va pas faire un aller-retour
      chez Soynade. Lamine l'a entendue cette nuit et me l'a signalé :
      « elle me dit que ses oreilles sont gâtées, c'est pas toi, avec la voix
      de la machine, pas avec la voix de Kha. »

      ET LES QUATRE MESSAGES DE CODE ne sont JAMAIS dits du tout. Quand un
      code est épuisé ou expiré, BIA renvoie un texte — mais elle ne peut pas
      le prononcer, puisque fabriquer une voix exige justement un code
      valide. Quelqu'un dont le code vient d'expirer n'entend donc RIEN.
      Enregistrées, ces phrases se lisent depuis le seau public, sans code :
      elle peut enfin dire pourquoi elle ne répond pas.

      C'est la règle de toute cette nuit, poussée jusqu'au bout : une panne
      qui se taît est pire qu'une panne.

   ── CE QUI N'EST PAS ICI, PARCE QUE C'EST DÉJÀ FAIT ───────────────────────

   LA SALUTATION À L'OUVERTURE. Il l'a demandée le même jour — « dès qu'on
   ouvre l'application elle doit saluer et dire je suis là ». Elle est DÉJÀ
   enregistrée et payée, trois fois :

       #salut      « Salut, maa ngi ci jàmm. Lan laa mëna defal tey pour yaw ? »
       #bonsoir    « Naka tay ? Maa ngi thi Diam yaw nakk. »
       #bienvenue  « Dalal ak jamm. Maa ngi lay dégglu. »

   (Recopiées ici telles qu'il les a corrigées le 12 septembre à 21 h 30 : un
   exemple qui cite un ancien texte fait chercher dans le mauvais fichier.)

   Il n'y a rien à enregistrer : il y a à les JOUER au bon moment, et c'est du
   code, pas de la voix. Trois formulations, donc pas de répétition, et le
   choix se fait sur l'heure.

   ── LE VERROU ─────────────────────────────────────────────────────────────

   RELU_SERVICES est resté FAUX jusqu'au 12 septembre à 22 h : tant que Lamine
   ne les avait pas relues, ces phrases n'étaient ni comptées, ni fabriquées,
   ni facturées. C'est la même règle que pour les 42, les 69 et les 49 du
   guidage — et elle a évité TROIS fois d'enregistrer du wolof que je croyais
   juste. La troisième fois est racontée juste en dessous : vingt corrections
   sur trente-quatre phrases. */

/* ── LE VERROU EST LEVÉ, LE 12 SEPTEMBRE 2026 À 22 H ────────────────────────

   Il a relu les trente-quatre phrases et m'a renvoyé VINGT corrections. Ce
   n'est pas une approbation polie : il a changé « Waaw, maa ngi la yóbbu » en
   « waw, niudém », remplacé « Waaw » par « Dacor » et « Dakcor » selon les
   endroits, corrigé neuf fois « maa ngi ko » en « maa ngi koy », et réécrit
   entièrement trois phrases de panne — dont celle du code épuisé, qui dit
   maintenant quoi FAIRE (« wital benen kod ci waa khalam ») au lieu de
   constater le problème.

   C'est exactement pour ça que le verrou existait. Vingt phrases sur
   trente-quatre auraient été enregistrées de travers, payées, et entendues
   par tout le monde pendant des mois.

   ── CE QUE LEVER LE VERROU CHANGE, DIT FRANCHEMENT ───────────────────────

   À partir de maintenant, BIA SERT CES PHRASES. Tant qu'elles ne sont pas
   enregistrées, chacune passe par le moteur de voix et se paie à l'usage.
   Il faut donc appuyer sur « enregistrer » — 0,43 $ une fois — et après quoi
   elles sont gratuites et instantanées pour toujours.

   ── ET IL PEUT ENCORE CORRIGER ────────────────────────────────────────────

   Lever le verrou ne ferme rien. Depuis ce soir, un texte corrigé après son
   enregistrement fait passer son son en « à refaire » tout seul, et refaire ne
   coûte que cette phrase-là. La relecture n'est plus un aller sans retour. */
export const RELU_SERVICES = true;

export type Service = {
  cle: string;
  wolof: string;
  francais: string;
  groupe: string;
  /** Quand elle le dit. Affiché sur la page de correction, jamais prononcé. */
  quand: string;
};

export const GROUPES_SERVICES = [
  {
    cle: "services",
    titre: "Quand elle exécute",
    note: "Dites à l'instant où elle lance l'action, pendant que la carte, la "
      + "vidéo ou le papier s'ouvre. Trois formulations par service, tirées au "
      + "sort en évitant la dernière employée : une seule phrase répétée vingt "
      + "fois par jour redevient une machine.",
  },
  {
    cle: "pannes",
    titre: "Quand ça ne marche pas",
    note: "Les plus importantes de la liste. Aujourd'hui, celles-ci sont dites "
      + "par la voix de robot du navigateur — ou ne sont pas dites du tout. "
      + "Enregistrées, elles se lisent sans clé et sans réseau de voix : c'est "
      + "précisément quand tout est cassé qu'on a besoin qu'elle parle.",
  },
] as const;

/* ── LES SERVICES ──────────────────────────────────────────────────────────

   Elles doivent être COURTES. Ce n'est pas une réponse, c'est un accusé de
   réception : ce qui compte arrive juste après, à l'écran. Une phrase longue
   ici ferait attendre devant une carte déjà ouverte.

   Écrites par moi, à corriger par Lamine — comme les 49 du guidage, dont il a
   changé trente-six sur quarante-neuf. Le wolof est à lui. */
/* ── CE QUI N'A PAS DE WOLOF, ET N'EN AURA PAS ──────────────────────────────

   Une phrase sans wolof ne se fabrique pas : la route d'enregistrement passe
   les textes vides (voir tousLesSonsAttendus). Elle n'est donc ni payée ni
   enregistrée, et c'est le français qui part.

   CE N'EST PLUS UNE ATTENTE, C'EST UNE DÉCISION. Lamine, le 14 septembre
   2026 : « d'accord papa, ce n'est pas la peine de l'écrire en wolof —
   d'accord papa ça suffit largement. » Il a raison, et c'est même mieux :
   « papa » se dit pareil dans les deux langues, la phrase est courte, et un
   accusé de réception n'a pas besoin de changer de langue avec la question.
   Un seul son à enregistrer au lieu de deux.

   LA LISTE RESTE, ET L'ÉPREUVE AVEC ELLE. Un wolof vide qui ne serait pas
   nommé ici resterait un trou qu'on retrouverait six mois plus tard. Ce qui
   change, c'est le sens : ce n'est plus une dette, c'est un choix — et un
   choix se déclare aussi. */
export const SANS_WOLOF_VOULU = ["ordre-daccord"];

/** L'ancien nom, gardé pour ne rien casser ailleurs. */
export const EN_ATTENTE_DE_SON_WOLOF = SANS_WOLOF_VOULU;

export const SERVICES: Service[] = [
  /* La carte. Dite pendant que le fond de carte se charge et que l'itinéraire
     se calcule : c'est le service dont l'attente est la plus longue, donc
     celui où la phrase sert le plus. */
  /* ── SA PHRASE, MOT POUR MOT ─────────────────────────────────────────────

     Lamine, le 12 septembre 2026 : « mais je n'entends pas d'accord
     j'exécute. »

     IL NE POUVAIT PAS L'ENTENDRE, et c'était mon fait. Il avait dit, au
     matin : « demande-lui de te montrer un endroit sur la carte, elle doit
     répondre tout de suite : d'accord, j'exécute. Montre-moi une vidéo, elle
     doit dire d'accord, j'exécute. » Et il avait dit aussi, plus tard, que la
     même phrase vingt fois par jour redevient une machine.

     J'ai résolu la tension tout seul, en remplaçant ses mots par vingt-quatre
     formulations de mon invention : « je t'emmène », « c'est parti », « je te
     la montre ». Aucune ne contenait ses mots. Sa phrase n'existait nulle
     part dans l'application, et c'est une décision de contenu — donc la
     sienne, pas la mienne.

     Elle est donc là, et elle appartient à TOUS les services au lieu d'être
     recopiée dans chacun : un seul enregistrement, entendu partout. Elle
     entre dans la rotation à côté des formulations particulières — il
     l'entend régulièrement, et pas vingt fois de suite.

     Le wolof est à vérifier à son oreille : « maa ngi ko def » est « je suis
     en train de le faire ». S'il préfère autre chose, c'est une ligne. */
  { cle: "svc-commun-1", groupe: "services", quand: "sa phrase, pour n'importe quel service",
    wolof: "Dacor.", francais: "D'accord, j'exécute." },

  { cle: "svc-carte-1", groupe: "services", quand: "il demande à être emmené quelque part",
    wolof: "waw, niudém.", francais: "D'accord, je t'emmène." },
  { cle: "svc-carte-2", groupe: "services", quand: "autre formulation",
    wolof: "Ñu dem, maa ngi seet yoon wi.", francais: "Allons-y, je cherche le chemin." },
  { cle: "svc-carte-3", groupe: "services", quand: "autre formulation",
    wolof: "Baax na, ñu dem.", francais: "C'est parti." },

  /* ── APRÈS LA SALUTATION : LE TOUR OÙ LE SILENCE EST LE PLUS LONG ─────
     Sa demande du 12 septembre au soir. Elle ne répond à rien : elle dit
     « j'ai entendu » pendant qu'on fabrique la réponse. Trois formulations,
     parce qu'une seule phrase répétée vingt fois par jour redevient une
     machine — c'est la règle qu'il a posée pour les services. */
  { cle: "svc-suite-1", groupe: "services", quand: "la phrase qui suit une salutation, quelle qu'elle soit",
    wolof: "Waaw, gis naa ko.", francais: "D'accord, je vois ça." },
  { cle: "svc-suite-2", groupe: "services", quand: "autre formulation",
    wolof: "waw, dégg naa la.", francais: "D'accord, je t'ai entendu." },
  { cle: "svc-suite-3", groupe: "services", quand: "autre formulation",
    wolof: "Baax na, maa ngi ci.", francais: "D'accord, je m'en occupe." },

  /* Une vidéo. L'éclipse dure 720 ms : la phrase se dit pendant qu'elle
     s'éteint, donc elle doit tenir en une seconde ou deux. */
  { cle: "svc-video-1", groupe: "services", quand: "il demande une vidéo",
    wolof: "Dakcor, maa ngi la koy won.", francais: "D'accord, je te la montre." },
  { cle: "svc-video-2", groupe: "services", quand: "autre formulation",
    wolof: "Xoolal, maa ngi koy ubbi.", francais: "Regarde, je l'ouvre." },
  { cle: "svc-video-3", groupe: "services", quand: "autre formulation",
    wolof: "Dacor, léegi.", francais: "D'accord, tout de suite." },

  /* Chercher sur Internet. Ici l'attente est réelle — le moteur met une
     seconde ou deux — et c'est exactement ce que la phrase couvre. */
  { cle: "svc-cherche-1", groupe: "services", quand: "il demande de chercher quelque chose",
    wolof: "Maa ngi seet.", francais: "Je cherche." },
  { cle: "svc-cherche-2", groupe: "services", quand: "autre formulation",
    wolof: "Xaaral tuuti, maa ngi seet.", francais: "Attends un peu, je cherche." },
  { cle: "svc-cherche-3", groupe: "services", quand: "autre formulation",
    wolof: "Maa ngi koy gis.", francais: "Je te trouve ça." },

  /* Montrer une image qu'elle a déjà. Instantané : la phrase doit être la
     plus courte de toutes, sinon elle parle après que l'image est apparue. */
  { cle: "svc-montre-1", groupe: "services", quand: "elle fait apparaître une image qu'elle a déjà",
    wolof: "Xoolal.", francais: "Regarde." },
  { cle: "svc-montre-2", groupe: "services", quand: "autre formulation",
    wolof: "Am, xoolal.", francais: "Tiens, regarde." },
  { cle: "svc-montre-3", groupe: "services", quand: "autre formulation",
    wolof: "Maa ngi lay won.", francais: "Je te montre." },

  /* Écrire un message ou un devis. Aujourd'hui, un fichier /sons/jecris.mp3
     est appelé ici — il n'a JAMAIS été déposé (vérifié : le dossier
     public/sons/ est vide). Elle se tait donc pendant qu'elle écrit. */
  { cle: "svc-ecrire-1", groupe: "services", quand: "il demande un message, une lettre, un devis",
    wolof: "waw, maa ngi koy bind.", francais: "D'accord, je l'écris." },
  { cle: "svc-ecrire-2", groupe: "services", quand: "autre formulation",
    wolof: "Maa ngi tàmbali.", francais: "Je commence." },
  { cle: "svc-ecrire-3", groupe: "services", quand: "autre formulation",
    wolof: "May ma tuuti, maa ngi koy bind.", francais: "Donne-moi un instant, je l'écris." },

  /* Lire un papier photographié. */
  { cle: "svc-lire-1", groupe: "services", quand: "il lui montre un papier à lire",
    wolof: "Maa ngi ko jàng.", francais: "Je le lis." },
  { cle: "svc-lire-2", groupe: "services", quand: "autre formulation",
    wolof: "Wonmako, ma xool.", francais: "Montre-le-moi, je regarde." },
  { cle: "svc-lire-3", groupe: "services", quand: "autre formulation",
    wolof: "Waaw, maa ngi xool.", francais: "D'accord, je regarde." },

  /* Ouvrir un numéro de téléphone. Elle ne passe pas l'appel : elle ouvre le
     numéro, et c'est la personne qui décide. La phrase doit le dire. */
  { cle: "svc-appel-1", groupe: "services", quand: "elle ouvre un numéro à appeler",
    wolof: "Maa ngi lay diokh numero bi.", francais: "Je t'ouvre le numéro." },
  { cle: "svc-appel-2", groupe: "services", quand: "autre formulation",
    wolof: "Jeeleel Numero bi.", francais: "Voilà le numéro." },
  { cle: "svc-appel-3", groupe: "services", quand: "autre formulation",
    wolof: "waaw, maa ngi koy ubbi.", francais: "D'accord, je l'ouvre." },

  /* ── QUAND ÇA NE MARCHE PAS ────────────────────────────────────────────

     Ces textes-là ne sont PAS de moi : ils existent déjà dans le code, mot
     pour mot, et plusieurs sont de Lamine. On ne les réécrit pas, on leur
     donne une voix — la vraie. */

  /* Dite aujourd'hui par la voix de robot du navigateur. Lamine l'a
     entendue : « elle me dit que ses oreilles sont gâtées, avec la voix de
     la machine, pas avec la voix de Kha. » */
  { cle: "panne-oreille", groupe: "pannes",
    quand: "l'écoute est cassée — clé refusée, quota épuisé. Répéter ne sert à rien",
    wolof: "Sama nopp bi degul dara, Xoolal ndakh am nga code bu bax.",
    francais: "Mon oreille est en panne, ce n'est pas toi. Regarde l'état de BIA." },

  /* ── L'ACCUSÉ DES ORDRES DU MAÎTRE ─────────────────────────────────────

     Lamine, le 14 septembre 2026 : « elle doit dire d'accord papa — il faut
     enregistrer ce mot-là pour qu'elle puisse le servir tout de suite. »

     C'est la réponse à TOUS ses ordres vocaux : stop stop, mémorise mémorise,
     supprime supprime, coupe le micro. Une seule phrase, enregistrée une
     fois, servie instantanément et gratuitement — voir lib/instructions.ts.

     EN FRANÇAIS, ET C'EST VOULU. Lui, le 14 septembre 2026 : « ce n'est pas
     la peine de l'écrire en wolof, d'accord papa ça suffit largement. »
     « Papa » se dit pareil dans les deux langues, et un accusé de réception
     n'a pas besoin de changer de langue avec la question. Un seul son à
     enregistrer au lieu de deux. */
  { cle: "ordre-daccord", groupe: "services",
    quand: "il vient de lui donner un ordre à la voix : stop stop, mémorise mémorise, supprime supprime",
    wolof: "",
    francais: "D'accord papa." },

  /* Déjà dans app/api/chat/route.ts, sous le nom PANNE_MOTEUR. */
  { cle: "panne-moteur", groupe: "pannes",
    quand: "le modèle ne répond pas",
    wolof: "Sama moteur bi tontuwul, kon mënuma la tontu bu wóor. Jéemal ci ay simili, walla nga xamal ko KHALAM.",
    francais: "Mon moteur ne répond pas pour l'instant, je ne peux pas te répondre correctement. Réessaie dans quelques instants, ou dis-le à KHALAM." },

  /* PAS_DE_CLE, même fichier. */
  { cle: "panne-sans-cle", groupe: "pannes",
    quand: "la clé du modèle manque sur le serveur",
    wolof: "Sama moteur bi taxawna : xolal sa crédit bi. Waala nga Wax ko KHALAM.",
    francais: "Mon moteur est arrêté : la clé n'est pas là. Dis-le à KHALAM." },

  /* Le message de l'erreur inattendue, fin de la route du chat. */
  { cle: "panne-reseau", groupe: "pannes",
    quand: "le réseau coupe au milieu d'un échange",
    wolof: "Jokkoo bi am na jafe-jafe. Jéemal beneen yoon.",
    francais: "La connexion a un problème. Réessaie." },

  /* La vidéo promise et pas montrée. Lamine, le 12 septembre : « je lui ai
     demandé de me montrer une vidéo, elle me dit d'accord je vais te
     montrer, mais elle ne montrait rien. » */
  { cle: "panne-video", groupe: "pannes",
    quand: "elle a dit qu'elle montrait une vidéo et la recherche a échoué",
    wolof: "waaye mënuma ubbi vidéo bi : sama recherche vidéo bi dafa doxul.",
    francais: "Mais je n'arrive pas à ouvrir la vidéo : ma recherche de vidéos ne marche pas en ce moment." },

  /* ── LES QUATRE CODES, QUI NE SONT JAMAIS DITS ─────────────────────────

     Elles existent dans app/api/chat/route.ts et partent en texte. Aucune
     n'est prononcée : fabriquer une voix exige un code valide, et c'est
     précisément le code qui manque. Quelqu'un dont le code expire n'entend
     donc rien du tout. Depuis le seau public, elles se lisent sans clé. */
  { cle: "code-absent", groupe: "pannes",
    quand: "personne n'a entré de code",
    wolof: "Duggal sa kod ngir waxtaan ak BIA.",
    francais: "Entre ton code pour parler avec BIA." },
  { cle: "code-invalide", groupe: "pannes",
    quand: "le code est faux",
    wolof: "Kod bi baaxul. Xoolaat ko.",
    francais: "Le code n'est pas bon. Vérifie-le." },
  { cle: "code-expire", groupe: "pannes",
    quand: "le code a dépassé son temps",
    wolof: "Sa kod bi jeex na waxtu wi.",
    francais: "Ton code a dépassé son temps." },
  { cle: "code-epuise", groupe: "pannes",
    quand: "le code a épuisé ses questions",
    wolof: "Sa kod bi jeex na. Wital benen kod ci waa khalam.",
    francais: "Ton code a épuisé ses questions." },
];

/* ── LES FAMILLES, POUR LA ROTATION ────────────────────────────────────────

   Le service se déduit de la clé : « svc-carte-2 » appartient à « carte ». On
   ne tient donc pas une seconde liste à jour à la main — une liste qu'on
   oublie de compléter, c'est un service qui n'a plus qu'une seule
   formulation, et personne ne s'en aperçoit. */
/* ── LES SALUTATIONS, ET CE QUI VIENT JUSTE APRÈS ──────────────────────────

   Lamine, le 12 septembre 2026 au soir : « quand on dit Salam ou bonjour,
   n'importe quelle forme de salutation, jusqu'à ce qu'elle réponde — et si la
   personne parle à nouveau, dès qu'elle finit de parler, aussitôt elle doit
   dire "d'accord, je vois ça". Peu importe ce que la personne dira. »

   POURQUOI C'EST LE BON ENDROIT. Une salutation, elle y répond en un dixième
   de seconde : le son est déjà dans le téléphone. Mais la phrase SUIVANTE est
   la vraie demande — et celle-là passe par le modèle puis par la voix : dix
   secondes, mesurées sur son serveur. C'est donc le silence le plus long de
   toute la conversation, et il tombe juste après le moment où elle a paru la
   plus vive. L'écart est ce qui fait « machine ».

   « D'accord, je vois ça » ne répond à rien, et c'est exactement son travail :
   dire « j'ai entendu, je m'en occupe » pendant qu'on fabrique la réponse. Ça
   part en un dixième de seconde, ça ne coûte rien, et ça ne se paie qu'une
   fois — comme les accusés de service au-dessus.

   CES CLÉS SONT LES SIENNES, à vérifier par lui : c'est lui qui sait ce qui
   est une salutation à Dakar. « Naka nga def » en est une ; « bonne journée »
   n'en est pas, c'est un adieu. */
export const SALUTATIONS = new Set<string>([
  "salut", "bonsoir", "ca-va", "la-famille", "quoi-de-neuf",
  "comment-sest-passee-ta-journee", "alhamdoulilah",
]);

export function familleDe(cle: string): string {
  const m = /^svc-([a-z]+)-\d+$/.exec(cle);
  return m ? m[1] : "";
}

export const FAMILLES: string[] = [...new Set(
  SERVICES.map((s) => familleDe(s.cle)).filter(Boolean),
)];

/** Les formulations d'un service, dans l'ordre. */
export function variantesDe(famille: string): Service[] {
  return SERVICES.filter((s) => familleDe(s.cle) === famille);
}

/* ── QUEL SERVICE VIENT D'ÊTRE LANCÉ ───────────────────────────────────────

   On le déduit du geste que le modèle a demandé, pas d'un mot de la question.
   Le geste ne ment pas : s'il y a une carte à ouvrir, c'est qu'on emmène
   quelqu'un. */
export type Geste = {
  carte?: unknown; film?: unknown; trouve?: unknown;
  voir?: unknown; papier?: unknown; appel?: unknown;
};

export function familleDuGeste(g: Geste): string {
  if (g.carte) return "carte";
  if (g.film) return "video";
  /* `trouve` est une recherche Internet qui a abouti — image ou vidéo. */
  if (g.trouve) return "cherche";
  if (g.voir) return "montre";
  if (g.papier) return "ecrire";
  if (g.appel) return "appel";
  return "";
}

/* ── LA ROTATION ───────────────────────────────────────────────────────────

   Trois formulations par service, et on évite celle qu'on vient de dire. La
   mémoire vient du TÉLÉPHONE, comme pour les blagues : Render redémarre — on
   l'a vu quatre fois en une nuit — et une rotation gardée sur le serveur
   repartirait sans cesse de zéro, donc resservirait éternellement la même.

   Rend null tant que le verrou est fermé : sans enregistrement, il n'y a rien
   à servir, et BIA continue comme avant. Une phrase promise sans son serait
   un silence. */
/** La famille qui n'en est pas une : sa phrase, valable pour tout service. */
export const FAMILLE_COMMUNE = "commun";

/* ── QUELLES FAMILLES PARTAGENT SA PHRASE ─────────────────────────────────

   Celles où BIA EXÉCUTE quelque chose — c'est le mot qu'il a employé. Pas
   « suite » : celle-là répond à une salutation et il a demandé pour elle une
   phrase précise, « d'accord, je vois ça ». Pas « lire » non plus : là elle
   ne lance rien, elle regarde ce qu'on lui tend. */
const QUI_EXECUTENT = new Set(["carte", "video", "cherche", "montre", "ecrire", "appel"]);

export function choisirService(famille: string, dernier = ""): Service | null {
  if (!RELU_SERVICES || !famille) return null;
  const propres = variantesDe(famille);
  const toutes = QUI_EXECUTENT.has(famille)
    ? [...variantesDe(FAMILLE_COMMUNE), ...propres]
    : propres;
  if (!toutes.length) return null;
  const libres = toutes.filter((s) => s.cle !== dernier);
  const parmi = libres.length ? libres : toutes;
  return parmi[Math.floor(Math.random() * parmi.length)];
}

/** Une phrase de panne, par sa clé. Null si le verrou est fermé. */
export function panneDite(cle: string): Service | null {
  if (!RELU_SERVICES) return null;
  return SERVICES.find((s) => s.cle === cle && s.groupe === "pannes") || null;
}

/* Ce que ça coûte à enregistrer, calculé et non écrit à la main : un nombre
   écrit à la main devient faux à la première phrase corrigée. */
export const SIGNES_SERVICES = SERVICES.reduce(
  (n, s) => n + s.wolof.length + s.francais.length, 0);
export const DOLLARS_SERVICES = Math.round(SIGNES_SERVICES * (0.22 / 1000) * 1000) / 1000;
