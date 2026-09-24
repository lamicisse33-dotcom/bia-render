#!/usr/bin/env node
/* Recopie sur le Mac TOUT ce que BIA a déjà dit (les voix gardées).
   Ne retélécharge que ce qui manque : on peut le lancer chaque soir.

   Lancer depuis le Terminal, dans le dossier bia-render :
       node outils/sauvegarder-voix-gardees.mjs
   Il demande le code maître (tapé par toi, jamais écrit nulle part).

   Rangement : ~/Documents/BIA-voix-gardees/wo/… et fr/…
   Chaque son .mp3 a son .json à côté, avec le texte exact qu'il dit. */

import { mkdir, access, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import readline from "node:readline";

const SERVEUR = process.env.BIA_ADRESSE || "https://app.khalam.app";
const DOSSIER = process.env.BIA_STOCK || join(homedir(), "Documents", "BIA-voix-gardees");

function demanderLeCode() {
  return new Promise((ok) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = (s) => { if (s.includes("Code maître")) process.stdout.write(s); };
    rl.question("Code maître : ", (r) => { rl.close(); process.stdout.write("\n"); ok(r.trim()); });
  });
}

const existe = (f) => access(f).then(() => true, () => false);

const code = process.env.BIA_CODE || await demanderLeCode();
const entetes = { "x-bia-code": code };

console.log(`Serveur : ${SERVEUR} (s'il dort, la première réponse peut prendre une minute)`);
const r = await fetch(`${SERVEUR}/api/voix-gardees`, { headers: entetes });
if (r.status === 401) { console.error("Code refusé."); process.exit(1); }
if (!r.ok) { console.error(`Le serveur a répondu ${r.status} : ${await r.text()}`); process.exit(1); }
const { resume, sons } = await r.json();
console.log(`Dans le seau : ${sons.length} sons. Part gratuite depuis le réveil : ${resume.part_gratuite ?? "—"}`);

let nouveaux = 0, deja = 0, rates = 0;
for (const mp3 of sons) {
  for (const chemin of [mp3, mp3.replace(/\.mp3$/, ".json")]) {
    const cible = join(DOSSIER, chemin);
    if (await existe(cible)) { deja++; continue; }
    const f = await fetch(`${SERVEUR}/api/voix-gardees?chemin=${encodeURIComponent(chemin)}`, { headers: entetes });
    if (!f.ok) { if (chemin.endsWith(".mp3")) rates++; continue; }
    await mkdir(dirname(cible), { recursive: true });
    await writeFile(cible, Buffer.from(await f.arrayBuffer()));
    if (chemin.endsWith(".mp3")) nouveaux++;
  }
}
console.log(`Terminé — ${nouveaux} nouveaux sons, ${rates} ratés. Dossier : ${DOSSIER}`);
