import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sansCommentaires=s=>s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');
const lire=f=>sansCommentaires(fs.readFileSync(f,'utf8'));
function charger(chemin,permis=[]){
 const m={exports:{}};
 new Function('require','module','exports','process',compile(fs.readFileSync(chemin,'utf8')))(
  id=>{assert.ok(permis.includes(id),chemin+' ne doit pas importer : '+id);return {};},m,m.exports,process);
 return m.exports;
}

/* ── POINT (1) DU PLAN : PHARMACIES ET NUMÉROS D'URGENCE ──────────────────

   Lamine : « cherche d'abord ce qui existe déjà […] Lamine dit que c'était
   prévu ». Il avait raison : lib/urgences.ts existe depuis le 13 septembre,
   sourcé et daté. Mais il n'était injecté que dans la consigne de Khalam —
   sur le moteur PAR DÉFAUT, BIA n'avait aucun numéro vérifié. */

test('les numéros d’urgence partent maintenant dans les DEUX consignes',()=>{
 const chat=lire('app/api/chat/route.ts');
 const session=lire('app/api/gemini-live/session/route.ts');
 assert.match(chat,/consigneUrgences\(\)/,'Khalam les avait déjà');
 assert.match(session,/consigneUrgences\(\)/,'Khalam Rapide doit les avoir aussi');
 /* Et depuis la MÊME source : deux listes finiraient par diverger, et un
    numéro d’urgence qui diverge est un numéro faux quelque part. */
 assert.match(session,/from '@\/lib\/urgences'/);
});

test('les numéros vérifiés sont ceux de la liste, jamais devinés',()=>{
 const U=charger('lib/urgences.ts');
 const numeros=U.URGENCES_NATIONALES.map(u=>u.numero);
 /* Les quatre que Lamine cite dans son plan. */
 for(const n of ['17','18','1515'])
  assert.ok(numeros.includes(n),'numéro national manquant : '+n);
 /* Chaque ligne porte une date de vérification : un numéro se vérifie, il
    ne se devine pas. */
 for(const u of U.URGENCES_NATIONALES)
  assert.ok(u.verifie||u.source,'ligne sans source ni date : '+u.quoi);
});

/* ── LA RÈGLE DE SÉCURITÉ : NE JAMAIS DIRE « DE GARDE » SANS LE SAVOIR ──── */
test('garde_connue est faux, et rien ne peut le rendre vrai ailleurs',()=>{
 const P=charger('lib/pharmacies.ts',[]);
 assert.equal(P.gardeConnue(),false,
  'aucune source de tour de garde ne répond : ce champ doit rester faux');
 assert.match(P.POURQUOI_PAS_DE_GARDE,/n'affirme JAMAIS|N'AFFIRME JAMAIS/i);
 /* Un seul endroit décide : le jour où une source existe, il n'y a qu'ici à
    écrire, et personne ne peut l'affirmer par ailleurs. */
 const route=lire('app/api/pharmacies/route.ts');
 assert.match(route,/garde_connue: gardeConnue\(\)/);
 assert.doesNotMatch(route,/garde_connue:\s*true/);
});

test('la consigne partagée interdit d’affirmer qu’une pharmacie est de garde',()=>{
 const socle=fs.readFileSync('lib/socle-bia.ts','utf8').replace(/\s+/g,' ');
 assert.match(socle,/TU NE SAIS PAS LAQUELLE EST DE GARDE/);
 assert.match(socle,/N'affirme JAMAIS qu'une pharmacie est de garde/);
 /* Et le SAMU est proposé : c'est lui qui sait. */
 assert.match(socle,/SAMU/);
});

/* ── LE CALCUL DE DISTANCE, SUR DES POINTS RÉELS DE DAKAR ───────────────── */
test('la distance est juste sur des points connus',()=>{
 const P=charger('lib/pharmacies.ts',[]);
 const plateau={lat:14.6690,lon:-17.4350};
 /* Pharmacie Guigon, relevée sur la carte : environ 240 m du Plateau. */
 const d=P.distanceM(plateau,{lat:14.6691829,lon:-17.4371975});
 assert.ok(d>150&&d<350,'distance invraisemblable : '+d+' m');
 /* Le même point sur lui-même fait zéro, et pas « presque zéro ». */
 assert.equal(P.distanceM(plateau,plateau),0);
 /* Plateau → Almadies : une dizaine de kilomètres. */
 const loin=P.distanceM(plateau,{lat:14.7447,lon:-17.5088});
 assert.ok(loin>9000&&loin<13000,'Plateau → Almadies : '+loin+' m');
});

test('lib/pharmacies.ts n’importe rien et ne peut rien écrire',()=>{
 const code=lire('lib/pharmacies.ts');
 assert.doesNotMatch(code,/\bimport\s/,'une épreuve le charge seul');
 for(const interdit of ['rest/v1','garder(','lexiqueConfig','localStorage'])
  assert.ok(!code.includes(interdit),'ne doit pas contenir : '+interdit);
});

test('la position ne sort pas de la requête',()=>{
 const route=lire('app/api/pharmacies/route.ts');
 /* Aucune écriture, aucun compteur, aucune trace. */
 for(const interdit of ['garder(','rest/v1','noterLectureSource','localStorage'])
  assert.ok(!route.includes(interdit),'la position ne doit laisser aucune trace : '+interdit);
});

test('l’outil et la balise existent sur les deux moteurs, et ouvrent la carte',()=>{
 const session=lire('app/api/gemini-live/session/route.ts');
 const client=lire('lib/gemini-live-client.ts');
 const chat=lire('app/api/chat/route.ts');
 const page=lire('app/page.tsx');
 assert.match(session,/name:'trouver_une_pharmacie'/);
 assert.match(client,/trouverUnePharmacie\(\)/);
 assert.match(chat,/detacherPharmacie\(/);
 assert.match(page,/pharmacie\?:boolean/);
 /* L'accord AVANT le GPS, des deux côtés : la permission du navigateur
    n'est pas une question posée par BIA. */
 const outil=client.slice(client.indexOf('private async trouverUnePharmacie'));
 const accord=outil.indexOf('accordPosition');
 const gps=outil.indexOf('getCurrentPosition');
 assert.ok(accord>=0&&gps>accord,'l’accord doit précéder le GPS');
 /* Et la carte s'ouvre vraiment sur la plus proche. */
 assert.match(outil.slice(0,2200),/events\.carte\(/);
});
