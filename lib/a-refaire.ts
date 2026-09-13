/* ── LES SONS À REFAIRE PARCE QUE LE TEXTE A CHANGÉ AVANT LE MANIFESTE ──────

   Le manifeste des textes, posé le 12 septembre 2026, sait voir qu'un texte a
   changé DEPUIS le dernier enregistrement. Mais il lui faut un point de
   départ, et il n'en a pas : les trois cent vingt-six sons en place ont été
   enregistrés avant qu'il n'existe, et personne n'a gardé l'empreinte des
   textes de ce jour-là.

   AU PREMIER PASSAGE, LE MANIFESTE NE PEUT DONC RIEN DÉTECTER. Il inscrit ce
   qu'il trouve et se taira à partir de la prochaine fois. C'est le choix
   honnête — déclarer les 326 périmés ferait repayer un dollar pour rien.

   SAUF QUE DEUX CHANGEMENTS SONT ARRIVÉS AVANT LUI, LE MÊME SOIR, et ils
   seraient passés dessous sans un mot :

     1. LES ONZE CORRECTIONS DE LAMINE aux 42 phrases, arrivées à 21 h 30. Il
        a réécrit « Salaamualeekum. Maa ngi fi » en « Salut, maa ngi ci jàmm »,
        « Waaw » en « waw », ajouté « Sénégal » devant « Dakar », et donné à
        « que sais-tu faire » une phrase de plus sur la carte. Les textes sont
        corrigés ; les sons, eux, disent encore les anciens mots.

     2. L'ADRESSE DU SITE, qui se dit maintenant « khalam point ap » au lieu
        d'être envoyée écrite au moteur de voix. Quatorze textes la citent.

   Sans cette liste, l'écran aurait affiché ses corrections, BIA aurait
   continué de dire les anciens mots, et « rien à refaire » se serait affiché
   — exactement le trou qu'il m'a demandé de boucher : « il faut vérifier
   est-ce que vraiment elle lit les mots corrigés ».

   ── ELLE SE VIDE D'ELLE-MÊME ──────────────────────────────────────────────

   Un son de cette liste n'est forcé QUE tant que le manifeste ne porte pas
   déjà l'empreinte de son texte actuel. Dès qu'il est refait, son empreinte
   est inscrite et la liste ne le concerne plus. Elle ne fera donc pas
   repayer deux fois, et il n'y a rien à retirer à la main.

   ── ET ELLE NE DOIT PAS GRANDIR ───────────────────────────────────────────

   À partir de maintenant, le manifeste fait le travail : un texte corrigé
   après un enregistrement se signale tout seul. Cette liste est un rattrapage
   pour un soir, pas une habitude. Si elle s'allonge un jour, c'est le signe
   que quelque chose contourne le manifeste, et c'est ÇA qu'il faudra réparer.

   Le nom est « langue/clé », comme dans le manifeste et comme le chemin du
   fichier dans le seau.                                                    */

/** Les onze phrases qu'il a corrigées le 12 septembre au soir. Le français
    n'a pas bougé : ses corrections portaient sur le wolof. */
export const CORRIGES_LE_12_SEPTEMBRE = [
  "wo/salut",
  "wo/bonsoir",
  "wo/ca-va",
  "wo/bienvenue",
  "wo/oui",
  "wo/attends",
  "wo/bonne-nuit",
  "wo/qui-es-tu",
  "wo/ou-es-tu",
  "wo/que-sais-tu-faire",
  "wo/parles-tu-wolof",
];

/** Les quatorze textes qui citent l'adresse du site — sept réponses, dans
    leurs deux langues. Relevés par lib/adresses.ts, pas à la main. */
export const CITENT_LE_SITE = [
  "wo/les-jeux", "fr/les-jeux",
  "wo/ou-nous-trouver", "fr/ou-nous-trouver",
  "wo/comment-avoir-code", "fr/comment-avoir-code",
  "wo/combien-ca-coute", "fr/combien-ca-coute",
  "wo/code-marche-pas", "fr/code-marche-pas",
  "wo/site-khalam", "fr/site-khalam",
  "wo/contacter-khalam", "fr/contacter-khalam",
];

/** Le français de « que sais-tu faire » a bougé le 13 septembre 2026 : il
    disait moins que le wolof, il ne citait pas la carte. Son enregistrement
    dit donc lui aussi les anciens mots. */
export const CORRIGE_LE_13_SEPTEMBRE = ["fr/que-sais-tu-faire"];

/** Tout ce qu'il faut refaire une fois, et une seule. */
export const A_REFAIRE_UNE_FOIS = new Set([
  ...CORRIGES_LE_12_SEPTEMBRE,
  ...CITENT_LE_SITE,
  ...CORRIGE_LE_13_SEPTEMBRE,
]);

/* ── QUAND LE SON NE DIT PLUS CE QUE LE TEXTE DIT ───────────────────────────

   Une adresse de son ne porte pas le texte : elle porte la CLÉ. Un texte
   corrigé après l'enregistrement s'affiche donc corrigé et se DIT comme
   avant — c'est tout le propos de la liste ci-dessus, et c'est une dette
   qu'on paie d'un bouton, « refaire », sur la page du répertoire.

   Tant qu'elle n'est pas payée, la plupart de ces écarts sont des nuances de
   formulation : « Waaw » devenu « waw ». Personne ne les entend, et servir
   l'ancien son reste le bon choix — il est instantané.

   MAIS PAS CELUI-LÀ. Le 12 septembre au soir, Lamine a ajouté au wolof de
   « que sais-tu faire » une phrase ENTIÈRE, celle qui dit qu'elle sait
   guider jusqu'à une destination. Le son, lui, énumère encore ce qu'elle
   savait faire AVANT la carte. Ce n'est plus une nuance : c'est une capacité
   qu'elle possède et qu'elle n'annonce pas — exactement ce qu'il a constaté
   le 13 au soir, une heure avant de montrer BIA à des partenaires.

   Pour ces clés-là, et pour elles seules, on ne sert pas l'enregistrement :
   la voix fabrique le texte d'aujourd'hui. C'est le même moteur et la même
   voix — les enregistrements sont eux-mêmes fabriqués par lui, puis rangés —
   donc on ne perd que le temps de la fabrication, à peu près une seconde, et
   seulement sur cette question-ci.

   CETTE LISTE DOIT SE VIDER, pas grandir : dès que le son est refait, la
   ligne se retire d'ici et la réponse redevient instantanée. */
export const SONS_QUI_DISENT_AUTRE_CHOSE = new Set([
  "wo/que-sais-tu-faire",
  "fr/que-sais-tu-faire",
]);
