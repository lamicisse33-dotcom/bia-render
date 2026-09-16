/* ── « QUAND JE LUI DEMANDE DE FAIRE QUELQUE CHOSE, ELLE DOIT LE FAIRE » ────

   Lamine, le 17 septembre 2026 :

     « Il faut que BIA puisse entendre mes instructions. Quand je lui demande
       de se taire jusqu'à ce que je lui parle, elle doit se taire. Il faut
       qu'elle puisse appliquer les instructions que je lui donne
       directement. »

   ── POURQUOI CE FICHIER EXISTE AVANT LA RÉPARATION ────────────────────────

   Parce que je ne sais pas encore OÙ ça casse, et que j'ai eu tort deux fois
   cette semaine en affirmant sans mesurer. Entre sa bouche et le geste, il y
   a quatre marches, et chacune peut tomber :

     1. l'oreille transcrit mal — « tais-toi » devient autre chose ;
     2. le modèle n'y voit pas un ordre et ne pose aucune balise ;
     3. il pose la balise, mais le filtre ne la reconnaît pas (c'est ce qui
        est arrivé au mail le 15 septembre) ;
     4. tout marche, et le geste ne fait pas ce qu'il attendait.

   Les quatre donnent le même symptôme — « elle ne m'obéit pas » — et
   demandent quatre réparations différentes. Sans ce registre, je choisirais
   au hasard.

   ── CE QU'ON GARDE ─────────────────────────────────────────────────────────

   Pour chaque tour du maître : ce qu'on a ENTENDU de sa bouche, et ce qu'elle
   a FAIT. Rien d'autre. Mis côte à côte, ces deux colonnes disent en un coup
   d'œil laquelle des quatre marches est tombée.

   SES PHRASES NE SORTENT QU'AVEC SON CODE — même décision que le 16 et le 17
   septembre. Les comptes sont ouverts, les mots ne le sont pas.           */

type Tour = {
  /* Ce que l'oreille a cru entendre. C'est la marche 1 : s'il a dit
     « tais-toi » et qu'on lit autre chose, inutile de chercher plus loin. */
  dit: string;
  /* Ce qui a pris effet, en clair. Vide = elle n'a rien fait. */
  gestes: string[];
  quand: number;
};

const TOURS_GARDES = 30;

let tours: Tour[] = [];
let avecGeste = 0;

export function noterTour(dit: string, gestes: string[]): void {
  const propre = String(dit || "").trim().slice(0, 160);
  if (!propre) return;
  if (gestes.length) avecGeste++;
  tours.push({ dit: propre, gestes: gestes.slice(0, 6), quand: Date.now() });
  if (tours.length > TOURS_GARDES) tours = tours.slice(-TOURS_GARDES);
}

/** Les comptes seuls — ils ne disent rien de son wolof. */
export function resumeDesOrdres() {
  if (!tours.length) return null;
  return {
    tours: tours.length,
    /* La ligne qu'on lit en premier : sur ses derniers tours, combien ont
       produit un geste. Trop bas ne prouve rien tout seul — la plupart des
       tours sont des questions, pas des ordres — mais mis en face de sa
       plainte, l'écart se voit. */
    avec_un_geste: avecGeste,
  };
}

/** Le registre lui-même, le plus récent en dernier. Réservé au maître. */
export function registreDesOrdres(): Tour[] {
  return tours.map((t) => ({ ...t }));
}

export function oublierLesOrdres(): void {
  tours = [];
  avecGeste = 0;
}
