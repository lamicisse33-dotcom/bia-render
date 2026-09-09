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
  /** Les images à enchaîner pendant le son, et leur durée en millisecondes. */
  visages: Array<[string, number]>;
};

export const SOUFFLES: Souffle[] = [
  {
    emotion: "rire",
    fichiers: ["/sons/rire-1.mp3", "/sons/rire-2.mp3", "/sons/rire-3.mp3"],
    visages: [["joie", 260], ["rire", 520], ["rire_tete", 620], ["rire", 460], ["joie", 400]],
  },
  {
    emotion: "fourire",
    fichiers: ["/sons/fourire-1.mp3", "/sons/fourire-2.mp3"],
    visages: [["rire", 320], ["rire_tete", 640], ["fourire", 900], ["rire_tete", 520], ["joie", 420]],
  },
  {
    emotion: "malice",
    fichiers: ["/sons/rire-retenu-1.mp3", "/sons/rire-retenu-2.mp3"],
    visages: [["douce", 300], ["rire_retenu", 700], ["malice", 700]],
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
