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

       #salut      « Salaamualeekum. Maa ngi fi. Lane ga soxla won ? »
       #bonsoir    « Naka tay ? Maa ngi thi Diam »
       #bienvenue  « Dalal ak jamm. Maa ngi lay xaar. »

   Il n'y a rien à enregistrer : il y a à les JOUER au bon moment, et c'est du
   code, pas de la voix. Trois formulations, donc pas de répétition, et le
   choix se fait sur l'heure.

   ── LE VERROU ─────────────────────────────────────────────────────────────

   RELU_SERVICES reste FAUX tant que Lamine ne les a pas relues sur
   /voix/services. Verrou fermé : ces phrases ne sont ni comptées, ni
   fabriquées, ni facturées. C'est la même règle que pour les 42, les 69 et
   les 49 du guidage — et elle a déjà évité deux fois d'enregistrer du wolof
   que je croyais juste. */

export const RELU_SERVICES = false;

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
export const SERVICES: Service[] = [
  /* La carte. Dite pendant que le fond de carte se charge et que l'itinéraire
     se calcule : c'est le service dont l'attente est la plus longue, donc
     celui où la phrase sert le plus. */
  { cle: "svc-carte-1", groupe: "services", quand: "il demande à être emmené quelque part",
    wolof: "Waaw, maa ngi la yóbbu.", francais: "D'accord, je t'emmène." },
  { cle: "svc-carte-2", groupe: "services", quand: "autre formulation",
    wolof: "Ñu dem, maa ngi seet yoon wi.", francais: "Allons-y, je cherche le chemin." },
  { cle: "svc-carte-3", groupe: "services", quand: "autre formulation",
    wolof: "Baax na, ñu dem.", francais: "C'est parti." },

  /* Une vidéo. L'éclipse dure 720 ms : la phrase se dit pendant qu'elle
     s'éteint, donc elle doit tenir en une seconde ou deux. */
  { cle: "svc-video-1", groupe: "services", quand: "il demande une vidéo",
    wolof: "Waaw, maa ngi la won ko.", francais: "D'accord, je te la montre." },
  { cle: "svc-video-2", groupe: "services", quand: "autre formulation",
    wolof: "Xoolal, maa ngi ko ubbi.", francais: "Regarde, je l'ouvre." },
  { cle: "svc-video-3", groupe: "services", quand: "autre formulation",
    wolof: "Waaw, léegi.", francais: "D'accord, tout de suite." },

  /* Chercher sur Internet. Ici l'attente est réelle — le moteur met une
     seconde ou deux — et c'est exactement ce que la phrase couvre. */
  { cle: "svc-cherche-1", groupe: "services", quand: "il demande de chercher quelque chose",
    wolof: "Maa ngi seet.", francais: "Je cherche." },
  { cle: "svc-cherche-2", groupe: "services", quand: "autre formulation",
    wolof: "Xaaral tuuti, maa ngi seet.", francais: "Attends un peu, je cherche." },
  { cle: "svc-cherche-3", groupe: "services", quand: "autre formulation",
    wolof: "Maa ngi la ko gis.", francais: "Je te trouve ça." },

  /* Montrer une image qu'elle a déjà. Instantané : la phrase doit être la
     plus courte de toutes, sinon elle parle après que l'image est apparue. */
  { cle: "svc-montre-1", groupe: "services", quand: "elle fait apparaître une image qu'elle a déjà",
    wolof: "Xoolal.", francais: "Regarde." },
  { cle: "svc-montre-2", groupe: "services", quand: "autre formulation",
    wolof: "Am, xoolal.", francais: "Tiens, regarde." },
  { cle: "svc-montre-3", groupe: "services", quand: "autre formulation",
    wolof: "Maa ngi la won.", francais: "Je te montre." },

  /* Écrire un message ou un devis. Aujourd'hui, un fichier /sons/jecris.mp3
     est appelé ici — il n'a JAMAIS été déposé (vérifié : le dossier
     public/sons/ est vide). Elle se tait donc pendant qu'elle écrit. */
  { cle: "svc-ecrire-1", groupe: "services", quand: "il demande un message, une lettre, un devis",
    wolof: "Waaw, maa ngi ko bind.", francais: "D'accord, je l'écris." },
  { cle: "svc-ecrire-2", groupe: "services", quand: "autre formulation",
    wolof: "Maa ngi tàmbali.", francais: "Je commence." },
  { cle: "svc-ecrire-3", groupe: "services", quand: "autre formulation",
    wolof: "May ma tuuti, maa ngi ko bind.", francais: "Donne-moi un instant, je l'écris." },

  /* Lire un papier photographié. */
  { cle: "svc-lire-1", groupe: "services", quand: "il lui montre un papier à lire",
    wolof: "Maa ngi ko jàng.", francais: "Je le lis." },
  { cle: "svc-lire-2", groupe: "services", quand: "autre formulation",
    wolof: "Wonal ma ko, maa ngi xool.", francais: "Montre-le-moi, je regarde." },
  { cle: "svc-lire-3", groupe: "services", quand: "autre formulation",
    wolof: "Waaw, maa ngi xool.", francais: "D'accord, je regarde." },

  /* Ouvrir un numéro de téléphone. Elle ne passe pas l'appel : elle ouvre le
     numéro, et c'est la personne qui décide. La phrase doit le dire. */
  { cle: "svc-appel-1", groupe: "services", quand: "elle ouvre un numéro à appeler",
    wolof: "Maa ngi la ubbil numero bi.", francais: "Je t'ouvre le numéro." },
  { cle: "svc-appel-2", groupe: "services", quand: "autre formulation",
    wolof: "Numero bi, am.", francais: "Voilà le numéro." },
  { cle: "svc-appel-3", groupe: "services", quand: "autre formulation",
    wolof: "Waaw, maa ngi ko ubbi.", francais: "D'accord, je l'ouvre." },

  /* ── QUAND ÇA NE MARCHE PAS ────────────────────────────────────────────

     Ces textes-là ne sont PAS de moi : ils existent déjà dans le code, mot
     pour mot, et plusieurs sont de Lamine. On ne les réécrit pas, on leur
     donne une voix — la vraie. */

  /* Dite aujourd'hui par la voix de robot du navigateur. Lamine l'a
     entendue : « elle me dit que ses oreilles sont gâtées, avec la voix de
     la machine, pas avec la voix de Kha. » */
  { cle: "panne-oreille", groupe: "pannes",
    quand: "l'écoute est cassée — clé refusée, quota épuisé. Répéter ne sert à rien",
    wolof: "Sama nopp bi dafa yàqu, du yaw. Xoolal état bi.",
    francais: "Mon oreille est en panne, ce n'est pas toi. Regarde l'état de BIA." },

  /* Déjà dans app/api/chat/route.ts, sous le nom PANNE_MOTEUR. */
  { cle: "panne-moteur", groupe: "pannes",
    quand: "le modèle ne répond pas",
    wolof: "Sama moteur bi tontuwul léegi, kon mënuma la tontu bu wóor. Jéemal ci ay simili, walla nga xamal ko KHALAM.",
    francais: "Mon moteur ne répond pas pour l'instant, je ne peux pas te répondre correctement. Réessaie dans quelques instants, ou dis-le à KHALAM." },

  /* PAS_DE_CLE, même fichier. */
  { cle: "panne-sans-cle", groupe: "pannes",
    quand: "la clé du modèle manque sur le serveur",
    wolof: "Sama moteur bi taxawul : kon bi ci biir amul. Wax ko KHALAM.",
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
    wolof: "Waaye mënuma ubbi vidéo bi : sama recherche vidéo bi dafa dox ul léegi.",
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
    wolof: "Kod bi baaxul. Xoolaatal ko.",
    francais: "Le code n'est pas bon. Vérifie-le." },
  { cle: "code-expire", groupe: "pannes",
    quand: "le code a dépassé son temps",
    wolof: "Sa kod bi jeex na waxtu wi.",
    francais: "Ton code a dépassé son temps." },
  { cle: "code-epuise", groupe: "pannes",
    quand: "le code a épuisé ses questions",
    wolof: "Sa kod bi jeex na laaj yi ko àttan.",
    francais: "Ton code a épuisé ses questions." },
];

/* ── LES FAMILLES, POUR LA ROTATION ────────────────────────────────────────

   Le service se déduit de la clé : « svc-carte-2 » appartient à « carte ». On
   ne tient donc pas une seconde liste à jour à la main — une liste qu'on
   oublie de compléter, c'est un service qui n'a plus qu'une seule
   formulation, et personne ne s'en aperçoit. */
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
export function choisirService(famille: string, dernier = ""): Service | null {
  if (!RELU_SERVICES || !famille) return null;
  const toutes = variantesDe(famille);
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
