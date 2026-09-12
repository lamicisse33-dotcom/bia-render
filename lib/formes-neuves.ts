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
  "ca-va": [
    "ca dit quoi", "ca roule", "ca gaze", "cv", "sava", "koman sa va",
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

/** Combien de formulations ce fichier ajoute. Calculé, pas écrit à la main. */
export const COMBIEN_NEUVES = Object.values(FORMES_NEUVES)
  .reduce((n, f) => n + f.length, 0);
