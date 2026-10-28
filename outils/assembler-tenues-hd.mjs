// Conditionnement web des portraits générés individuellement, sans agrandissement.
// Usage : node outils/assembler-tenues-hd.mjs /chemin/generated_images
import sharp from 'sharp';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('Dossier des portraits PNG requis');
const out = 'public/personnages/tenues-hd-20261028';
await mkdir(out, {recursive:true});
const portraits = {
 'ivoire': ['23d52538-93a7-45c0-900f-eaf369fd5139', '49889123-8f21-42d5-bb92-10d121eacc68', 'f07af56f-d4a0-4ec5-b6dd-ca3310ab07fa'],
 'vert-or': ['d94696c1-63c5-43de-93d1-964583a73de0', '1e15b5df-adf9-47e6-a114-59b7b2a81e27', 'e0227afd-3cb2-4036-98cc-4fa9095e0093'],
 'wax-bleu': ['ba96fb24-3816-4c52-b0c1-9806fc93d5da', '7bdcdd7e-0eaa-4f94-a4d2-f278b31a29c8', '8787470e-7e38-44d8-bf03-8baebc43eb48'],
};
const visages = [portraits.ivoire[0], '836ed4e7-41ec-46d2-8b57-731463f4521d', '1ff75938-9fbe-47f4-b37a-a09c2afe3a1e', '93abd253-c028-4c0b-84cc-9282d5e4ba4a', '7b25e308-9ddf-41bb-9068-285870e7bcc4', '3a554919-9d6c-4420-b9da-12d17e53e9e9', '52aa76d6-6eaf-4175-9ea3-b3e40956f51d', 'a8eab5c2-f3be-4c73-9d16-5633dfc38e46', '9c7f3301-c4bd-47ae-b6c4-162399c40569'];
const file = id => path.join(source, `exec-${id}.png`);
for (const id of new Set([...Object.values(portraits).flat(), ...visages])) {
 const m = await sharp(file(id)).metadata();
 if (m.width !== 1024 || m.height !== 1536) throw new Error(`Dimensions inattendues : ${id} ${m.width}x${m.height}`);
}
for (const [nom, frames] of Object.entries(portraits)) {
 await sharp(file(frames[0])).webp({quality:96, effort:6, smartSubsample:true}).toFile(`${out}/${nom}-repos.webp`);
 const tiles = await Promise.all(frames.map(async (id,i) => ({input:await sharp(file(id)).extract({left:0,top:800,width:1024,height:736}).png().toBuffer(),left:i*1024,top:0})));
 await sharp({create:{width:3072,height:736,channels:3,background:'#000'}}).composite(tiles).webp({quality:96, effort:6, smartSubsample:true}).toFile(`${out}/${nom}-mains.webp`);
}
const tiles = await Promise.all(visages.map(async (id,i) => ({input:await sharp(file(id)).extract({left:0,top:0,width:1024,height:400}).png().toBuffer(),left:i%3*1024,top:Math.floor(i/3)*400})));
await sharp({create:{width:3072,height:1200,channels:3,background:'#000'}}).composite(tiles).webp({lossless:true,effort:6}).toFile(`${out}/visages.webp`);
await writeFile(`${out}/sources.json`, JSON.stringify({date:'2026-10-28',generation:'image_gen built-in; portraits individuels, identité et caméra fixes',native:[1024,1536],portraits,visages,prompts:{repos:'Même femme et trois tenues approuvées, portrait photographique net sur noir, mains jointes bas devant le corps, visage souriant bouche fermée. Aucun bras levé.',visages:'Changer uniquement les lèvres ou une expression du visage. Conserver identité, position de la tête, caméra, vêtements et pose. Voyelles douces, sourire, clignement, réflexion, compassion, surprise modérée.',mains:'Changer uniquement les mains et avant-bras. Un petit geste de la main droite sous la taille en deux étapes. Bras bas, coudes près du corps ; le reste du portrait inchangé.'}},null,2)+'\n');
console.log('7 images HD conditionnées à leur définition native.');
