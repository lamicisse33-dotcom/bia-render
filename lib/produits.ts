import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* ── CE QU'ELLE SAIT DES PRODUITS DE BEAUTÉ ─────────────────────────────────

   Demandé par Lamine le 9 septembre 2026 — « une liste que BIA doit mémoriser
   pour quand on lui demande où trouver des produits de beauté » — et rempli le
   10 septembre avec la première marque, DD SKIN.

   ET AUSSITÔT BORNÉ PAR LUI, le même jour, dans les termes qui comptent le
   plus : « son cœur ne doit pas être ce business. BIA doit rester ce qu'elle
   est, seulement ça. Quand on lui demandera, seulement concernant les
   produits cosmétiques, elle pourra expliquer comme une publicité, tout
   simplement. »

   Il a raison, et c'était le vrai risque. Un texte de marque posé dans la
   consigne d'une assistante déteint sur tout : trois échanges plus tard elle
   place la marque dans une conversation sur la fatigue, sur le mariage, sur
   la pluie. On a tous vu ça, et ça détruit la confiance qu'on a en elle bien
   plus vite que ça ne vend un savon.

   D'où la forme choisie : le texte est ici, complet et prioritaire, mais
   ENFERMÉ derrière une condition écrite en toutes lettres dans sa consigne —
   on lui pose une question sur les cosmétiques, ou il n'existe pas.

   Le texte vit dans data/produits.md, pas dans le code : Lamine corrige le
   fichier et le dépose sur GitHub, sans qu'on touche à une ligne de
   TypeScript. Lu une fois puis gardé en mémoire — il ne change qu'entre deux
   déploiements. */

let contenu: string | null = null;

export async function savoirProduits(): Promise<string> {
  if (contenu !== null) return contenu;
  try {
    const brut = await readFile(join(process.cwd(), "data", "produits.md"), "utf8");
    /* On retire l'en-tête : ce sont des consignes pour Lamine — comment
       ajouter une marque — et pas des connaissances pour BIA. Elle ne lit que
       ce qui vient après le premier trait. */
    const morceaux = brut.split(/^---$/m);
    contenu = (morceaux.length > 1 ? morceaux.slice(1).join("---") : brut).trim();
  } catch {
    contenu = "";
  }
  return contenu;
}
