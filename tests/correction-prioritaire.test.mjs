import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(file,req=()=>{throw Error('unexpected dependency');},fetcher=fetch){const m={exports:{}};new Function('require','module','exports','fetch',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(req,m,m.exports,fetcher);return m.exports;}
const core=load('lib/correction-prioritaire-core.ts');
const before='Ñaata at nga am ?',after='Ñaata att nga am ?';
test('an explicitly validated correction resolves the original answer and question across repeat attempts',()=>{
 const h=[{role:'user',text:'Quel âge as-tu ?'},{role:'bia',text:before},{role:'user',text:'Corrige cette phrase'},{role:'bia',text:'Dis-moi la phrase.'},{role:'user',text:after},{role:'bia',text:after},{role:'user',text:'Répète'},{role:'bia',text:after},{role:'user',text:'Mémorise cette correction'}];
 assert.deepEqual(core.origineCorrectionDepuisFil(h,after),{ancienne:before,source:'Quel âge as-tu ?'});
 assert.equal(core.origineCorrectionDepuisFil([{role:'user',text:'Mémorise : '+after}],after),undefined);
 assert.equal(core.origineCorrectionDepuisFil([{role:'user',text:'Quel temps ?'},{role:'bia',text:'Il fait beau.'},{role:'user',text:'Répète : '+after},{role:'bia',text:after}],after),undefined);
 assert.equal(core.origineCorrectionDepuisFil(h,'Une autre phrase'),undefined);
 assert.equal(core.entreeLexicaleSimple({application:'bia-apprentissage-v1'}),false);
 assert.equal(core.entreeLexicaleSimple({proposee:'{"version":2,"type":"devoir"}'}),false);
});
function fixture({archiveFail=false,casFail=false,readFail=false}={}){
 delete globalThis.biaCorrectionPrioritaire;
 const rows=[{id:1,source:'Quel âge as-tu ?',corrigee:before,proposee:null,application:'bia'}, {id:2,source:before,corrigee:before,proposee:null,application:'bia'}, {id:3,source:'Autre question',corrigee:'Une autre réponse.',application:'bia'}, {id:4,source:before,corrigee:before,proposee:'{"version":2}',application:'bia-apprentissage-v1'}];
 const archives=new Map(),calls=[];let next=5;
 const fetcher=async(url,opt={})=>{const u=new URL(url),q=u.searchParams,method=opt.method||'GET';calls.push(method);
  if(method==='GET'&&q.has('or'))return Response.json(rows.filter(r=>r.source==='Quel âge as-tu ?'||r.source===before||r.corrigee===before).slice(Number(q.get('offset')),Number(q.get('offset'))+500));
  if(method==='PATCH'){assert(archives.size>0,'must archive before any replacement');if(casFail)return Response.json([]);const row=rows.find(r=>String(r.id)===q.get('id')?.slice(3)&&r.corrigee===q.get('corrigee')?.slice(3));if(!row)return Response.json([]);Object.assign(row,JSON.parse(opt.body));return Response.json([row]);}
  if(method==='POST'){const body=JSON.parse(opt.body);const added=body.map(r=>({...r,id:next++}));rows.push(...added);return Response.json(added);}
  if(method==='GET'&&q.has('id')){const row=rows.find(r=>String(r.id)===q.get('id').slice(3));return Response.json(readFail?[]:row?[row]:[]);}
  throw Error('unexpected request '+url);
 };
 const api=load('lib/correction-prioritaire.ts',id=>id==='node:crypto'?crypto:id==='./lexique'?{lexiqueConfig:{actif:true,url:'https://test.invalid',table:'lexique',cle:'test'}}:id==='./correction-prioritaire-core'?core:id==='./audio-memoire-stockage'?{assurerMemoire:async()=>{},ecrireObjetMemoire:async(p,s)=>archives.set(p,s),lireObjetMemoire:async p=>new Response(archiveFail?'wrong':archives.get(p))}:assert.fail(id),fetcher);
 return {api,rows,archives,calls,save:()=>api.remplacerCorrectionValidee({source:after,corrigee:after,langue:'wo',auteur:'maitre-vocal',application:'bia'},{ancienne:before,source:'Quel âge as-tu ?'})};
}
test('all exact old versions are replaced, unrelated and structured lessons preserved, history and new reference reread',async()=>{
 const f=fixture();await f.save();assert.equal(f.rows[0].corrigee,after);assert.equal(f.rows[1].corrigee,after);assert.equal(f.rows[2].corrigee,'Une autre réponse.');assert.equal(f.rows[3].corrigee,before);
 const journal=JSON.parse([...f.archives.values()][0]);assert(journal.avant.every(r=>r.corrigee===before));assert(f.rows.some(r=>r.source===after&&r.corrigee===after));assert.equal(f.api.resumeCorrectionPrioritaire().confirmees,1);
});
test('archive failure cannot overwrite anything; CAS conflict or failed reread never confirms success',async()=>{
 for(const opts of [{archiveFail:true},{casFail:true},{readFail:true}]){const f=fixture(opts);await assert.rejects(f.save());assert.equal(f.api.resumeCorrectionPrioritaire().confirmees,0);if(opts.archiveFail)assert(!f.calls.includes('PATCH'));}
});
test('the latest word correction wins even if the obsolete spelling was taught many times',async()=>{
 const rows=[{source:after,proposee:before,corrigee:after},...Array.from({length:8},()=>({source:before,proposee:before,corrigee:'Ñaata ate nga am ?'}))];
 const lex=load('lib/lexique.ts',()=>assert.fail('no import during read'),async()=>Response.json(rows));
 // Memory-mode fixtures are inserted oldest to newest; read the production ordering with a fake Supabase.
 lex.lexiqueConfig.url='https://test.invalid';lex.lexiqueConfig.cle='test';
 let page=0;const api=load('lib/lexique.ts',()=>assert.fail('no import'),async()=>Response.json(page++?[]:rows.map((r,i)=>({...r,id:100-i,application:'bia'}))));api.lexiqueConfig.url='https://test.invalid';api.lexiqueConfig.cle='test';
 const words=await api.motsCorriges();assert.equal(words.find(w=>w.faux==='at')?.juste,'att');
});
