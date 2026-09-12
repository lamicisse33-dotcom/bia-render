/* ── LES FAÇONS DE LE DIRE QU'ON N'AVAIT PAS PRÉVUES ────────────────────────

   Lamine, le 12 septembre 2026 :

     « Il faut aussi plusieurs appellations pour activer une réponse, parce
       qu'ici les gens utilisent d'autres formules. Voilà pourquoi elle ne lit
       pas souvent les mots enregistrés. Sur les salutations, il reste
       quelques mots que la jeunesse utilise et on ne les a pas mis, donc ça
       ne déclenche pas les fichiers enregistrés. »

   IL A RAISON, ET C'EST MESURÉ. J'ai essayé quatre-vingt-cinq formulations
   vraies, telles qu'on les dit à Dakar et telles que le micro les écrit :
   CINQUANTE-HUIT ne déclenchaient rien. Elles partaient donc chez le modèle
   et chez la voix — quatre à huit secondes et quelques centimes — pour une
   réponse déjà enregistrée et payée.

   Le répertoire avait 631 formulations pour 84 réponses, soit sept et demie
   par réponse. C'est beaucoup trop peu pour une langue qu'on écrit de dix
   façons et pour un français qu'on abrège.

   ── POURQUOI CE FICHIER EXISTE, ET PAS UNE MODIFICATION DES SIENS ─────────

   Parce que ses formulations sont à LUI. Le 11 septembre, après que j'en
   avais supprimé sept : « tout ce que j'ai regardé et corrigé doit être
   appelé… donc tu ne devais rien supprimer. » Ce fichier n'enlève rien et ne
   déplace rien : il AJOUTE, à côté, et lib/repertoire.ts fait la somme. On
   peut le vider entièrement sans toucher à une seule de ses lignes.

   ── CE QUI ENTRE ICI, ET CE QUI N'Y ENTRE PAS ─────────────────────────────

   SEULEMENT DU FRANÇAIS, DES ABRÉVIATIONS, ET DES SALUTATIONS ARABES
   COURANTES. Là, je ne prends aucun risque : « slt », « bjr », « ça roule »,
   « salamou aleykoum » ne demandent pas l'avis d'un locuteur wolof.

   LE WOLOF N'ENTRE PAS ICI. Il est dans le document que je lui ai préparé,
   à corriger par lui. J'ai écrit trente-six phrases de guidage sur
   quarante-neuf qu'il a dû réécrire : sur sa langue, je propose, je ne
   décide pas.

   ── ET CHAQUE AJOUT EST VÉRIFIÉ CONTRE LES AUTRES ─────────────────────────

   Une formulation ajoutée peut se mettre à répondre à la place d'une autre —
   c'est arrivé avec « lu xew », qui appelait deux réponses différentes. Les
   épreuves vérifient donc, à chaque ajout, qu'aucune formulation n'appelle
   deux réponses, et que les phrases qui ne DOIVENT PAS venir du répertoire
   n'y viennent toujours pas. Un répertoire qui se trompe une fois sur dix ne
   vaut pas d'exister. */

import { FORMES_DE_PLUS } from "./formes-de-plus";

export const FORMES_NEUVES: Record<string, string[]> = {
  /* Les salutations, celles qu'il signale en premier. « cc », « slt », « yo »
     s'écrivent au clavier ; « hey » et « hi » se disent aussi, à Dakar comme
     ailleurs, et le micro les écrit tels quels. */
  salut: [
    "slt", "bjr", "bonjou", "hey", "hey bia", "hi", "yo", "cc",
    "salamou aleykoum", "as salam aleykoum", "asalam",
  ],

  /* « Comment va » : c'est son exemple, mot pour mot. Un Dakarois demande
     « ça dit quoi », un autre « ça va ou bien », un troisième tape « cv ».
     Même réponse pour les trois — c'est exactement ce qu'il décrit. */
  /* « ÇA DIT QUOI » EST PARTI D'ICI, ET C'EST LUI QUI A RAISON.

     Je l'avais mis sur #ca-va ce matin. Le 12 septembre, dans sa liste, il le
     met sur #quoi-de-neuf — et il a raison : à Dakar « ça dit quoi » demande
     des nouvelles, pas la santé. C'était mon ajout, donc je le retire sans
     cérémonie. Il est plus bas, à sa place. */
  "ca-va": [
    "ca roule", "ca gaze", "cv", "sava", "koman sa va",
    "tu vas bien", "vous allez bien", "comment vous allez", "tu es comment",
    "comment tu te sens", "ca va ou bien",
  ],

  bonsoir: ["bsr", "bonne soiree"],

  "la-famille": ["la famille va bien", "et la famille ca va"],

  merci: ["thanks", "mercii", "merci bcp"],

  /* « Je pars » et « on se voit » sont des adieux, pas des annonces de
     déplacement : #je-vais-sortir existe pour ça, et l'épreuve vérifie
     qu'elles ne se confondent pas. */
  "au-revoir": ["ciao", "a plus", "a toute", "on se voit"],

  "quoi-de-neuf": ["quoi de neuf chez toi", "y a quoi"],

  "tu-fais-quoi": ["qu est ce que tu fais", "tu fais quoi la"],

  "je-suis-fatigue": ["je suis creve", "chuis fatigue", "je suis epuise"],

  "je-suis-triste": ["chuis pas bien", "je ne suis pas bien", "je suis mal"],

  "qui-es-tu": ["tu es qui", "presente toi", "c est qui bia"],

  "ton-nom": ["comment tu t appelles", "ton nom c est quoi"],

  "combien-ca-coute": ["ca coute combien", "c est combien"],

  "comment-avoir-code": ["comment obtenir un code", "je veux un code"],
};

