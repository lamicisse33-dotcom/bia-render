import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
function load(path,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n]},m,m.exports);return m.exports;}
const {selectionnerFiches,passagesFiches}=load('lib/fiches-connaissances-core.ts',{'./dialogue-devoirs-core':load('lib/dialogue-devoirs-core.ts')});
const archives=JSON.parse(fs.readFileSync('data/fiches-archives.json','utf8')).fiches.map(f=>({...f,historique:true}));
const corpus=[{id:'khalam',titre:'KHALAM',origine:'data/khalam.md',texte:fs.readFileSync('data/khalam.md','utf8').split('## À COMPLÉTER')[0]},...archives];
test('late source sections and archived facts remain retrievable without truncating a selected paragraph',()=>{
 for(const [q,expected] of [['Comment accéder aux applications de KHALAM ?','CODE'],['Parle-moi des recherches de KHALAM sur le wolof.','La langue avant'],['Parle-moi de L’Héritage des Khalam et de Didi et Mila.','heritage.khalam.app'],['Quels métiers sont réunis chez Khalam ?','ingénierie'],['Quels projets DD Home étaient annoncés dans la présentation DD Skin ?','DD Home']]){
  const r=selectionnerFiches(corpus,q);assert(r.texte.toLowerCase().includes(expected.toLowerCase()),q);assert(r.texte.length<7300);for(const p of r.passages)assert(r.texte.includes(p.passage));
 }
});
test('every paragraph stays indexed and a change in topic releases previous reference documents',()=>{
 const fiches=[{id:'one',titre:'Sujet',origine:'fixture',texte:'## Avant\n\nAncienne ouverture.\n\n## Après\n\nRéférence tardive à la galaxie Orion.'}];
 assert.equal(passagesFiches(fiches).length,2);assert.match(selectionnerFiches(fiches,'Parle-moi de la galaxie Orion').texte,/Référence tardive/);
 assert.equal(selectionnerFiches(fiches,'Je veux cuisiner du riz.',[{role:'user',text:'Parle-moi de la galaxie Orion'}]).passages.length,0);
});
test('old private lessons paginate beyond the first 500 storage objects',async()=>{
 const source=fs.readFileSync('lib/lecons.ts','utf8'),compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}};let pages=0;
 const fetch=async(_url,opt)=>{
  assert(opt.signal);
  if(opt.method==='POST'){const {offset}=JSON.parse(opt.body);pages++;return {ok:true,json:async()=>offset===0?Array.from({length:500},(_,i)=>({name:i+'.mp3'})):[{name:'older.json'}]};}
  return {ok:true,json:async()=>({cle:'older',titre:'Ancienne fiche',dit:[],repond:[],quand:'2026-09',version:1})};
 };
 new Function('require','module','exports','fetch',compiled)(name=>name==='@/lib/lexique'?{lexiqueConfig:{url:'https://test.invalid',cle:'test',actif:true}}:{normaliser:s=>s},module,module.exports,fetch);
 const rows=await module.exports.listerLecons();assert.equal(pages,2);assert.equal(rows[0].cle,'older');
});
