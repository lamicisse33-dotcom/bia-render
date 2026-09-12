/* ── POSER LE SECOND CERVEAU DE LA CARTE ────────────────────────────────────

   Lamine, le 12 septembre 2026 : « le map n'affiche pas la carte, c'est écran
   noir. »

   ── CE QUI SE PASSAIT, EXACTEMENT ─────────────────────────────────────────

   MapLibre ne dessine pas la carte dans la page. Il ouvre un SECOND FIL
   d'exécution — un « worker » — et c'est lui qui va chercher les tuiles, les
   découpe et prépare les formes. La page ne fait que peindre. Sans ce second
   fil, il ne se passe RIEN : pas une tuile demandée, pas une erreur, pas un
   message. Un rectangle noir, et le silence.

   Pour trouver son second fil, MapLibre fait ceci :

       new URL("./maplibre-gl-worker.mjs", import.meta.url)

   `import.meta.url`, c'est « l'adresse du fichier où je suis ». Dans un
   navigateur, ça donne https://app.khalam.app/…/maplibre-gl.mjs, et le calcul
   tombe juste. Mais Next assemble tout le code AVANT, sur le serveur de
   construction, et remplace `import.meta.url` par ce qu'il voyait à ce
   moment-là — le chemin du disque de Render :

       "file:///opt/render/project/src/node_modules/maplibre-gl/dist/maplibre-gl.mjs"

   MapLibre teste cette adresse (`/^https?:/`), voit que ce n'est pas du web,
   et renvoie une chaîne VIDE. Puis il ouvre `new Worker("")`. Une adresse
   vide, pour un navigateur, c'est la page elle-même : il essaie donc de faire
   tourner du HTML comme du JavaScript. Ça échoue sans bruit, et la carte
   attend pour toujours des tuiles que personne n'ira chercher.

   Vérifié dans le paquet construit, le 12 septembre 2026 :

       let t = "file:///…/node_modules/maplibre-gl/dist/maplibre-gl.mjs";
       if (!/^https?:/.test(t)) return "";

   ── CE QU'ON FAIT ─────────────────────────────────────────────────────────

   On dépose les deux fichiers du second fil dans public/maplibre/, où ils
   sont servis comme des images, et on dit à MapLibre d'aller les chercher là
   (app/carte/Carte.tsx, setWorkerUrl). Deux fichiers et pas un : le worker
   importe maplibre-gl-shared.mjs juste à côté de lui.

   ── POURQUOI ON LES RECOPIE À CHAQUE CONSTRUCTION ─────────────────────────

   Ils sont aussi dans git, pour que la carte marche même si ce script ne
   tourne pas. Mais une copie figée devient FAUSSE au premier `npm update` :
   le worker d'une version et le code d'une autre ne se parlent pas, et la
   panne serait la même — noire et muette. Donc on recopie, et on refuse de
   construire si les fichiers ont disparu du paquet. */

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
const DEPUIS = join(RACINE, "node_modules", "maplibre-gl", "dist");
const VERS = join(RACINE, "public", "maplibre");

const FICHIERS = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const version = JSON.parse(
  await readFile(join(RACINE, "node_modules", "maplibre-gl", "package.json"), "utf8"),
).version;

await mkdir(VERS, { recursive: true });
for (const f of FICHIERS) {
  await copyFile(join(DEPUIS, f), join(VERS, f));
}

/* La version posée à côté des fichiers. Ça n'est lu par personne au
   fonctionnement : c'est pour qu'on puisse répondre, dans six mois, à la
   question « ces deux fichiers datent de quand ? » sans ouvrir un demi-mégaoctet
   de code minifié. */
await writeFile(join(VERS, "version.txt"), `maplibre-gl ${version}\n`, "utf8");

console.log(`BIA — second fil de la carte posé dans public/maplibre/ (maplibre-gl ${version}).`);
