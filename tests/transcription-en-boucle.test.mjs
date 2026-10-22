import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path,imports={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{if(id==='@/lib/rapidite-core')return load('lib/rapidite-core.ts',{});if(id==='@/lib/rapidite-precharger')return {prechargerPendantEcoute(){}};assert(id in imports,id);return imports[id];},m,m.exports);return m.exports;}
const guard=load('lib/transcription-en-boucle.ts'),c=guard.transcriptionEnBoucle;
const capture='Wii waaw ba ma wax a doon walla doon walla doon walla doon waa doon walla doon walla doon walla doon';
test('the exact 21-word screenshot is rejected without guessing oui vas-y from its prefix',()=>{assert.equal(capture.split(/\s+/).length,21);assert.equal(c(capture),true);assert.equal(c('Oui, vas-y.'),false);assert.equal(c('Waaw, demal.'),false);});
test('ordinary emphasis, stop commands, language switching and a real long sentence stay intact',()=>{
 for(const text of ['Stop stop stop !','stop '.repeat(8),'Oui oui, vas-y.','Mais, mais, mais, je veux parler.', 'Dama bëgg wax wolof ak français, mais bu leer te naturel.', 'Il faut compter un deux trois quatre cinq six sept huit neuf dix avant de continuer.', 'Tu peux choisir ceci ou cela, rouge ou vert, grand ou petit, ici ou ailleurs, puis rentrer.'])assert.equal(c(text),false,text);
 assert(c('la même boucle '.repeat(12)));assert(c('a '.repeat(30)));
});
test('a repetitive original is blocked by the actual route before any corpus write or response use',async()=>{
 let text=capture,saves=0,rejected=0;
 const route=load('app/api/ecouter/route.ts',{
  '@/lib/transcription-en-boucle':{...guard,noterBoucleTranscription:()=>rejected++},'@/lib/langue':{detecterLangue:()=> 'fr'},'@/lib/preparer-ecoute':{preparerEcoute:async()=>({reco:{texte:text},ecriture:{texte:text},correction_disponible:true,chronometrage:{}})},
  'next/server':{NextResponse:{json:Response.json}},'@/lib/codes':{verifierCode:()=>({ok:true,maitre:true})},'@/lib/panne':{noterPanne(){}},'@/lib/morceaux-de-parole':{cleValide:()=>null},'@/lib/corpus':{corpusActif:()=>true,garderLaVoix:async()=>{saves++;return 'fixture';}},
 });
 const request=()=>{const f=new FormData();f.set('audio',new Blob(['test'],{type:'audio/wav'}),'test.wav');return {headers:{get:()=> 'fixture'},formData:async()=>f};};
 const bad=await(await route.POST(request())).json();assert.equal(bad.texte,'');assert.equal(bad.transcription_rejetee,true);assert.equal(bad.extrait,null);assert.equal(saves,0);assert.equal(rejected,1);
 text='Oui, vas-y.';const good=await(await route.POST(request())).json();assert.equal(good.texte,text);assert.equal(saves,1);assert.equal(rejected,1);
});
test('normal unique long text does not become quadratic scanning work',()=>{
 const text=Array.from({length:1800},(_,i)=>'mot'+i).join(' '),start=performance.now();assert.equal(c(text),false);assert(performance.now()-start<300);
});
