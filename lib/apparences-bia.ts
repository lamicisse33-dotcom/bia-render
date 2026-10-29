import {SATIN_ID, chargerPosterSatin} from './animation-satin';
/** Habillages visuels uniquement : aucune de ces valeurs n'est une persona
 * envoyée au cerveau, au micro ou au moteur vocal. */
export const TENUES_BIA = [
  { id: "vert-or", nom: "Vert et or" },
  { id: "wax-bleu", nom: "Wax bleu et ocre" },
  { id: "ivoire", nom: "Ivoire et bordeaux" },
] as const;
export type TenueBia = typeof TENUES_BIA[number]["id"];
export type ApparenceBia = TenueBia | typeof SATIN_ID | 'runway-direct';
export const APPARENCES_BIA = [...TENUES_BIA, {id: SATIN_ID, nom: 'Bia animée — satin bleu nuit'}, {id:'runway-direct',nom:'Bia bleu nuit — synchronisée (crédits Runway)'}] as const;
export function estApparenceBia(v: unknown): v is ApparenceBia { return v === 'runway-direct' || v === SATIN_ID || estTenueBia(v); }
export function chargerApparenceBia(id: ApparenceBia) { return id === 'runway-direct' || id === SATIN_ID ? chargerPosterSatin() : chargerTenueBia(id); }
export function apparenceLocaleBia(ancienne: string | null, runwayChoisi = false) {
  return !ancienne || (ancienne === 'runway-direct' && !runwayChoisi) ? SATIN_ID : ancienne;
}
export const CLE_APPARENCE_BIA = "bia-habillage-20261027";
export function estTenueBia(v: unknown): v is TenueBia {
  return TENUES_BIA.some(t => t.id === v);
}
export function imagesTenueBia(id: TenueBia) {
  const base = `/personnages/tenues-hd-20261028`;
  return { repos: `${base}/${id}-repos.webp`, gestes: `${base}/${id}-mains.webp`, visages: `${base}/visages.webp` };
}

// Chaque portrait conserve ses 1024 × 1536 pixels natifs. Le visage est un
// découpage de 1024 × 400, pas un personnage miniature agrandi.
export const GEOMETRIE_TENUE = { largeur: 1024, hauteur: 1536, visage: 400, mainsY: 800, poses: 3, visages: 9 } as const;
const VISAGES: Record<string, number> = {
  bouche_fermee: 0, bouche_entr: 1, bouche_a: 1, bouche_A: 3,
  bouche_o: 2, bouche_ou: 2, bouche_i: 4,
  yeux_ouverts: 0, yeux_mi: 5, yeux_fermes: 5, regard_cote: 6,
  douce: 0, joie: 4, etonnement: 8, surprise: 8, ecoute: 0,
  concernee: 7, triste: 7, malice: 4, pensive: 6,
  rire: 4, rire_tete: 4, fourire: 3, rire_retenu: 4,
};
export function visagePourFace(face: string, parle = false): number {
  // Un ancien mouvement de lèvres ne doit pas rester affiché après l'arrêt.
  if (!parle && /^bouche_(fermee|entr|a|A|o|ou|i)$/.test(face)) return 0;
  if (VISAGES[face] !== undefined) return VISAGES[face];
  const famille = face.replace(/_\d+$/, "");
  if (/^(reflexion)$/.test(famille)) return 6;
  if (/^(compassion)$/.test(famille)) return 7;
  if (/^(bouche_etonne|bouche_grosmot)$/.test(famille)) return 8;
  if (/^(rire_apaise|rire_main|salut|aurevoir|comprehension|bisou)$/.test(famille)) return 4;
  return 0;
}
export function positionVisage(i: number): string {
  return `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%`;
}

// Petits gestes ponctuels, précédés d'au moins 2,5 s de parole, puis repos long.
// Les lèvres et les noms de gestes historiques ne commandent jamais les bras.
export function programmerGestesBia({ emettre, planifier, annuler, alea = Math.random }: {
  emettre: (pose: number) => void;
  planifier: (suite: () => void, delai: number) => number;
  annuler: (id: number) => void;
  alea?: () => number;
}) {
  let actif = true;
  let timer: number;
  const attendre = (delai: number, suite: () => void) => {
    timer = planifier(() => { if (actif) suite(); }, delai);
  };
  const geste = () => {
    emettre(1);
    attendre(320, () => {
      emettre(2);
      attendre(650 + alea() * 400, () => {
        emettre(1);
        attendre(360, () => {
          emettre(0);
          attendre(5500 + alea() * 4000, geste);
        });
      });
    });
  };
  emettre(0);
  attendre(2500 + alea() * 1500, geste);
  return () => { actif = false; annuler(timer); emettre(0); };
}

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
