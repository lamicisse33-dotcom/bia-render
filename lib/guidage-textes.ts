/* ── LES PHRASES DU GUIDAGE, À ÉCOUTER AVANT D'ENREGISTRER ──────────────────

   Lamine, le 11 septembre 2026 : « BIA doit pouvoir guider une personne pour
   qu'elle se retrouve, comme Google Maps, Waze… elle se retire pour laisser
   la carte, mais on peut continuer à parler avec elle. »

   ── POURQUOI CES PHRASES DOIVENT ÊTRE ENREGISTRÉES, ET PAS FABRIQUÉES ─────

   Ce n'est pas une économie ici, c'est une question de sécurité.

   Mesuré sur le vrai serveur, depuis Dakar : Soynade met environ deux
   secondes fixes plus 36 millisecondes par signe. « Tourne ci sa droite »
   fait vingt et un signes, donc près de trois secondes — et il faut y ajouter le
   voyage jusqu'au téléphone. À 50 km/h, trois secondes font quarante mètres :
   le carrefour est déjà passé.

   Une instruction de guidage arrive MAINTENANT ou elle ne sert à rien. Donc
   toutes sont enregistrées d'avance, et le guidage ne dépend plus ni de
   Soynade, ni du réseau, ni d'une clé.

   ── POURQUOI SI PEU DE PHRASES SUFFISENT ──────────────────────────────────

   J'ai regardé toutes les manœuvres qu'un calculateur d'itinéraire peut
   produire : tourner, serrer, continuer, faire demi-tour, entrer et sortir
   d'un rond-point, prendre une bretelle, arriver. C'est un vocabulaire FINI,
   et petit. QUARANTE-NEUF phrases couvrent tous les trajets du Sénégal, pour
   toujours.

   CE QUE ÇA COÛTE, COMPTÉ ET NON DEVINÉ : 2 934 signes dans les deux langues,
   soit 0,65 $ une seule fois, pour 98 fichiers. J'avais annoncé « environ dix
   centimes » à Lamine sans compter — c'était six fois trop bas. Le chiffre
   est calculé plus bas, par SIGNES_GUIDAGE, pour qu'il ne puisse plus être
   faux : un nombre écrit à la main devient faux à la première phrase
   ajoutée.

   Les distances sont arrondies à douze valeurs et DITES À PART : « Ci cent
   mètres » puis « Tourne ci sa droite ». Deux fichiers enchaînés au lieu d'un
   fichier par combinaison — douze plus vingt-quatre, au lieu de près de trois
   cents.

   ── POURQUOI LES RUES NE SONT PAS NOMMÉES ─────────────────────────────────

   Mesuré le 11 septembre 2026 sur OpenStreetMap, Plateau et Grand Dakar :
   15 445 tronçons de route, dont 2 128 seulement portent un nom — 14 %. Dans
   les rues de quartier, 1 364 sur 13 644, soit 10 %.

   BIA ne dira donc jamais « tourne à droite sur la rue Machin » : elle dira
   « dans cent mètres, tourne à droite ». C'est géométrique, pas nominatif —
   et c'est de toute façon ainsi qu'on guide quelqu'un ici.

   ── CES TEXTES SONT DE LAMINE, PAS DE MOI ─────────────────────────────────

   Je les avais écrits en wolof de livre : « Tourné ci ndeyjoor », « Tourné ci
   càmmooñ ». Il a corrigé les quarante-neuf dans la nuit du 12 septembre
   2026, et trente-six ont changé. Sa correction dit toute la même chose :

     LA DROITE ET LA GAUCHE SE DISENT EN FRANÇAIS. « Tourne ci sa droite »,
     pas « ndeyjoor ». Et avec : tout droit, demi-tour, rond-point,
     grand-route, bretelle, itinéraire, téléphone, embouteillage, GPS,
     réseau, mémoire, endroit, manière, recalculer, guider, continuer
     (« kontine »). C'est exactement la règle qui est écrite en tête de la
     consigne de BIA depuis le 10 septembre — un mot wolof qu'un chauffeur de
     taxi de Dakar n'emploierait pas est une faute, parce qu'il ne se comprend
     pas — et c'est moi qui l'avais oubliée en écrivant ces phrases.

     Au volant, elle compte double : un mot qu'on doit déchiffrer est un
     carrefour manqué.

   Le wolof porte la phrase — le verbe, la grammaire, le rythme : « Demal »,
   « Jëlal », « Nekkal », « Génnal », « Bu yoon wi jeexee », « Agsi nga »,
   « Jege nanu », « Muñal tuuti », « Wóoruma », « Danga wara jaar feneen ».
   Le français ne remplit que les trous. C'est ainsi qu'on parle à Dakar, et
   je ne le redécouvrirai pas une troisième fois.

   NE PAS RETOUCHER CES TEXTES. Comme pour les 42 et les 69 : changer un mot
   plus tard n'efface pas son enregistrement, et la nouvelle version ne sera
   jamais dite. Il faudrait effacer le fichier dans le seau d'abord.

   LES NOMBRES SE DISENT EN FRANÇAIS, même règle, depuis le 10 septembre. */

