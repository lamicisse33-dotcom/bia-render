/* ── QUATRE DÉCLENCHEURS DE PLUS PAR RÉPONSE ENREGISTRÉE ────────────────────

   Lamine, le 12 septembre 2026 au soir : « les mots déjà enregistrés, elle
   peut rester longtemps sans être sollicitée parce qu'il n'y a pas beaucoup
   d'appellations qui les sollicitent. Je veux que chaque phrase, on lui trouve
   six ou sept jusqu'à dix questions qui peuvent l'activer. »

   Mesuré avant : 84 réponses enregistrées, 758 déclencheurs — minimum six,
   MÉDIANE SEPT, et 67 réponses sous dix. Une réponse payée que presque rien
   n'atteint est de l'argent qui dort.

   ── CE FICHIER N'INVENTE PAS DE WOLOF ─────────────────────────────────────

   Mon wolof s'est trompé trois fois en deux jours : les milliers composés,
   l'argent en dërëm, et trente. Ces 262 formes viennent donc de deux
   endroits seulement :

     — LE FRANÇAIS DE DAKAR, celui qu'on mêle au wolof. C'est ma moitié
       fiable, et elle sert doublement : le moteur d'écoute entend du français
       huit fois sur douze, donc ces formes-là seront reconnues même quand le
       wolof dérape ;

     — LE WOLOF QU'IL A DÉJÀ ÉCRIT, recombiné — les mots de SES formes et de
       la réponse enregistrée elle-même. Jamais un mot neuf.

   ── ET CHACUNE EST VÉRIFIÉE AVANT D'ÊTRE ICI ──────────────────────────────

   Les 15 formes qui volaient la réponse d'une autre entrée ont
   été écartées et lui sont soumises à part : c'est à lui de trancher, pas au
   code. Les doublons de ses propres formes aussi (16).

   Le fichier est ADDITIF, comme formes-neuves.ts : il ne touche à aucune de
   ses lignes. Barrer ce qui ne se dit pas, c'est une ligne à enlever ici. */

