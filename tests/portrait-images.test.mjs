import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/portrait-images.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {planchesDuPortrait,chargerPortrait}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('preloads the selected character and only existing sheets',()=>{
 for(const [persona,tenue] of [['rara','nouvelle'],['bia','nouvelle'],['bia','wax'],['bia','classique']]){
  const files=planchesDuPortrait(persona,tenue);
  for(const file of files)assert(fs.existsSync('public'+file), file);
  if(persona==='rara')assert(files.every(f=>f.startsWith('/rara-')));
  if(persona==='bia'&&tenue==='nouvelle')assert(files.every(f=>f.endsWith('-nouvelle.webp')));
 }
});
test('portrait readiness waits for decoding every image, not only download',async()=>{
 const decoders=[];
 globalThis.Image=class{
  set src(value){queueMicrotask(()=>this.onload());}
  decode(){return new Promise(resolve=>decoders.push(resolve));}
 };
 let ready=false;
 const pending=chargerPortrait('rara','nouvelle').then(()=>{ready=true;});
 await new Promise(r=>setImmediate(r));
 /* CINQ, et non plus neuf : les quatre images du défilé d'entrée de Rara
    étaient attendues ici aussi, et retardaient d'autant l'affichage de son
    portrait. Supprimées le 28 octobre 2026. Ce que ce filet garantit n'a pas
    changé : on attend le DÉCODAGE de chaque image, pas seulement son
    téléchargement — sinon le premier visage s'affiche en vide. */
 assert.equal(decoders.length,5);assert.equal(ready,false);
 for(const resolve of decoders.slice(0,-1))resolve();
 await new Promise(r=>setImmediate(r)); assert.equal(ready,false);
 decoders.at(-1)();await pending;assert.equal(ready,true);
});
