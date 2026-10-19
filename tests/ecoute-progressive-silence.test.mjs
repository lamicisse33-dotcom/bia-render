import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path,imports={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert(id in imports,id);return imports[id];},m,m.exports);return m.exports;}
const {creerEcouteProgressive}=load('lib/ecoute-progressive.ts',{'./ecoute-longue':load('lib/ecoute-longue.ts')});
function pipeline(){
 const clips=[];
 const p=creerEcouteProgressive(async f=>{
  const bytes=await f.get('audio').arrayBuffer(),v=new DataView(bytes);let voiced=false;
  for(let i=44;i<bytes.byteLength;i+=2)if(v.getInt16(i,true)!==0)voiced=true;
  clips.push({voiced,frames:(bytes.byteLength-44)/2});
  return Response.json({texte:voiced?'Bonjour, je parle français.':'Texte inventé sur silence.'});
 },()=> 'fr',()=>true,()=>{});
 return {p,clips};
}
const voice=()=>new Float32Array(4000).fill(.2),quiet=()=>new Float32Array(4000);
test('a silence-only final tail cannot append invented words to recognized French',async()=>{
 const {p,clips}=pipeline();
 for(let i=0;i<8;i++)p.pousser(voice(),true);
 for(let i=0;i<8;i++)p.pousser(quiet(),false);
 const r=await p.finir();
 assert.equal(r.texte,'Bonjour, je parle français.');
 assert.equal(clips.length,1);assert(clips.every(c=>c.voiced));
});
test('a long quiet tail cannot trigger another four-second recognition',async()=>{
 const {p,clips}=pipeline();
 for(let i=0;i<8;i++)p.pousser(voice(),true);
 for(let i=0;i<24;i++)p.pousser(quiet(),false);
 await p.finir();assert.equal(clips.length,1);assert(clips.every(c=>c.voiced));
});
test('a resumed utterance in the final buffer is still recognized',async()=>{
 const {p,clips}=pipeline();
 for(let i=0;i<8;i++)p.pousser(voice(),true);
 for(let i=0;i<4;i++)p.pousser(quiet(),false);
 p.pousser(voice(),true);
 const r=await p.finir();assert.equal(clips.length,2);assert(clips.every(c=>c.voiced));
 assert.equal(r.texte,'Bonjour, je parle français. Bonjour, je parle français.');
});
test('continuous speech crossing forced cuts preserves every audio sample',async()=>{
 const {p,clips}=pipeline();for(let i=0;i<32;i++)p.pousser(voice(),true);
 await p.finir();assert.equal(clips.reduce((n,c)=>n+c.frames,0),128000);assert(clips.every(c=>c.voiced));
});
