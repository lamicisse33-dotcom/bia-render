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
 assert.equal(decoders.length,9);assert.equal(ready,false);
 for(const resolve of decoders.slice(0,-1))resolve();
 await new Promise(r=>setImmediate(r)); assert.equal(ready,false);
 decoders.at(-1)();await pending;assert.equal(ready,true);
});
