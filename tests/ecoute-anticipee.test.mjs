import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
const source=fs.readFileSync('lib/ecoute-anticipee.ts','utf8');
function service(){
 let calls=0;const m={exports:{}};
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports','globalThis','process',js)(n=>n==='node:crypto'?crypto:{chezOreilleLocale:async()=>{calls++;return {texte:'Texte complet.',langue:null};}},m,m.exports,{}, {env:{STT_PROVIDER:'local_wolof',WOLOF_LOCAL_ALL_LANGUAGES:'true'}});
 m.exports.noterEssaiAnticipation({tours:[{texte_identique:true},{texte_identique:true}]});
 return {...m.exports,calls:()=>calls};
}
const audio=new Blob([new Uint8Array(5000).fill(42)],{type:'audio/webm'});
test('anticipation is single-use, account-bound and prefix-bound',async()=>{
 const s=service();assert(await s.anticiperEcoute('tour12345','owner',audio,'wo'));
 assert.equal(await s.reprendreEcoute('tour12345','other',audio,'wo'),null);
 assert.equal((await s.reprendreEcoute('tour12345','owner',new Blob([audio,new Uint8Array(10)],{type:'audio/webm'}),'wo')).texte,'Texte complet.');
 assert.equal(await s.reprendreEcoute('tour12345','owner',audio,'wo'),null);assert.equal(s.calls(),1);
});
test('changed audio, language and unsupported container use the complete path',async()=>{
 for(const change of ['audio','langue']){
 const s=service();await s.anticiperEcoute('tour12345','owner',audio,'wo');
 assert.equal(await s.reprendreEcoute('tour12345','owner',change==='audio'?new Blob([new Uint8Array(5000)]):audio,change==='langue'?'fr':'wo'),null);
 }
 const s=service();assert.equal(await s.anticiperEcoute('tour12345','owner',new Blob([audio],{type:'audio/mp4'}),'wo'),false);assert.equal(s.calls(),0);
});
test('three exact comparisons enable reuse; a missing word disables anticipation',async()=>{
 const s=service();for(let i=0;i<3;i++){assert.equal(s.anticipationConfirmee(),false);s.comparerAnticipation({texte:'Bonjour papa.'},{texte:'Bonjour papa !'});}
 assert.equal(s.anticipationConfirmee(),true);
 s.comparerAnticipation({texte:'Bonjour'},{texte:'Bonjour papa'});assert.equal(s.anticipationConfirmee(),false);
 assert.equal(await s.anticiperEcoute('tour12345','owner',audio,'wo'),false);
});
