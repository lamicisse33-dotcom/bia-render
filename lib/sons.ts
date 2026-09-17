/* Les sons qui ne s'écrivent pas.

   Un rire lu par une synthèse vocale n'est pas un rire : « héé héé » sort en
   deux syllabes appliquées, et l'oreille n'y croit pas une seconde. Il faut
   de vrais enregistrements — de la même voix que celle qui a servi au
   clonage, sinon on entend deux personnes différentes dans la même bouche.

   Les fichiers vivent dans public/sons/. Chacun est facultatif : s'il
   manque, BIA garde simplement l'expression du visage sans le son. Rien ne
   casse, on perd seulement le grain. */

export type Souffle = {
  /** L'émotion renvoyée par le modèle qui déclenche ce son. */
  emotion: string;
  /** Les fichiers possibles — on en tire un au hasard, pour ne pas rire
      deux fois exactement pareil. */
  fichiers: string[];
  /** Les images à enchaîner pendant le son, et leur durée en millisecondes.

      La somme doit suivre la durée RÉELLE du fichier. Trop courte, le visage
      se fige et elle finit de rire immobile ; trop longue, les dernières
      images ne s'affichent jamais — les minuteries tombent avec le son. */
  visages: Array<[string, number]>;
  /* ── L'AMORCE ─────────────────────────────────────────────────────────

     Lamine, le 12 septembre 2026 au soir : « elle doit normalement commencer
     par le petit rire, ensuite enchaîner par le grand rire. »

     Le son nommé ici est joué JUSTE AVANT celui-ci, d'un trait. Un rire ne
     part pas à pleine gorge : il se retient une demi-seconde, puis il se
     lâche. C'est cette demi-seconde qui manquait. */
  prelude?: string;
};

export const SOUFFLES: Souffle[] = [
  {
    emotion: "rire",
    fichiers: ["/sons/rire-1.mp3", "/sons/rire-2.mp3", "/sons/rire-3.mp3"],
    // Les fichiers font de 1,3 à 1,9 s : l'arc tient en 1,8 s.
    visages: [["joie", 190], ["rire", 420], ["rire_tete", 480], ["rire", 380], ["joie", 330]],
  },
  {
    emotion: "fourire",
    fichiers: ["/sons/fourire-1.mp3", "/sons/fourire-2.mp3"],
    /* Le petit rire retenu vient devant : 0,5 s + 4,2 à 5,2 s, et le grand
       rire fait enfin les six secondes qu'il voulait entendre. */
    prelude: "malice",
    /* LE GRAND RIRE — 4,2 et 5,2 secondes. L’ancienne suite s’arrêtait au
       bout de 2,8 s : BIA riait encore deux secondes, le visage figé sur un
       sourire. Elle renverse maintenant la tête en arrière, longuement, et
       redescend — c’est ce que Lamine voulait voir. */
    visages: [["joie", 260], ["rire", 480], ["rire_tete", 900], ["fourire", 1100],
              ["rire_tete", 800], ["rire", 620], ["joie", 700]],
  },
  {
    emotion: "malice",
    /* Quatre variantes : c'est l'émotion la plus fréquente après le rire
       franc, et deux fichiers seulement s'entendaient revenir. Les deux
       premiers viennent de la prise dédiée, les deux autres de la fin de la
       longue prise. */
    fichiers: ["/sons/rire-retenu-1.mp3", "/sons/rire-retenu-2.mp3",
               "/sons/rire-retenu-3.mp3", "/sons/rire-retenu-4.mp3"],
    // Les petits rires ne durent qu’une demi-seconde : trois images serrées.
    visages: [["douce", 140], ["rire_retenu", 320], ["malice", 400]],
  },
  /* ── LE SOUFFLE D'ATTENTE — LE 17 SEPTEMBRE 2026 ──────────────────────

     Mesuré la veille sur 63 tours : 10,9 secondes entre sa dernière syllabe
     à lui et la première d'elle. Pendant ces onze secondes, BIA ne fait
     AUCUN bruit.

     ── ET CE SILENCE ÉTAIT UNE DÉCISION, PAS UN OUBLI ─────────────────────

     Lamine, le 12 septembre : « entendue une fois, c'est accueillant ;
     entendue à chaque question, c'est une machine qui récite. C'est ce qui a
     gâché la démonstration. » Il avait raison, et depuis elle se tait.

     MAIS IL PARLAIT D'UNE PHRASE. Une phrase de quarante secondes, dite avec
     des mots, répétée à chaque tour : insupportable, et à juste titre.

     Un « mmm » n'est pas une phrase. Il ne dit rien, il ne se récite pas, il
     dure une seconde. C'est ce qu'un être humain fait quand il réfléchit, et
     personne ne s'en agace. Sa décision tient donc entière : on ne remet pas
     la phrase — on ajoute le souffle.

     ── ET IL FAUT QU'IL SOIT ENREGISTRÉ, PAS FABRIQUÉ ─────────────────────

     C'est le point qui décide de tout. Fabriquer une phrase d'attente prend
     4,9 secondes chez Soynade — autant que la réponse elle-même. Une
     couverture qui arrive après ce qu'elle devait couvrir ne couvre rien.
     Enregistré, il part en un dixième de seconde.

     TROIS VARIANTES, et c'est la raison pour laquelle il en faut trois :
     c'est le son qu'elle fera le plus souvent de toute sa vie. Deux
     s'entendraient revenir en une conversation. */
  {
    emotion: "reflexion",
    /* ── RETIRÉS LE 17 SEPTEMBRE 2026, À SA DEMANDE ────────────────────
       Lamine, une heure après les avoir posés : « c'est pas bien fait,
       elle doit le reprendre, c'est trop court, alors que ça doit être un
       peu plus long. »
       Il a raison, et c'est ma faute de cadrage : je lui avais écrit
       « tenu une à deux secondes » sur la fiche, et j'ai découpé des
       morceaux de 0,89 s sans relever qu'ils étaient sous la consigne que
       j'avais moi-même donnée. Un « mmm » d'une seconde s'entend comme un
       hoquet ; c'est la tenue qui fait la réflexion.
       LA LISTE VIDE SUFFIT À L'ÉTEINDRE. Le mécanisme reste entier —
       éprouvé, branché, prêt. Quand Kha aura refait la prise, on remet les
       trois noms ici et elle recommence à réfléchir tout haut. */
    fichiers: [],
    /* Le visage ne bouge pas : il est déjà pensif pendant qu'elle réfléchit,
       et c'est exactement l'expression qu'il faut. Une suite d'images ici ne
       ferait que contredire l'état où elle se trouve. */
    visages: [],
  },
  {
    emotion: "etonnement",
    fichiers: ["/sons/oh-1.mp3", "/sons/oh-2.mp3"],
    visages: [["etonnement", 500], ["surprise", 600], ["etonnement", 400]],
  },
  {
    emotion: "surprise",
    fichiers: ["/sons/oh-1.mp3", "/sons/oh-2.mp3"],
    visages: [["etonnement", 340], ["surprise", 900], ["etonnement", 500]],
  },
];

/** Le souffle correspondant à une émotion, s'il en existe un. */
export function souffleDe(emotion: string): Souffle | null {
  return SOUFFLES.find((s) => s.emotion === emotion) || null;
}

/** Un fichier au hasard, en évitant celui qu'on vient de jouer. */
export function fichierDe(s: Souffle, dernier?: string | null): string {
  const libres = s.fichiers.filter((f) => f !== dernier);
  const liste = libres.length ? libres : s.fichiers;
  return liste[Math.floor(Math.random() * liste.length)];
}
