import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/bouche-audio-satin.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const a=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('le dessin prélève la position actuelle du son même si une ancienne animation a du retard',()=>{
 let horloge=0;
 const segments=[{debut:1,fin:2,niveau:.7},{debut:3,fin:4,niveau:.4}];
 a.brancherBoucheAudio(()=>segments.find(s=>horloge>=s.debut&&horloge<s.fin)?.niveau||0);
 a.publierBoucheAudio(1,0); // un ancien RAF ne doit pas remplacer l'horloge
 for(const [t,n] of [[0,0],[1,.7],[1.9,.7],[2,0],[2.9,0],[3,.4],[4,0]]){
  horloge=t;assert.equal(a.lireBoucheAudio(1000).niveau,n);assert.equal(a.ouvertureBoucheAudio(a.lireBoucheAudio().niveau)===0,n===0);
 }
 a.arreterBoucheAudio();assert.equal(a.lireBoucheAudio().niveau,0);
});
test('une interruption ou un signal périmé ferme les lèvres, les valeurs invalides ne les ouvrent pas',()=>{
 a.publierBoucheAudio(.8,10);assert.equal(a.lireBoucheAudio(20).niveau,.8);assert.equal(a.lireBoucheAudio(191).niveau,0);
 a.publierBoucheAudio(NaN,200);assert.equal(a.lireBoucheAudio(201).niveau,0);
 a.brancherBoucheAudio(()=>{throw Error('horloge arrêtée')});assert.equal(a.lireBoucheAudio().niveau,0);
 a.arreterBoucheAudio();assert.equal(a.ouvertureBoucheAudio(0),0);assert.equal(a.ouvertureBoucheAudio(1),1);
});
test('chaque image vidéo dispose de lèvres suivies, avec la même définition et aucune position inventée',()=>{
 const p='public/personnages/satin-anime-20261028/';const d=JSON.parse(fs.readFileSync(p+'levres.json'));
 for(const n of ['ecoute','parole','joie','rire','coeurs','bisou']){
  assert.equal(d[n].fps,24);assert(d[n].frames.length>=80);
  for(const f of d[n].frames){assert.equal(f.length,5);assert(f.every(Number.isFinite));assert(f[0]>0&&f[0]<1176);assert(f[1]>0&&f[1]<1764);assert(f[2]>20&&f[2]<200);}
 }
 assert.equal(d.atlas.ouvertures.length,8);assert(d.atlas.ouvertures[0]<.01);assert(d.atlas.ouvertures[7]>.23);
 assert(fs.statSync(p+'bouches.webp').size>10000);
});