/* ═══════════════════════════════════════════════════════════════════════════

   ── ET LA BASE DE DÉCLENCHEURS DE LAMINE ───────────────────────────────────

   Il l'a annoncée le 12 septembre 2026, et il l'a construite le même jour :

     « Je vais construire une base spéciale de déclencheurs pour les
       salutations de BIA : français courant, wolof simple, expressions
       modernes des jeunes et variantes phonétiques du micro. Je vais aussi
       éviter les mots trop courts comme "bon" ou "cool" seuls, qui
       risqueraient de lancer une mauvaise réponse. Le document gardera une
       seule réponse pré-enregistrée par intention. »

   Onze intentions, cent cinquante-huit formulations. Soixante-quinze y
   étaient déjà : c'est bon signe, ça veut dire que nos deux listes se
   recoupent là où il faut. Les autres sont ici.

   ── CE QUE SA LISTE APPORTE ET QUE JE N'AURAIS PAS TROUVÉ ─────────────────

   Le registre des jeunes de Dakar, et il n'est nulle part ailleurs :
   « yaangi cool », « yaangi nice », « naka life bi », « naka vibe bi »,
   « tout est carré », « ci loo nekk ». Du wolof qui prend ses adjectifs au
   français et à l'anglais — personne ne l'écrit dans un dictionnaire.

   Et les salutations du matin, que j'avais complètement oubliées :
   « jàmm nga fanaan » (as-tu passé la nuit en paix), « naka suba si »,
   « suba si jàmm », « bon réveil ». À Dakar on ne dit pas « bonjour », on
   demande si la nuit a été paisible.

   ── SA PRUDENCE SUR LES MOTS COURTS ÉTAIT JUSTE, ET MESURÉE ───────────────

   Vérifié avant de rien poser : « bon », « cool », « top », « voilà »,
   « bref » ne déclenchent rien aujourd'hui — et une formulation IDENTIQUE
   déclenche toujours, sans plancher de longueur. S'il les avait écrites,
   elles auraient répondu « Bonjour, je suis là » à chaque « bon ». Il ne les
   a pas écrites. Sa liste ne contient aucun mot à double sens. */
export const DE_LAMINE: Record<string, string[]> = {
  salut: [
    "hello", "hello bia", "salaam aleekum", "salam alaykoum",
    "assalamou aleykoum", "jàmm nga fanaan", "naka suba si", "naka suba",
    "suba si jàmm", "bon réveil", "nanga", "maa ngi lay nuyu",
  ],
  bonsoir: [
    "salut bonsoir", "coucou bonsoir", "bonsoir à toi",
  ],
  bienvenue: [
    "bienvenue à toi", "sois le bienvenu", "sois la bienvenue",
    "bienvenue chez nous", "bienvenue parmi nous", "aksil ak jàmm",
    "fii sa kër la", "kontaan nanu ci sa ñëw",
  ],
  "ca-va": [
    "comment allez vous", "tout va bien", "tu te portes bien", "la forme",
    "en forme", "noo def", "yaram bi naka", "mbaa lépp baax na",
    "yaangi baax", "yaangi cool", "mbaa yaangi cool", "yaangi nice",
    "mbaa yaangi nice", "naka life bi", "naka vibe bi", "ci loo nekk",
    "naka sa journée", "journée bi naka", "tout est carré",
  ],
  "la-famille": [
    "ta famille va bien", "comment vont les parents",
    "comment vont tes parents", "comment va la maison",
    "tout le monde va bien à la maison", "des nouvelles de la famille",
    "la famille se porte bien", "naka sa yaay ak sa baay", "famille bi naka",
    "waa kër ça va", "naka sa parents yi",
  ],
  "quoi-de-neuf": [
    "qu est ce qui est nouveau", "quelles sont les nouvelles", "ça dit quoi",
    "ça dit quoi nak", "lu bees", "ana lu bees", "lan moo xew", "lu nekk nak",
  ],
  "au-revoir": [
    "bye bye", "à plus tard", "on se revoit", "je m en vais",
    "je dois partir", "ba ci kanam", "dem naa",
  ],
  "bonne-nuit": [
    "dors bien", "repose toi bien", "fais de beaux rêves", "noppalul bu baax",
  ],
  "bonne-journee": [
    "passe une bonne journée", "yendul bu baax",
  ],
  "a-demain": [
    "rendez vous demain", "nu daje suba", "suba inchallah",
  ],
  "de-rien": [
    "de rien", "avec plaisir", "pas de quoi", "il n y a pas de quoi",
    "amul solo", "du dara",
  ],
};

for (const [cle, formes] of Object.entries(DE_LAMINE)) {
  FORMES_NEUVES[cle] = [...(FORMES_NEUVES[cle] || []), ...formes];
}

/* ── ET LES QUATRE DE PLUS PAR RÉPONSE ENREGISTRÉE ────────────────────────

   Demandées le 12 septembre au soir : « chaque phrase, on lui trouve six ou
   sept jusqu'à dix questions qui peuvent l'activer ». Elles vivent dans leur
   propre fichier — lib/formes-de-plus.ts — pour qu'on voie d'un coup d'œil ce
   qui vient de lui et ce qui vient de moi. */
for (const [cle, formes] of Object.entries(FORMES_DE_PLUS)) {
  FORMES_NEUVES[cle] = [...(FORMES_NEUVES[cle] || []), ...formes];
}

/** Combien de formulations ce fichier ajoute. Calculé, pas écrit à la main. */
export const COMBIEN_NEUVES = Object.values(FORMES_NEUVES)
  .reduce((n, f) => n + f.length, 0);
