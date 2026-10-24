import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const lire=(p)=>fs.readFileSync(p,'utf8');
/* On lit le CODE, pas la prose : les commentaires de ces fichiers citent
   justement les noms qu'on cherche. Leçon du 24 octobre, apprise trois fois. */
const code=(p)=>lire(p).replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');

const CHAT=code('app/api/chat/route.ts');
const SESSION=code('app/api/gemini-live/session/route.ts');
const CLIENT=code('lib/gemini-live-client.ts');
const CONNAISSANCES=code('app/api/gemini-live/connaissances/route.ts');
const CORRECTION=code('app/api/gemini-live/correction/route.ts');

/* ── RÈGLE DE LAMINE, 24 OCTOBRE 2026, PRIORITAIRE SUR TOUT ────────────────

   « Khalam Rapide est la MÊME BIA que Khalam, pas une variante. Mêmes
   instructions, même comportement, mêmes connaissances, mêmes écritures. »

   Cette épreuve ne compare pas deux réponses de modèle — elles ne seront
   jamais identiques, et prétendre le contraire serait mentir. Elle compare ce
   qui DOIT l'être : la source de la consigne, les lectures Supabase, et les
   écritures. Un moteur qui lit une source de moins est une autre BIA, quoi
   qu'il réponde. */

test('UNE SEULE consigne : aucun socle en double, aucun caractère en double',()=>{
 assert(/const system = SOCLE_BIA;/.test(CHAT),'Khalam importe le socle');
 assert(!/const system = `/.test(CHAT),'et ne le redéclare pas');
 const prompt=code('lib/gemini-live-prompt.ts');
 assert(/BIA_LIVE_SYSTEM = SOCLE_BIA;/.test(prompt),'Khalam Rapide importe LE MÊME');
 assert(!/BIA_LIVE_SYSTEM = `/.test(prompt),'aucune copie qui dériverait');
 /* Et le caractère vit à un seul endroit, importé par le socle. */
 const groq=code('lib/conversation-groq.ts');
 assert(/export const CARACTERE_BIA/.test(groq));
 assert(/CARACTERE_BIA/.test(code('lib/socle-bia.ts')));
 assert.equal((lire('lib/socle-bia.ts').match(/^TON CARACTÈRE$/gm)||[]).length,0,
  'le caractère ne doit pas être redit dans le socle');
});

/* ── LES MÊMES LECTURES SUPABASE ───────────────────────────────────────────
   Le 24 octobre, Khalam Rapide ne chargeait ni KHALAM, ni les produits, ni la
   vitrine, ni les fiches — et demandait les devoirs avec une question vide,
   qui les filtrait tous. Lamine : « elle me dit qu'elle ne connaît pas
   DD SKIN ». Elle ne mentait pas. */
const LECTURES=[
 ['les devoirs',        /contexteDevoirs/,        /contexteDevoirsComplet/],
 ['le lexique',         /motsCorriges/,           /motsCorriges/],
 ['les corrections exactes',/correctionExacte/,   /toutes\(\)/],
 ['les instructions apprises',/contexteInstructions/,/contexteInstructions/],
 ['les souvenirs',      /retrouver\(/,            /derniersSouvenirs/],
 ['les fiches',         /fichesPourConversation/, /fichesPourConversation/],
 ['ce qu’elle sait de KHALAM',/savoirKhalam/,     /savoirKhalam/],
 ['les produits',       /savoirProduits/,         /savoirProduits/],
 ['la vitrine',         /catalogue\(/,            /catalogue\(/],
];
for(const [quoi,chezKhalam,chezRapide] of LECTURES)
 test(`les deux moteurs lisent ${quoi}`,()=>{
  assert(chezKhalam.test(CHAT),`Khalam ne lit pas ${quoi} — l’épreuve est à revoir`);
  assert(chezRapide.test(SESSION)||chezRapide.test(CONNAISSANCES),
   `Khalam Rapide ne lit pas ${quoi} : ce n’est pas la même BIA`);
 });

test('les devoirs ne sont plus demandés avec une question vide',()=>{
 /* `selectionnerDevoirs` filtre sur `score > 0` : une question vide met tous
    les scores à zéro et rend une chaîne vide. Zéro devoir, toujours. */
 assert(!/contexteDevoirs\(''/.test(SESSION),
  'contexteDevoirs("") filtre TOUS les devoirs — il faut contexteDevoirsComplet');
 assert(/contexteDevoirsComplet\(/.test(SESSION));
});

/* ── LES MÊMES ÉCRITURES, ET SURTOUT LES MÊMES FONCTIONS ───────────────────
   « Réutiliser les mêmes écritures Supabase, PAS une copie. » Une copie
   dérive le jour où l'originale change. */
test('la correction du maître passe par les fonctions de Khalam, pas par une copie',()=>{
 for(const fn of ['enregistrerPhraseMaitre','corrigerDevoir']){
  assert(CHAT.includes(fn),`Khalam utilise ${fn}`);
  assert(CORRECTION.includes(fn),`Khalam Rapide doit utiliser ${fn}, pas le réécrire`);
 }
 /* Et ce fichier n'écrit rien lui-même : aucune requête Supabase en direct. */
 for(const interdit of ['rest/v1','lexiqueConfig','fetch('])
  assert(!CORRECTION.includes(interdit),'la route ne doit pas écrire elle-même : '+interdit);
});

test('les souvenirs sont écrits par les deux moteurs, sous la même personne',()=>{
 assert(/garder\(/.test(CHAT),'Khalam garde le tour');
 assert(/garder\(/.test(code('app/api/gemini-live/souvenir/route.ts')),'Khalam Rapide aussi');
 assert(/\?\s*"maitre"/.test(CHAT)||CHAT.includes('? "maitre"'),'Khalam écrit sous « maitre »');
 assert(SESSION.includes("acces.maitre?'maitre':''"),'et Khalam Rapide sous le MÊME mot');
});

/* ── CE QUE LA CONSIGNE EXIGE DES DEUX CÔTÉS ───────────────────────────── */
test('la correction immédiate et le caractère sont dans la consigne du moteur rapide',()=>{
 assert(/TU T.EXÉCUTES TOUT DE SUITE/.test(SESSION),'la correction immédiate est exigée');
 assert(/garder_la_correction/.test(SESSION),'et l’écriture a son outil');
 assert(/n.annonce JAMAIS une mémorisation qui n.a pas eu lieu/i.test(SESSION),
  'et elle ne doit pas annoncer une mémorisation qui n’a pas eu lieu');
 const groq=lire('lib/conversation-groq.ts');
 for(const trait of ['MEILLEURE AMIE','accompagne tout le monde','sans te vexer, sans te justifier'])
  assert(groq.includes(trait),'le caractère commun doit porter : '+trait);
});

/* ── ET CE QUE GEMINI NE PEUT PHYSIQUEMENT PAS FAIRE ───────────────────────

   Lamine a demandé la liste noir sur blanc. Elle est tenue dans un fichier,
   pas dans ma mémoire : une liste qu'on ne peut pas lire n'existe pas. */
test('l’inventaire des écarts restants est écrit et à jour',()=>{
 const inventaire=lire('docs/DEUX-MOTEURS-INVENTAIRE.md');
 for(const attendu of ['Ce que Gemini ne peut physiquement pas faire','briques','balises','voix de Kha'])
  assert(inventaire.includes(attendu),'l’inventaire doit parler de : '+attendu);
});
