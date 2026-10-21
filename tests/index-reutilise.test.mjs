import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path){const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','process','require',js)(m,m.exports,{env:{}},name=>{assert.equal(name,'./dialogue-devoirs-core');return load('lib/dialogue-devoirs-core.ts')});return m.exports;}
const lexique=load('lib/lexique.ts');
test('word reuse preserves exact results, limits, additions and deletion immediately',async()=>{
 await lexique.ajouterCorrection({source:'salutation',proposee:'Bonjour ma amie.',corrigee:'Bonjour mon amie.',auteur:'test'});
 const first=await lexique.motsCorriges(40,true);
 assert.deepEqual(await lexique.motsCorriges(),first);
 assert.deepEqual(await lexique.motsCorriges(0),[]);
 const copy=await lexique.motsCorriges();copy[0].juste='wrong';assert.deepEqual(await lexique.motsCorriges(),first);
 await lexique.ajouterCorrection({source:'salutation 2',proposee:'Bonjour ma amie.',corrigee:'Bonjour mon amie.',auteur:'test'});
 assert.equal((await lexique.motsCorriges())[0].fois,2);
 await lexique.retirerCorrection('Bonjour mon amie.','test');
 assert.deepEqual(await lexique.motsCorriges(),[]);
});
const core=load('lib/fiches-connaissances-core.ts');
test('prepared source index preserves paragraphs, exact ranking and budgets',()=>{
 const fiches=JSON.parse(fs.readFileSync('data/fiches-archives.json','utf8')).fiches.map(f=>({...f,historique:true}));
 const index=core.indexerFiches(fiches);
 for(const q of ['Khalam et les applications','Didi et Mila','Pourquoi ?','Les produits DD Skin'])for(const budget of [500,3500,6500]){
  const h=[{role:'user',text:'Je veux parler des produits de beauté.'}];
  assert.deepEqual(core.selectionnerFiches(fiches,q,h,budget,index),core.selectionnerFiches(fiches,q,h,budget));
 }
 const nouvelle=[{id:'neuf',titre:'Nouveau',origine:'correction',texte:'Un passage corrigé sur la galaxie Orion.'}];
 // An index belonging to another source snapshot cannot leak old paragraphs.
 assert.deepEqual(core.selectionnerFiches(nouvelle,'Orion',[],3500,index),core.selectionnerFiches(nouvelle,'Orion'));
});
const dialogue=load('lib/dialogue-devoirs-core.ts');
test('dialogue search invalidates cached terms after an in-place source correction',()=>{
 const d={id:'un',titre:'Organisation études',repliques:[{id:'1',fr:'Organise tes études chaque matin.',wo:'Jàngal suba si.',role:'bia'}]};
 const index=[d],q='Organisation études';
 const avant=dialogue.chercherDialogues(index,q,[]);assert.equal(avant.length,1);
 assert.deepEqual(dialogue.chercherDialogues(index,q,[]),avant);
 d.titre='Cuisine';d.repliques[0].fr='Prépare du riz.';d.repliques[0].wo='Toggal ceeb.';
 assert.equal(dialogue.chercherDialogues(index,q,[]).length,0);
 assert.equal(dialogue.chercherDialogues(index,'Cuisine riz',[]).length,1);
});
