import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(path,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n]},m,m.exports);return m.exports;}
const core=load('lib/dialogue-devoirs-core.ts');
const fiches=load('lib/fiches-connaissances-core.ts',{'./dialogue-devoirs-core':core});
// Synthetic source fixture only; never saved as a validated lesson.
const texte=`DEVOIR 90 — Tomates et commerce
Wolof : Tamaate.
Français : Tomate.
Wolof : Tamaate bi 1000 francs la.
Français : Les tomates coûtent 1000 francs.
Wolof : Prix la wala kilos ?
Français : Ces chiffres, c'est le prix ou le nombre de kilos ?`;
const history=[{role:'user',text:'Je vais au restaurant ce soir en ville.'},{role:'bia',text:'Qu’est-ce que tu veux manger ?'}];
test('restaurant food retains exact vocabulary, without example prices or a fabricated numeric clarification',()=>{
 for(const question of ['Du poisson et des tomates.','Jën ak tamaate.']){
  const r=core.referenceApprisePourTour(texte,question,history);
  assert.match(r,/Tamaate\./);assert.doesNotMatch(r,/1000|kilos|chiffres/);
  const d=core.analyserDevoir({id:'lesson',texte,date:'',valide:true});
  const choix=core.choixConversation([d],question,history,'wo');
  assert.equal(core.repliqueChoisie('[[replique:0:1]]',choix),null);
  assert.equal(core.repliqueChoisie('[[replique:0:2]]',choix),null);
 }
});
test('BIA cannot validate her own price, including an amount written in words or FCFA',()=>{
 for(const price of ['1000 francs','1000 FCFA','1000F','mille francs']){
  const fr='Les tomates coûtent '+price+'.';
  assert.equal(core.montantDeLeconNonConfirme(fr,'','Du poisson et des tomates.',[...history,{role:'bia',text:fr}]),true);
 }
 assert.equal(core.montantDeLeconNonConfirme('Ces chiffres, c’est le prix ou le nombre de kilos ?','','Jën ak tamaate.',history),true);
});
test('an explicit current price and explicit source reading remain available',()=>{
 assert.equal(core.montantDeLeconNonConfirme('Les tomates coûtent 1000 francs.','','Le prix des tomates est de 1000 francs.',[]),false);
 assert.equal(core.referenceApprisePourTour(texte,'Lis ce devoir sur les tomates.',history),texte);
 const simple='Wolof : Tamaate.\nFrançais : Tomate.';
 assert.equal(core.referenceApprisePourTour(simple,'Du poisson et des tomates.',history),simple);
});
test('common memory filters lesson and correction-table copies without mutating sources or product facts',()=>{
 const docs=[{id:'devoirs:lesson',titre:'Tomates',origine:'Supabase/lesson',texte},
  {id:'corrections:copy',titre:'Tomates',origine:'Supabase/correction',texte:JSON.stringify({demande:'DEVOIR:lesson:0',reponse_corrigee:texte,langue:'wo'})}];
 const before=structuredClone(docs),index=fiches.indexerFiches(docs);
 for(const historyShape of [history,history.map(t=>({role:t.role,content:t.text}))]){
  const r=fiches.selectionnerFiches(docs,'Du poisson et des tomates.',historyShape,6500,index);
  assert.equal(r.passages.length,2);assert.match(r.texte,/Tamaate/);assert.doesNotMatch(r.texte,/1000|kilos|chiffres/);
  assert(r.passages.every(p=>p.origine.startsWith('Supabase/')));
 }
 assert.deepEqual(docs,before);
 const produits=[{id:'produits:actuels',titre:'DD Skin',origine:'fiche_produit',texte:'Le savon DD Skin coûte 1000 francs.'}];
 assert.match(fiches.selectionnerFiches(produits,'Quel est le prix du savon DD Skin ?').texte,/1000 francs/);
});
test('raw lesson context applies the same filter while respecting validation and user history',()=>{
 const service=load('lib/devoirs-apprentissage.ts',{'node:crypto':crypto,'./lecture-devoirs-core':{},'./dialogue-devoirs-core':core,'./lecture-devoirs-etat':{},'./lexique':{},'./lexique-apprentissage-core':{APP_LECONS:'test'}});
 const b={version:2,type:'devoir',id:'lesson',index:0,total:1,date:'2026-10-21',statut:'validé',date_validation:'2026-10-21',texte};
 const r=service.selectionnerDevoirs([b],'Du poisson et des tomates.',history);
 assert.match(r,/Tamaate/);assert.doesNotMatch(r,/1000|kilos|chiffres/);
 assert.equal(service.selectionnerDevoirs([{...b,statut:undefined}],'tomates',history),'');
 assert.match(service.selectionnerDevoirs([b],'Les tomates',[{role:'user',text:'Le prix des tomates est de 1000 francs.'}]),/1000/);
});
