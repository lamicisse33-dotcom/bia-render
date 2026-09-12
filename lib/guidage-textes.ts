/* ── LES PHRASES DU GUIDAGE, À ÉCOUTER AVANT D'ENREGISTRER ──────────────────

   Lamine, le 11 septembre 2026 : « BIA doit pouvoir guider une personne pour
   qu'elle se retrouve, comme Google Maps, Waze… elle se retire pour laisser
   la carte, mais on peut continuer à parler avec elle. »

   ── POURQUOI CES PHRASES DOIVENT ÊTRE ENREGISTRÉES, ET PAS FABRIQUÉES ─────

   Ce n'est pas une économie ici, c'est une question de sécurité.

   Mesuré sur le vrai serveur, depuis Dakar : Soynade met environ deux
   secondes fixes plus 36 millisecondes par signe. « Tourné ci ndeyjoor » fait
   dix-neuf signes, donc près de trois secondes — et il faut y ajouter le
   voyage jusqu'au téléphone. À 50 km/h, trois secondes font quarante mètres :
   le carrefour est déjà passé.

   Une instruction de guidage arrive MAINTENANT ou elle ne sert à rien. Donc
   toutes sont enregistrées d'avance, et le guidage ne dépend plus ni de
   Soynade, ni du réseau, ni d'une clé.

   ── POURQUOI SI PEU DE PHRASES SUFFISENT ──────────────────────────────────

   J'ai regardé toutes les manœuvres qu'un calculateur d'itinéraire peut
   produire : tourner, serrer, continuer, faire demi-tour, entrer et sortir
   d'un rond-point, prendre une bretelle, arriver. C'est un vocabulaire FINI,
   et petit. Une quarantaine de phrases couvre tous les trajets du Sénégal,
   pour toujours, pour environ dix centimes.

   Les distances sont arrondies à douze valeurs et DITES À PART : « Ci
   téeméeri meetar » puis « tourné ci ndeyjoor ». Deux fichiers enchaînés au
   lieu d'un fichier par combinaison — douze plus vingt, au lieu de deux cent
   quarante.

   ── POURQUOI LES RUES NE SONT PAS NOMMÉES ─────────────────────────────────

   Mesuré le 11 septembre 2026 sur OpenStreetMap, Plateau et Grand Dakar :
   15 445 tronçons de route, dont 2 128 seulement portent un nom — 14 %. Dans
   les rues de quartier, 1 364 sur 13 644, soit 10 %.

   BIA ne dira donc jamais « tourne à droite sur la rue Machin » : elle dira
   « dans cent mètres, tourne à droite ». C'est géométrique, pas nominatif —
   et c'est de toute façon ainsi qu'on guide quelqu'un ici.

   ── CE QUI EST ÉCRIT ICI EST DE MOI, DONC PROBABLEMENT FAUX ───────────────

   Mon wolof est celui d'un livre. Celui de Lamine est celui de Dakar, et sur
   des phrases qu'on entend en conduisant, c'est le seul qui compte. Les
   entrées marquées douteux: true sont celles dont je suis le moins sûr — pas
   pour qu'il relise moins, pour qu'il commence par là.

   RIEN NE S'ENREGISTRE tant que RELU_GUIDAGE vaut false. Il les écoute sur
   /voix/guidage, corrige, et c'est seulement après qu'on achète les fichiers.

   LES NOMBRES SE DISENT EN FRANÇAIS, c'est la règle de BIA depuis le
   10 septembre : « cinquante mètres », jamais « juróom-fukki meetar ». Un
   nombre en wolof ancien ne se comprend pas, et sur une distance, ne pas se
   comprendre fait manquer le virage. */

export const RELU_GUIDAGE = false;

export type PhraseGuidage = {
  /** La clé, et le nom du fichier son. */
  cle: string;
  /** Ce qu'elle dit. C'est ce texte qui devient du son, mot pour mot. */
  wolof: string;
  /** La même chose en français, pour qui lui parle français. */
  francais: string;
  /** Quand cette phrase sort. Pour la page de relecture, pas pour le son. */
  quand: string;
  groupe: string;
  /** Mon wolof me paraît fragile ici. À regarder en premier. */
  douteux?: boolean;
};

