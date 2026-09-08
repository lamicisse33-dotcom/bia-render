import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* Ce que BIA sait de KHALAM. Le texte vit dans data/khalam.md, pas dans le
   code : Lamine peut le corriger et le déposer sur GitHub sans qu'on touche
   à une ligne de TypeScript.

   Lu une fois puis gardé en mémoire — le fichier ne change qu'entre deux
   déploiements, le relire à chaque question serait du gaspillage. */

let contenu: string | null = null;

export async function savoirKhalam(): Promise<string> {
  if (contenu !== null) return contenu;
  try {
    const brut = await readFile(join(process.cwd(), "data", "khalam.md"), "utf8");
    // On retire l'en-tête d'explication et la liste des trous : ce sont des
    // consignes pour Lamine, pas des connaissances pour BIA.
    contenu = brut
      .split("## À COMPLÉTER PAR LAMINE")[0]
      .replace(/^#[^\n]*\n/, "")
      .replace(/Ce fichier est la SEULE[\s\S]*?Aucun code à toucher\.\n/, "")
      .replace(/^-{3,}$/gm, "")
      .trim();
  } catch {
    contenu = "";
  }
  return contenu;
}
