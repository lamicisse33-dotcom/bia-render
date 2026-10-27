/** Habillages visuels uniquement : aucune de ces valeurs n'est une persona
 * envoyée au cerveau, au micro ou au moteur vocal. */
export const TENUES_BIA = [
  { id: "vert-or", nom: "Vert et or" },
  { id: "wax-bleu", nom: "Wax bleu et ocre" },
  { id: "ivoire", nom: "Ivoire et bordeaux" },
] as const;
export type TenueBia = typeof TENUES_BIA[number]["id"];
export const CLE_APPARENCE_BIA = "bia-habillage-20261027";
export function estTenueBia(v: unknown): v is TenueBia {
  return TENUES_BIA.some(t => t.id === v);
}
export function imagesTenueBia(id: TenueBia) {
  const base = `/personnages/tenues-20261027/${id}`;
  return { expressions: `${base}-expressions.webp`, gestes: `${base}-gestes.webp` };
}

const FACES = ["bouche_fermee", "bouche_entr", "bouche_a", "bouche_A", "bouche_o", "bouche_ou", "bouche_i",
  "yeux_ouverts", "yeux_mi", "yeux_fermes", "regard_cote", "douce", "joie", "etonnement", "surprise",
  "ecoute", "concernee", "triste", "malice", "pensive", "rire", "rire_tete", "fourire", "rire_retenu"];
// Les indices sont à base zéro. On conserve tous les noms émis par le moteur
// d'animation historique, même lorsque plusieurs transitions partagent une pose.
const CYCLES: Record<string, number[]> = {
  salut: [0, 12, 13, 14], aurevoir: [0, 15, 13, 14],
  coeur: [0, 16, 17, 16], coeur_double: [0, 1, 16, 17, 17, 16, 1, 0],
  bisou: [0, 1, 23, 23, 6, 6, 1, 0], rire_main: [0, 1, 23, 23, 23, 6, 1, 0],
  bouche_etonne: [0, 1, 23, 0], bouche_grosmot: [0, 23, 23, 0],
  paume: [0, 6, 7, 0], priere: [0, 18, 18, 0], compter: [0, 9, 10, 11],
  reflexion: [0, 19, 19, 0], compassion: [0, 20, 20, 0],
};
const EMOTIONS_CYCLES: Record<string, number[]> = {
  ecoute: [7, 15, 8, 7], comprehension: [15, 11, 12, 7],
  douceur: [7, 11, 11, 7], rire_apaise: [20, 12, 11, 7],
};
export function imagePourFace(face: string): { planche: "expressions" | "gestes"; case: number } {
  const directe = FACES.indexOf(face);
  if (directe >= 0) return { planche: "expressions", case: directe };
  const match = /^(.*)_(\d+)$/.exec(face);
  if (match) {
    const i = Number(match[2]) - 1;
    if (CYCLES[match[1]]?.[i] !== undefined) return { planche: "gestes", case: CYCLES[match[1]][i] };
    if (EMOTIONS_CYCLES[match[1]]?.[i] !== undefined) return { planche: "expressions", case: EMOTIONS_CYCLES[match[1]][i] };
  }
  return { planche: "expressions", case: 7 };
}
export function positionCase(i: number): string {
  return `${(i % 6) * 20}% ${Math.floor(i / 6) * 100 / 3}%`;
}
// Un mouvement lent des bras, indépendant du rythme rapide des lèvres.
export const GESTES_PAROLE = [0, 1, 2, 3, 2, 1, 0, 0, 6, 8, 6, 0];

const chargements = new Map<TenueBia, Promise<void>>();
export function chargerTenueBia(id: TenueBia): Promise<void> {
  const deja = chargements.get(id);
  if (deja) return deja;
  const promesse = Promise.all(Object.values(imagesTenueBia(id)).map(src => new Promise<void>((resolve, reject) => {
    const image = new Image();
    const limite = setTimeout(() => reject(new Error("Chargement de la tenue trop long")), 20000);
    image.onerror = () => { clearTimeout(limite); reject(new Error("Tenue indisponible")); };
    image.onload = () => {
      const decodage = typeof image.decode === "function" ? image.decode() : Promise.resolve();
      decodage.then(() => { clearTimeout(limite); resolve(); }, e => { clearTimeout(limite); reject(e); });
    };
    image.src = src;
  }))).then(() => undefined);
  chargements.set(id, promesse);
  void promesse.catch(() => { if (chargements.get(id) === promesse) chargements.delete(id); });
  return promesse;
}