/* Relu et corrigé par Lamine dans la nuit du 12 septembre 2026 — les
   quarante-neuf, d'un coup, à une heure du matin. Le verrou est levé. */
export const RELU_GUIDAGE = true;

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
};

export const GROUPES_GUIDAGE = [
  {
    cle: "distances",
    titre: "Les distances",
    note: "Dites juste avant la manœuvre : « Ci cent mètres » puis « Tourne ci sa droite ». Les nombres se disent en français.",
  },
  {
    cle: "virages",
    titre: "Les virages",
    note: "Le cœur du guidage. Ce sont les phrases qu'on entend cent fois par trajet — si une seule sonne faux, tout le reste sonne faux.",
  },
  {
    cle: "carrefours",
    titre: "Les ronds-points et les carrefours",
    note: "Dakar en est fait, et « rond-point » s'y dit en français.",
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
  { cle: "d-maintenant", groupe: "distances", wolof: "Léegi, fii la.", francais: "Maintenant.", quand: "on y est — la manœuvre est là" },

  /* ── LES VIRAGES ─────────────────────────────────────────────────────────
     Les phrases les plus dites de toute l'application, et celles que j'avais
     le plus mal écrites. J'avais mis « ndeyjoor » et « càmmooñ » ; Lamine a
     mis « sa droite » et « sa gauche ». Au volant, à Dakar, c'est ça qu'on
     dit — et une instruction qu'on doit déchiffrer est un virage manqué. */
  { cle: "droite", groupe: "virages", wolof: "Tourne ci sa droite.", francais: "Tourne à droite.", quand: "virage à droite" },
  { cle: "gauche", groupe: "virages", wolof: "Tourne ci sa gauche.", francais: "Tourne à gauche.", quand: "virage à gauche" },
  { cle: "tout-droit", groupe: "virages", wolof: "Demal tout droit.", francais: "Continue tout droit.", quand: "aucun changement de direction" },
  { cle: "serre-droite", groupe: "virages", wolof: "Jëlal sa droite tuuti.", francais: "Serre à droite, légèrement.", quand: "la route se sépare doucement vers la droite" },
  { cle: "serre-gauche", groupe: "virages", wolof: "Jëlal sa gauche tuuti.", francais: "Serre à gauche, légèrement.", quand: "la route se sépare doucement vers la gauche" },
  { cle: "fort-droite", groupe: "virages", wolof: "Tourne bu baax ci sa droite.", francais: "Tourne franchement à droite.", quand: "virage serré" },
  { cle: "fort-gauche", groupe: "virages", wolof: "Tourne bu baax ci sa gauche.", francais: "Tourne franchement à gauche.", quand: "virage serré" },
  { cle: "reste-droite", groupe: "virages", wolof: "Nekkal ci sa droite.", francais: "Reste sur la droite.", quand: "il faut tenir sa file" },
  { cle: "reste-gauche", groupe: "virages", wolof: "Nekkal ci sa gauche.", francais: "Reste sur la gauche.", quand: "il faut tenir sa file" },
  { cle: "demi-tour", groupe: "virages", wolof: "Defal demi-tour.", francais: "Fais demi-tour.", quand: "il faut repartir en sens inverse" },

  /* ── LES RONDS-POINTS ET LES CARREFOURS ─────────────────────────────────
     Mon « ci catal yoon wi » pour « au bout de la rue » était le mot dont je
     doutais le plus, et j'avais raison d'en douter : Lamine l'a remplacé par
     « Bu yoon wi jeexee » — quand la rue se termine. Une proposition entière
     là où je cherchais un nom. */
  { cle: "rond-point-droite", groupe: "carrefours", wolof: "Ci rond-point bi, génnal ci sa droite.", francais: "Au rond-point, sors à droite.", quand: "" },
  { cle: "rond-point-gauche", groupe: "carrefours", wolof: "Ci rond-point bi, génnal ci sa gauche.", francais: "Au rond-point, sors à gauche.", quand: "" },
  { cle: "rond-point-tout-droit", groupe: "carrefours", wolof: "Ci rond-point bi, demal tout droit.", francais: "Au rond-point, continue tout droit.", quand: "" },
  { cle: "bout-de-rue-droite", groupe: "carrefours", wolof: "Bu yoon wi jeexee, tourne ci sa droite.", francais: "Au bout de la rue, tourne à droite.", quand: "la rue s'arrête, il faut tourner" },
  { cle: "bout-de-rue-gauche", groupe: "carrefours", wolof: "Bu yoon wi jeexee, tourne ci sa gauche.", francais: "Au bout de la rue, tourne à gauche.", quand: "la rue s'arrête, il faut tourner" },
  { cle: "prends-la-bretelle", groupe: "carrefours", wolof: "Jëlal bretelle bi.", francais: "Prends la bretelle.", quand: "entrée ou sortie de voie rapide" },
  { cle: "rejoins-la-voie", groupe: "carrefours", wolof: "Dugal ci grand-route bi.", francais: "Rejoins la grande route.", quand: "insertion" },

  /* ── L'ARRIVÉE ──────────────────────────────────────────────────────────
     « Agsi nga » — tu es arrivé. La seule que j'avais écrite juste du
     premier coup, et Lamine l'a gardée telle quelle. */
  { cle: "arrive", groupe: "arrivee", wolof: "Agsi nga. Fii la.", francais: "Tu es arrivé. C'est ici.", quand: "" },
  { cle: "arrive-droite", groupe: "arrivee", wolof: "Agsi nga. Mungi ci sa droite.", francais: "Tu es arrivé. C'est sur ta droite.", quand: "" },
  { cle: "arrive-gauche", groupe: "arrivee", wolof: "Agsi nga. Mungi ci sa gauche.", francais: "Tu es arrivé. C'est sur ta gauche.", quand: "" },
  { cle: "presque-arrive", groupe: "arrivee", wolof: "Jege nanu. Xaaral tuuti.", francais: "On est tout près. Encore un instant.", quand: "moins de trois cents mètres" },

  /* ── PENDANT LE TRAJET ──────────────────────────────────────────────────
     Elle ne parle pas pour parler : ces phrases servent aux moments où le
     silence inquiète. */
  { cle: "je-cherche-le-chemin", groupe: "route", wolof: "Maa ngi seet itinéraire bi. Xaaral tuuti.", francais: "Je cherche le chemin. Un instant.", quand: "pendant le calcul de l'itinéraire" },
  { cle: "allons-y", groupe: "route", wolof: "Nu dem. Maa ngi ak yaw.", francais: "Allons-y. Je suis avec toi.", quand: "au démarrage du guidage" },
  { cle: "bonne-route", groupe: "route", wolof: "Yaangi ci bon chemin bi. Kontine rekk.", francais: "Tu es sur le bon chemin. Continue.", quand: "après un long silence, pour rassurer" },
  { cle: "regarde-la-route", groupe: "route", wolof: "Xoolal yoon wi, bul xool téléphone bi. Man maa ngi lay guider.", francais: "Regarde la route, pas le téléphone. C'est moi qui parle.", quand: "au démarrage, une seule fois" },
  { cle: "on-continue", groupe: "route", wolof: "Nu kontine.", francais: "On continue.", quand: "après une pause" },
  { cle: "embouteillage", groupe: "route", wolof: "Embouteillage am na ci kanam. Muñal tuuti.", francais: "Il y a des embouteillages devant. Un peu de patience.", quand: "ralentissement détecté" },
  { cle: "temps-restant", groupe: "route", wolof: "Des na tuuti ci yoon wi.", francais: "Il reste encore un peu de route.", quand: "sans annoncer de minutes — elle ne les connaît pas assez bien pour les promettre" },
  { cle: "guidage-arrete", groupe: "route", wolof: "Damaa arrêter guidage bi. Maa ngi fi soo ma soxlaa.", francais: "J'arrête de te guider. Je reste là si tu as besoin.", quand: "quand on lui dit d'arrêter" },

  /* ── QUAND ÇA NE VA PAS ─────────────────────────────────────────────────
     C'est le groupe qui compte le plus, et c'est celui que les applications
     ratent. Une carte qui invente envoie quelqu'un chez WARI, fermé depuis
     dix ans — Lamine me l'a appris ce soir en regardant ce que la base de
     données prétendait savoir de Ouakam.

     Donc : quand elle ne sait pas, elle le DIT. Elle ne devine jamais un
     chemin, et elle ne prétend jamais être sûre d'une adresse. */
  { cle: "sorti-du-chemin", groupe: "ennuis", wolof: "Génn nga ci itinéraire bi. Maa ngi recalculer.", francais: "Tu as quitté le chemin. Je recalcule.", quand: "l'écart dépasse cinquante mètres" },
  { cle: "pas-de-gps", groupe: "ennuis", wolof: "Xamuma foo nekk léegi. GPS bi tontuwul.", francais: "Je ne sais pas où tu es en ce moment. Le GPS ne répond pas.", quand: "position perdue" },
  { cle: "pas-de-reseau", groupe: "ennuis", wolof: "Réseau amul. Waaye itinéraire bi nekk na ci mémoire.", francais: "Il n'y a pas de réseau. Mais je garde le chemin en mémoire.", quand: "coupure pendant le trajet" },
  { cle: "adresse-pas-sure", groupe: "ennuis", wolof: "Wóoruma ci endroit bii. Waxaatal ma ko ci beneen manière.", francais: "Je ne suis pas sûre de cet endroit. Redis-le moi autrement.", quand: "la recherche a trouvé quelque chose de douteux — elle préfère demander" },
  { cle: "adresse-introuvable", groupe: "ennuis", wolof: "Gisuma endroit bi. Wax ma li nekk ci wetam.", francais: "Je ne trouve pas cet endroit. Dis-moi ce qu'il y a autour.", quand: "rien trouvé — elle demande un repère" },
  { cle: "confirme", groupe: "ennuis", wolof: "Ndax mooy endroit bi ? Wax waaw walla déedéet.", francais: "C'est bien celui-là ? Réponds oui ou non.", quand: "avant de démarrer — jamais de guidage sans confirmation" },
  { cle: "pas-de-chemin", groupe: "ennuis", wolof: "Gisuma yoon buy dem fa. Danga wara jaar feneen.", francais: "Je ne trouve pas de route jusque là. Il faudra peut-être passer autrement.", quand: "aucun itinéraire calculable" },
];

/* Ce que les quarante-neuf coûtent à enregistrer, une seule fois, dans les
   deux langues. Calculé ici plutôt qu'écrit à la main : un nombre écrit à la
   main devient faux à la première phrase ajoutée. */
export const SIGNES_GUIDAGE = GUIDAGE.reduce((n, p) => n + p.wolof.length + p.francais.length, 0);
export const DOLLARS_GUIDAGE = Math.round(SIGNES_GUIDAGE * (0.22 / 1000) * 1000) / 1000;
