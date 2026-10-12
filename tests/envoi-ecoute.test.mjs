import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n];},m,m.exports);return m.exports;}
const {envoyerEcoute}=load('lib/envoi-ecoute.ts');
test('a last chunk still uploading sends the whole recording immediately',async()=>{
 const whole=new FormData(),light=new FormData(),calls=[];
 whole.set('audio',new Blob(['full audio'],{type:'audio/mp4'}),'parole.mp4');
 const r=await envoyerEcoute(light,whole,{total:4,deposes:3,perdu:false},async body=>{calls.push(body);return new Response('ok');});
 assert.equal(r.status,200);assert.deepEqual(calls,[whole]);assert.equal(calls[0].get('audio').type,'audio/mp4');
});
test('a confirmed but lost server deposit retries the whole audio without waiting for uploads',async()=>{
 const whole=new FormData(),light=new FormData(),calls=[];
 const r=await envoyerEcoute(light,whole,{total:4,deposes:4,perdu:false},async body=>{calls.push(body);return new Response('',{status:calls.length===1?409:200});});
 assert.equal(r.status,200);assert.deepEqual(calls,[light,whole]);
});
test('an acknowledged deposit takes one request and a failed upload uses whole audio',async()=>{
 for(const perdu of [false,true]){
  const whole=new FormData(),light=new FormData(),calls=[];
  await envoyerEcoute(light,whole,{total:4,deposes:4,perdu},async body=>{calls.push(body);return new Response('ok');});
  assert.deepEqual(calls,[perdu?whole:light]);
 }
});
const normaliser=load('lib/normaliser.ts'),textes=load('lib/repertoire-textes.ts'),services=load('lib/services-textes.ts');
const salut=load('lib/salutations-dialogue.ts',{'./normaliser':normaliser,'./repertoire-textes':textes,'./services-textes':services});
test('corrected greetings skip a lesson search, but a greeting plus a request keeps it',async()=>{
 let lecons=0;
 const corr=load('lib/correction-transcription.ts',{
  './salutations-dialogue':salut,'./devoirs-apprentissage':{phrasesApprisesDevoirs:async()=>{lecons++;return []; }},
  './comparaison-lexique-core':{propositionsLexique:()=>['suggestion']},'./lexique':{},'./lexique-apprentissage-core':{},
  './lexique-apprentissage':{lireLecons:async()=>{lecons++;return [];}}
 });
 const regles=[{entendu:'Nanga deff',corrige:'Nanga def',date:''}];
 const r=await corr.corrigerTranscription('Nanga deff',regles);
 assert.equal(r.texte,'Nanga def');assert.equal(r.corrections_transcription.length,1);assert.deepEqual(r.suggestions_ecriture,[]);assert.equal(lecons,0);
 const demande=await corr.corrigerTranscription('Bonjour, ma copine ne répond plus',[]);
 assert.equal(lecons,2);assert.deepEqual(demande.suggestions_ecriture,['suggestion']);
});
