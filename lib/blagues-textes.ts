/* ── LES BLAGUES, DITES GRATUITEMENT ET JAMAIS DEUX FOIS DE SUITE ───────────

   Lamine, le 12 septembre 2026 : « quelques blagues seulement, et on le garde
   pour qu'elle puisse la raconter gratuitement. »

   Elles sont enregistrées comme les 84 réponses et les 49 phrases de guidage :
   achetées une fois, dites pour toujours sans un centime ni une seconde
   d'attente.

   ── LA ROTATION EST LA MOITIÉ DU TRAVAIL ──────────────────────────────────

   Une blague répétée n'est plus une blague. Servir toujours la première de la
   liste ferait pire que de n'en avoir aucune — on saurait, dès la deuxième
   fois, que la machine récite.

   LA MÉMOIRE DE CE QUI A DÉJÀ ÉTÉ DIT VIT SUR LE TÉLÉPHONE, pas sur le
   serveur. Render redémarre — vérifié trois fois cette nuit, à 01 h 38,
   02 h 02 et 02 h 19 — et une rotation gardée là-bas repartirait sans cesse
   de zéro, donc servirait éternellement la même. Le téléphone, lui, se
   souvient. Il envoie ce qu'il a déjà entendu, et le serveur choisit parmi le
   reste. Quand tout a servi, on repart au début.

   ── ELLE RIT APRÈS, PAS AVANT ─────────────────────────────────────────────

   L'ordre n'est pas un détail. Rire avant la chute, c'est la vendre ; rire
   après, c'est la partager. Chaque blague porte donc son rire, et il part
   quand elle a fini de parler.

   Lamine, le même soir : « je lui ai demandé de me raconter quelque chose de
   drôle, elle l'a raconté, c'était drôle, mais elle est restée sereine. Ce
   n'est pas bien, ça fait machine. »

   ── CE QUI PEUT ENTRER ICI ────────────────────────────────────────────────

   Les siennes, et celles qui circulent à Dakar depuis toujours. Pas le texte
   d'un humoriste : une blague de la rue appartient à tout le monde, un
   sketch d'artiste non — et BIA le dirait à des milliers de gens. */

export const RELU_BLAGUES = true;

export type Blague = {
  cle: string;
  /** Ce qu'elle raconte. C'est ce texte qui devient du son, mot pour mot. */
  wolof: string;
  francais: string;
  /** Le rire qui suit, et sa taille. « malice » est le petit rire retenu,
      « rire » le rire franc, « fourire » celui qui renverse la tête. */
  rire: "malice" | "rire" | "fourire";
  /** D'où elle vient. Pour qu'on sache, dans six mois, ce qu'on a le droit
      de dire. */
  origine: string;
};

export const BLAGUES: Blague[] = [
  {
    cle: "blague-chauffeur",
    /* Donnée par Lamine le 12 septembre 2026, dans les deux langues. Il a
       écrit « [Petit rire] » après la chute : c'est « malice », le rire
       retenu — pas le grand. Une blague courte ne se termine pas par un fou
       rire, sinon c'est elle qui rit à notre place. */
    wolof: "Dama laaj chauffeur bi : « Xam nga yoon wi ? » Mu ne ma : « Déedéet, waaye yaw itam xamoo ko. Kon pour le moment, égalité la ! »",
    francais: "J'ai demandé au chauffeur : « Tu connais le chemin ? » Il m'a répondu : « Non, mais toi non plus. Donc pour le moment, on est à égalité ! »",
    rire: "malice",
    origine: "Lamine, 12 septembre 2026",
  },
];

/* ── COMMENT ON LUI EN DEMANDE UNE ──────────────────────────────────────────

   Écrites par moi, à corriger par Lamine comme les 49 du guidage. Elles ne
   doivent PAS empiéter sur « raconte-moi quelque chose », qui existe déjà
   dans les 69 et qui appelle une histoire, pas une blague. */
export const DEMANDES_DE_BLAGUE: string[] = [
  "raconte moi une blague",
  "raconte une blague",
  "waxal ma ab caxaan",
  "caxaan",
  "dama begg ree",
  "fais moi rire",
  "am nga ab blague",
  "une blague",
  "blague",
  "wax ma ab blague",
  "reeal ma",
  "tu connais une blague",
];

/* Ce que les blagues coûtent à enregistrer, calculé et non écrit à la main —
   un nombre écrit à la main devient faux à la première blague ajoutée. */
export const SIGNES_BLAGUES = BLAGUES.reduce((n, b) => n + b.wolof.length + b.francais.length, 0);
export const DOLLARS_BLAGUES = Math.round(SIGNES_BLAGUES * (0.22 / 1000) * 1000) / 1000;