export const FORMES_DE_PLUS: Record<string, string[]> = {
  "a-demain": ["on se voit demain inchallah", "ba suba ci jàmm inchallah", "à demain alors"],
  "alhamdoulilah": ["on rend grâce à Dieu", "Yàlla baax na lool", "on remercie Dieu", "sant Yàlla lool"],
  "as-tu-mange": ["tu as déjà mangé", "ndax lekk nga", "tu as mangé quelque chose", "tu as déjeuné", "lekk nga dara"],
  "attends": ["attends un peu", "xaar ma tuuti rekk", "patiente un instant"],
  "biba": ["biba mooy lan", "explique moi biba", "biba bi lan la"],
  "bonne-fete": ["joyeuse fête", "déwénati ak jàmm", "bonne fête à toi", "baal ma aq baal naa la"],
  "bonne-journee": ["bonne journée à toi", "yendul ak jàmm yendu", "passe une belle journée"],
  "chercher-internet": ["cherche sur internet", "seetal ma ci internet", "tu peux faire une recherche"],
  "code-marche-pas": ["mon code est refusé", "code bi nangu ma ko", "il y a un problème avec mon code"],
  "comment-avoir-code": ["je veux acheter un code", "fan laa jënd code bi", "comment je fais pour avoir un code"],
  "comment-sest-passee-ta-journee": ["comment était ta journée", "ça s'est bien passé aujourd'hui", "raconte moi ta journée", "naka journée bi", "ta journée était comment"],
  "compliment": ["tu es vraiment forte", "bravo à toi", "sa liggéey baax na lool", "tu travailles bien", "c'est du bon travail"],
  "contacter-khalam": ["naka laa leen di contacter", "je veux vous écrire", "vous avez un numéro", "comment parler à khalam"],
  "coupure-de-courant": ["il n'y a plus de courant", "courant bi dem na léegi", "ça a coupé", "on est dans le noir ici", "amul courant léegi"],
  "ecrire-message": ["écris moi un message", "bindal ma ab bataaxal", "tu peux rédiger un message"],
  "embouteillages": ["ça bouchonne beaucoup", "tali bi dafa fees lool", "je suis coincé dans le trafic", "il y a trop de circulation", "embouteillage bi dafa metti"],
  "encourage-moi": ["donne moi de la force", "dooleel ma", "j'ai besoin de courage", "dis moi quelque chose qui encourage", "remonte moi le moral"],
  "es-tu-humaine": ["tu es une machine", "ndax nit nga walla robot", "tu es un vrai humain"],
  "fille-ou-garcon": ["tu es une femme ou un homme", "jigéen nga walla góor", "tu es de quel sexe"],
  "gewel": ["gewel mooy lan", "à quoi sert gewel", "explique moi gewel", "gewel dafay def lu", "gewel bi lan la"],
  "il-fait-chaud": ["quelle chaleur", "tàngaay bi dafa metti lool", "il fait très chaud", "on étouffe ici", "dafa tàng lool"],
  "inchallah": ["inchallah ça va aller", "on verra inchallah", "inchallah bu soobee", "que Dieu facilite", "on espère inchallah"],
  "jai-fini-de-prier": ["je viens de prier", "julli naa léegi", "j'ai terminé ma prière", "je sors de prier", "pare naa julli bi"],
  "jai-peur": ["ça me fait peur", "dama ragal lool", "j'ai la trouille", "je suis mort de peur", "dama am tiitaange lool"],
  "je-me-sens-seul": ["je suis seul là", "dama wéet lool", "personne n'est avec moi", "je me sens abandonné", "je suis seul à la maison"],
  "je-mennuie": ["je m'ennuie là", "dama tàyyi lool", "il n'y a rien à faire", "je ne sais pas quoi faire", "je tourne en rond ici"],
  "je-narrive-pas-a-dormir": ["je ne dors pas", "mënuma nelaw dara", "j'ai du mal à dormir", "je suis réveillé depuis longtemps", "le sommeil ne vient pas"],
  "je-ne-sais-pas": ["tu connais ça toi", "est-ce que tu sais ça", "xam nga lolu", "tu as une idée là dessus"],
  "je-rentre-a-la-maison": ["je rentre là", "je prends la route", "maa ngi ñibbi léegi", "je rentre à la maison là"],
  "je-suis-arrive": ["ça y est je suis arrivé", "àgg naa léegi", "je viens d'arriver", "jot naa", "me voilà arrivé"],
  "je-suis-content": ["je suis de bonne humeur", "dama bég lool", "je suis trop content", "aujourd'hui je suis heureux", "sama xol dafa bég"],
  "je-suis-enerve": ["je suis en colère là", "dama mer lool", "ça m'a énervé", "je suis vraiment fâché", "dama am xol bu tàng lool"],
  "je-suis-fatigue": ["je suis très fatigué", "dama sonn lool", "je suis à bout"],
  "je-suis-inquiet": ["je m'inquiète", "dama jaaxle lool", "je suis stressé", "j'ai des soucis en tête", "ça me tracasse"],
  "je-suis-triste": ["je ne vais pas bien", "dama tiis lool", "j'ai le moral à zéro"],
  "je-vais-manger": ["je vais aller manger", "je pars manger", "c'est l'heure du repas", "je vais déjeuner"],
  "je-vais-prier": ["je pars prier", "c'est l'heure de la prière", "je vais faire ma prière", "julli bi jot na léegi"],
  "je-vais-sortir": ["je sors un peu", "je vais dehors", "je pars faire un tour", "maa ngi génn léegi"],
  "je-vais-travailler": ["je vais bosser", "je pars au bureau", "je vais commencer le travail", "maa ngi dem ci liggéey bi"],
  "kha-et-lamine": ["parle moi de lamine", "kha ak lamine ñan la ñu", "qui sont tes parents"],
  "khalam": ["khalam mooy lan", "khalam bi lan la", "explique moi khalam"],
  "langues-parlees": ["tu parles quelles langues", "làkk yi nga mën a wax", "tu connais combien de langues", "tu parles anglais aussi"],
  "les-applications": ["vous avez quelles applications", "ban application la ngeen am", "parle moi de vos applications"],
  "les-jeux": ["vous avez quels jeux", "ban jeux la ngeen am", "parle moi de vos jeux"],
  "ma-famille-me-manque": ["mes proches me manquent beaucoup", "dama namm sama famille", "je pense à ma famille", "ma famille est loin de moi"],
  "ma-mere-me-manque": ["ma mère me manque trop", "namm naa sama yaay lool", "je pense à ma maman", "ma maman est loin"],
  "montrer-images": ["montre moi une image", "wonal ma ay nataal", "tu peux me montrer une photo"],
  "non": ["pas du tout", "certainement pas", "déedéet kay"],
  "ou-es-tu": ["tu habites où", "fan nga dëkk léegi", "tu es basée où"],
  "oui": ["bien sûr", "tout à fait", "exactement", "waaw kay waaw"],
  "pardon": ["je te demande pardon", "baal ma ci loolu kay", "excuse moi vraiment"],
  "parles-tu-wolof": ["tu parles bien wolof", "ndax dégg nga wolof bu baax", "le wolof tu le maîtrises"],
  "parlons-un-peu": ["on parle un peu", "waxtaan nanu tuuti", "viens on discute", "je veux juste discuter", "on peut causer un peu"],
  "plus-de-connexion": ["ça ne capte pas", "connexion bi baaxul", "je n'ai plus internet", "le réseau est mauvais", "internet bi amul"],
  "pose-moi-une-question": ["pose moi une question toi", "laajal ma ab laaj", "demande moi quelque chose", "c'est à ton tour de demander", "interroge moi"],
  "prie-pour-moi": ["prie pour moi s'il te plaît", "j'ai besoin de tes prières", "defal ma ñaan", "ñaanal ma bu baax", "pense à moi dans tes prières"],
  "qui-es-tu": ["présente toi un peu", "yaw kan nga léegi", "dis moi qui tu es"],
  "raconte-moi-quelque-chose": ["raconte moi une histoire", "dis moi quelque chose", "tu peux me raconter un truc", "raconte moi un conte"],
  "ramadan-moubarak": ["bon ramadan", "bonne entrée en carême", "je te souhaite un bon carême"],
  "site-khalam": ["vous avez un site web", "l'adresse de votre site", "je cherche votre site internet"],
  "ton-age": ["tu as quel âge toi", "ñaata at nga am léegi", "tu es née quand"],
  "ton-nom": ["comment on t'appelle", "sa tur mooy lan léegi", "dis moi ton nom"],
  "traducteur": ["traducteur bi mooy lan", "vous avez une application de traduction"],
  "tu-comprends": ["tu as compris", "est ce que tu comprends bien", "tu me suis là", "tu saisis ce que je dis"],
  "tu-entends": ["tu m'entends là", "allo tu m'entends", "ndax dégg nga ma léegi", "est ce que ça passe", "tu reçois ma voix"],
  "tu-es-occupee": ["je te dérange", "t'es occupée là", "ndax occupée nga léegi", "je peux te parler maintenant"],
  "tu-fais-quoi": ["qu'est ce que tu fais là", "looy def léegi", "tu es en train de faire quoi"],
};

/** Combien ce fichier ajoute. Calculé, jamais écrit à la main. */
export const COMBIEN_DE_PLUS = Object.values(FORMES_DE_PLUS).reduce((n, f) => n + f.length, 0);
