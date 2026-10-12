import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,deps={},env={}){const m={exports:{}};new Function('require','module','exports',...Object.keys(env),compile(fs.readFileSync(path,'utf8')))(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(env));return m.exports;}
const dialogue=load('lib/dialogue-devoirs-core.ts');
const core=load('lib/lexique-partage-core.ts',{'node:crypto':crypto,'./dialogue-devoirs-core':dialogue});
const entree={source:'Comment va ta famille ?',corrigee:'Naka sa waa kër ?',langue_source:'fr',niveau:'valide',date:'2026-09-02',origine:'validation_conversation'};
test('only explicitly validated latest translations are included; exact spelling and language direction survive',()=>{
 const rows=core.validesPartagees([entree,{...entree,source:'draft',niveau:'candidat'},{...entree,source:'reference',niveau:'reference'}]);assert.equal(rows.length,1);
 const pair=core.dialoguesDuLexique(rows)[0];assert.equal(pair.repliques[0].fr,entree.source);assert.equal(pair.repliques[0].wo,entree.corrigee);
 const reverse=core.dialoguesDuLexique(core.validesPartagees([{...entree,source:entree.corrigee,corrigee:entree.source,langue_source:'wo'}]))[0];assert.equal(reverse.id,pair.id);
 assert.equal(core.dialoguesDuLexique([...rows,{...rows[0],source:entree.corrigee,corrigee:entree.source,langue_source:'wo'}]).length,1);
 assert.equal(core.validesPartagees([entree,{...entree,date:'2026-10-12',niveau:'candidat'}]).length,0);
});
test('a translation of the user question is never mistaken for a conversational answer',()=>{
 const index=core.dialoguesDuLexique(core.validesPartagees([entree]));
 const packet=dialogue.paquetSelection(dialogue.chercherDialogues(index,entree.source,[]),[],'wo',entree.source);
 assert.equal(packet[0].repliques[0].selectionnable,false);
 assert.equal(dialogue.resoudreSelection({statut:'selection',id:'0:0'},packet,'wo').statut,'clarifier');
 const person=core.dialoguesDuLexique(core.validesPartagees([{...entree,source:'Je viens de France.'}]))[0];
 assert.equal(dialogue.paquetSelection([{d:person,actif:false,score:10,accords:2}],[],'wo','Tu peux me conseiller ?')[0].repliques[0].selectionnable,false);
});
test('private import is reread from durable storage, deduplicated and survives a new process',async()=>{
 let saved=null,writes=0;
 const storage={assurerMemoire:async()=>{},lireObjetMemoire:async path=>{assert.equal(path,'lexique/traducteur-valide-v1.json');return saved?Response.json(saved):null;},ecrireObjetMemoire:async(path,body)=>{saved=JSON.parse(body);writes++;}};
 const api=()=>load('lib/lexique-partage.ts',{'./audio-memoire-stockage':storage,'./lexique-partage-core':core},{process:{env:{KHALAM_LEXIQUE_IMPORT:JSON.stringify([entree,entree])}}});
 const first=api(),r=await first.integrerLexiquePartage();assert.equal(r.entrees,1);assert.equal(r.ajoutees,1);assert.equal(r.version_vivante,false);assert.equal(writes,1);
 assert.equal((await first.integrerLexiquePartage()).ajoutees,0);assert.equal((await api().indexLexiquePartage())[0].repliques[0].wo,entree.corrigee);
 assert(!JSON.stringify(first.resumeLexiquePartage()).includes(entree.corrigee));
});
test('legacy reader traverses beyond 800 rows, uses a stable cursor and shares its cached index',async()=>{
 const rows=Array.from({length:1101},(_,i)=>({id:1101-i,source:'Question '+i,corrigee:'Réponse '+i,application:'bia'}));let calls=0;
 const api=load('lib/lexique.ts',{}, {process:{env:{SUPABASE_URL:'https://db.test',SUPABASE_SERVICE_KEY:'test'}},fetch:async url=>{
  calls++;const u=new URL(url),last=u.searchParams.get('id');const cutoff=last?Number(last.slice(3)):Infinity;
  return Response.json(rows.filter(r=>r.id<cutoff).slice(0,500));
 }});
 const [a,b]=await Promise.all([api.toutes(),api.toutes()]);assert.equal(a.length,1101);assert.equal(b.length,1101);assert.equal(calls,4);
 assert.equal((await api.correctionExacte('Question 1100')).corrigee,'Réponse 1100');assert.equal(calls,4);
});