export const GROUPES_GUIDAGE = [
  {
    cle: "distances",
    titre: "Les distances",
    note: "Dites juste avant la manœuvre : « Ci téeméeri meetar » puis « tourné ci ndeyjoor ». Les nombres se disent en français.",
  },
  {
    cle: "virages",
    titre: "Les virages",
    note: "Le cœur du guidage. Ce sont les phrases qu'on entend cent fois par trajet — si une seule sonne faux, tout le reste sonne faux.",
  },
  {
    cle: "carrefours",
    titre: "Les ronds-points et les carrefours",
    note: "Dakar en est fait. « Rond-point » se dit en français partout, je ne l'ai pas traduit.",
  },
  {
    cle: "arrivee",
    titre: "L'arrivée",
    note: "",
  },
  {
    cle: "route",
    titre: "Ce qu'elle dit pendant le trajet",
    note: "Pour qu'on sache qu'elle est là, sans qu'elle parle pour rien.",
  },
  {
    cle: "ennuis",
    titre: "Quand ça ne va pas",
    note: "Le plus important du lot : ce qu'elle dit quand elle ne sait pas. Une carte qui se tait vaut mieux qu'une carte qui invente.",
  },
];

export const GUIDAGE: PhraseGuidage[] = [
  /* ── LES DISTANCES ────────────────────────────────────────────────────────
     Douze valeurs, et pas une de plus. On arrondit à celle qui approche :
     127 mètres devient « cent mètres ». Personne ne conduit au mètre. */
  { cle: "d-50", groupe: "distances", wolof: "Ci cinquante mètres.", francais: "Dans cinquante mètres.", quand: "la manœuvre est très proche" },
  { cle: "d-100", groupe: "distances", wolof: "Ci cent mètres.", francais: "Dans cent mètres.", quand: "" },
  { cle: "d-150", groupe: "distances", wolof: "Ci cent cinquante mètres.", francais: "Dans cent cinquante mètres.", quand: "" },
  { cle: "d-200", groupe: "distances", wolof: "Ci deux cents mètres.", francais: "Dans deux cents mètres.", quand: "" },
  { cle: "d-300", groupe: "distances", wolof: "Ci trois cents mètres.", francais: "Dans trois cents mètres.", quand: "" },
  { cle: "d-400", groupe: "distances", wolof: "Ci quatre cents mètres.", francais: "Dans quatre cents mètres.", quand: "" },
  { cle: "d-500", groupe: "distances", wolof: "Ci cinq cents mètres.", francais: "Dans cinq cents mètres.", quand: "" },
  { cle: "d-700", groupe: "distances", wolof: "Ci sept cents mètres.", francais: "Dans sept cents mètres.", quand: "" },
  { cle: "d-1km", groupe: "distances", wolof: "Ci un kilomètre.", francais: "Dans un kilomètre.", quand: "" },
  { cle: "d-2km", groupe: "distances", wolof: "Ci deux kilomètres.", francais: "Dans deux kilomètres.", quand: "" },
  { cle: "d-3km", groupe: "distances", wolof: "Ci trois kilomètres.", francais: "Dans trois kilomètres.", quand: "" },
  { cle: "d-5km", groupe: "distances", wolof: "Ci cinq kilomètres.", francais: "Dans cinq kilomètres.", quand: "" },
  { cle: "d-maintenant", groupe: "distances", wolof: "Léegi.", francais: "Maintenant.", quand: "on y est — la manœuvre est là" },

  /* ── LES VIRAGES ─────────────────────────────────────────────────────────
     « ndeyjoor » et « càmmooñ » sont les mots de la droite et de la gauche.
     Le verbe est le vrai doute : j'ai pris « tourné », le français que tout
     le monde emploie au volant, plutôt qu'un mot wolof que Lamine
     n'entendrait nulle part. C'est peut-être moi qui me trompe. */
  { cle: "droite", groupe: "virages", wolof: "Tourné ci ndeyjoor.", francais: "Tourne à droite.", quand: "virage à droite", douteux: true },
  { cle: "gauche", groupe: "virages", wolof: "Tourné ci càmmooñ.", francais: "Tourne à gauche.", quand: "virage à gauche", douteux: true },
  { cle: "tout-droit", groupe: "virages", wolof: "Dem jubal.", francais: "Continue tout droit.", quand: "aucun changement de direction" },
  { cle: "serre-droite", groupe: "virages", wolof: "Jubal ci ndeyjoor, tuuti rekk.", francais: "Serre à droite, légèrement.", quand: "la route se sépare doucement vers la droite", douteux: true },
  { cle: "serre-gauche", groupe: "virages", wolof: "Jubal ci càmmooñ, tuuti rekk.", francais: "Serre à gauche, légèrement.", quand: "la route se sépare doucement vers la gauche", douteux: true },
  { cle: "fort-droite", groupe: "virages", wolof: "Tourné bu wóor ci ndeyjoor.", francais: "Tourne franchement à droite.", quand: "virage serré", douteux: true },
  { cle: "fort-gauche", groupe: "virages", wolof: "Tourné bu wóor ci càmmooñ.", francais: "Tourne franchement à gauche.", quand: "virage serré", douteux: true },
  { cle: "reste-droite", groupe: "virages", wolof: "Toppal ci ndeyjoor.", francais: "Reste sur la droite.", quand: "il faut tenir sa file", douteux: true },
  { cle: "reste-gauche", groupe: "virages", wolof: "Toppal ci càmmooñ.", francais: "Reste sur la gauche.", quand: "il faut tenir sa file", douteux: true },
  { cle: "demi-tour", groupe: "virages", wolof: "Walbatil, dellul ginnaaw.", francais: "Fais demi-tour.", quand: "il faut repartir en sens inverse", douteux: true },

  /* ── LES RONDS-POINTS ET LES CARREFOURS ─────────────────────────────────
     « Rond-point » se dit en français à Dakar, personne ne dit autrement.
     « Catal » pour le bout de la rue est le mot dont je suis le moins sûr de
     tout ce fichier. */
  { cle: "rond-point-droite", groupe: "carrefours", wolof: "Ci rond-point bi, génn ci ndeyjoor.", francais: "Au rond-point, sors à droite.", quand: "" },
  { cle: "rond-point-gauche", groupe: "carrefours", wolof: "Ci rond-point bi, génn ci càmmooñ.", francais: "Au rond-point, sors à gauche.", quand: "" },
  { cle: "rond-point-tout-droit", groupe: "carrefours", wolof: "Ci rond-point bi, dem jubal.", francais: "Au rond-point, continue tout droit.", quand: "" },
  { cle: "bout-de-rue-droite", groupe: "carrefours", wolof: "Ci catal yoon wi, tourné ci ndeyjoor.", francais: "Au bout de la rue, tourne à droite.", quand: "la rue s'arrête, il faut tourner", douteux: true },
  { cle: "bout-de-rue-gauche", groupe: "carrefours", wolof: "Ci catal yoon wi, tourné ci càmmooñ.", francais: "Au bout de la rue, tourne à gauche.", quand: "la rue s'arrête, il faut tourner", douteux: true },
  { cle: "prends-la-bretelle", groupe: "carrefours", wolof: "Jël bretelle bi.", francais: "Prends la bretelle.", quand: "entrée ou sortie de voie rapide", douteux: true },
  { cle: "rejoins-la-voie", groupe: "carrefours", wolof: "Duggal ci yoon wu mag wi.", francais: "Rejoins la grande route.", quand: "insertion", douteux: true },

  /* ── L'ARRIVÉE ──────────────────────────────────────────────────────────
     « Agsi nga » — tu es arrivé. Celle-là, je la crois juste. */
  { cle: "arrive", groupe: "arrivee", wolof: "Agsi nga. Fii la.", francais: "Tu es arrivé. C'est ici.", quand: "" },
  { cle: "arrive-droite", groupe: "arrivee", wolof: "Agsi nga. Mungi ci sa ndeyjoor.", francais: "Tu es arrivé. C'est sur ta droite.", quand: "" },
  { cle: "arrive-gauche", groupe: "arrivee", wolof: "Agsi nga. Mungi ci sa càmmooñ.", francais: "Tu es arrivé. C'est sur ta gauche.", quand: "" },
  { cle: "presque-arrive", groupe: "arrivee", wolof: "Ñu ngi jege. Xaaral tuuti.", francais: "On est tout près. Encore un instant.", quand: "moins de trois cents mètres", douteux: true },

  /* ── PENDANT LE TRAJET ──────────────────────────────────────────────────
     Elle ne parle pas pour parler : ces phrases servent aux moments où le
     silence inquiète. */
  { cle: "je-cherche-le-chemin", groupe: "route", wolof: "Maa ngi seet yoon wi. Xaaral tuuti.", francais: "Je cherche le chemin. Un instant.", quand: "pendant le calcul de l'itinéraire" },
  { cle: "allons-y", groupe: "route", wolof: "Ñu dem. Maa ngi ak yaw.", francais: "Allons-y. Je suis avec toi.", quand: "au démarrage du guidage" },
  { cle: "bonne-route", groupe: "route", wolof: "Yoon wi baax na. Dem jubal.", francais: "Tu es sur le bon chemin. Continue.", quand: "après un long silence, pour rassurer", douteux: true },
  { cle: "regarde-la-route", groupe: "route", wolof: "Xoolal yoon wi, bul xool telefon bi. Man laay wax.", francais: "Regarde la route, pas le téléphone. C'est moi qui parle.", quand: "au démarrage, une seule fois" },
  { cle: "on-continue", groupe: "route", wolof: "Ñu ngi dem.", francais: "On continue.", quand: "après une pause" },
  { cle: "embouteillage", groupe: "route", wolof: "Am na embouteillage ci kanam. Muñal tuuti.", francais: "Il y a des embouteillages devant. Un peu de patience.", quand: "ralentissement détecté", douteux: true },
  { cle: "temps-restant", groupe: "route", wolof: "Des na tuuti.", francais: "Il reste encore un peu de route.", quand: "sans annoncer de minutes — elle ne les connaît pas assez bien pour les promettre" },
  { cle: "guidage-arrete", groupe: "route", wolof: "Baña naa la guide. Maa ngi fi su ngay soxla.", francais: "J'arrête de te guider. Je reste là si tu as besoin.", quand: "quand on lui dit d'arrêter", douteux: true },

  /* ── QUAND ÇA NE VA PAS ─────────────────────────────────────────────────
     C'est le groupe qui compte le plus, et c'est celui que les applications
     ratent. Une carte qui invente envoie quelqu'un chez WARI, fermé depuis
     dix ans — Lamine me l'a appris ce soir en regardant ce que la base de
     données prétendait savoir de Ouakam.

     Donc : quand elle ne sait pas, elle le DIT. Elle ne devine jamais un
     chemin, et elle ne prétend jamais être sûre d'une adresse. */
  { cle: "sorti-du-chemin", groupe: "ennuis", wolof: "Génn nga ci yoon wi. Maa ngi seetaat.", francais: "Tu as quitté le chemin. Je recalcule.", quand: "l'écart dépasse cinquante mètres", douteux: true },
  { cle: "pas-de-gps", groupe: "ennuis", wolof: "Xamuma fu nga nekk léegi. GPS bi feeñul.", francais: "Je ne sais pas où tu es en ce moment. Le GPS ne répond pas.", quand: "position perdue" },
  { cle: "pas-de-reseau", groupe: "ennuis", wolof: "Réseau bi amul. Waaye yoon wi maa ngi ko yor.", francais: "Il n'y a pas de réseau. Mais je garde le chemin en mémoire.", quand: "coupure pendant le trajet", douteux: true },
  { cle: "adresse-pas-sure", groupe: "ennuis", wolof: "Wóoruma ci bérab bi. Wax ma ko benneen yoon.", francais: "Je ne suis pas sûre de cet endroit. Redis-le moi autrement.", quand: "la recherche a trouvé quelque chose de douteux — elle préfère demander" },
  { cle: "adresse-introuvable", groupe: "ennuis", wolof: "Gisuma bérab bi. Wax ma lu ko wërale.", francais: "Je ne trouve pas cet endroit. Dis-moi ce qu'il y a autour.", quand: "rien trouvé — elle demande un repère" },
  { cle: "confirme", groupe: "ennuis", wolof: "Ndax mooy bi ? Waaw walla déedéet.", francais: "C'est bien celui-là ? Réponds oui ou non.", quand: "avant de démarrer — jamais de guidage sans confirmation" },
  { cle: "pas-de-chemin", groupe: "ennuis", wolof: "Mënuma gis yoon bu dem fa. Xanaa dangay wër ?", francais: "Je ne trouve pas de route jusque là. Il faudra peut-être passer autrement.", quand: "aucun itinéraire calculable", douteux: true },
];

/** Les phrases dont mon wolof est le plus fragile. Par où commencer. */
export const A_REGARDER_DABORD = GUIDAGE.filter((p) => p.douteux).map((p) => p.cle);
