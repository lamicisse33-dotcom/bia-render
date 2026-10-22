import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(path,deps={},globals={}){const m={exports:{}};new Function('require','module','exports','globalThis',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n]},m,m.exports,globals);return m.exports;}
const bloc=texte=>({version:2,type:'devoir',id:'lesson',index:0,total:1,date:'2026-10-22',statut:'validé',date_validation:'2026-10-22',langue:'wo',texte});
test('independent ASR and chat module copies share source analysis and its actual counters',()=>{
 const g={},a=load('lib/dialogue-devoirs-core.ts',{},g),b=load('lib/dialogue-devoirs-core.ts',{},g),texte='Wolof : Tamaate.\nFrançais : Tomate.';
 const x=a.referenceApprisePourTour(texte,'tomate');const first=a.resumeReferencesApprises().preparation;
 assert.equal(b.referenceApprisePourTour(texte,'tomate'),x);
 const second=b.resumeReferencesApprises().preparation;
 assert.equal(second.analyses,first.analyses);assert.equal(second.reutilisations,first.reutilisations+1);
 assert.deepEqual(a.resumeReferencesApprises(),b.resumeReferencesApprises());
});
test('independent lesson readers share an in-flight read, expire normally and observe a root correction',async()=>{
 const g={},core=load('lib/dialogue-devoirs-core.ts',{},g),lecture=load('lib/lecture-devoirs-core.ts',{},g);
 let current=bloc('Wolof : Ancienne phrase.\nFrançais : Ancien texte.'),reads=0,release;
 const gate=new Promise(r=>release=r);
 const fetch=async()=>{reads++;if(reads===1)await gate;return Response.json([{proposee:JSON.stringify(current)}]);};
 const deps={'node:crypto':crypto,'./lecture-devoirs-core':lecture,'./dialogue-devoirs-core':core,'./lecture-devoirs-etat':{noterChargementDevoirs(){}},'./lexique':{lexiqueConfig:{actif:true,url:'https://fixture.invalid',table:'lessons',cle:'fixture'}},'./lexique-apprentissage-core':{APP_LECONS:'test'}};
 function instance(){const m={exports:{}};new Function('require','module','exports','globalThis','fetch',ts.transpileModule(fs.readFileSync('lib/devoirs-apprentissage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>deps[n],m,m.exports,g,fetch);return m.exports;}
 const asr=instance(),chat=instance(),pending=asr.devoirsALire(),pending2=chat.devoirsALire();assert.equal(reads,1);release();
 assert.deepEqual(await pending,await pending2);assert.equal(reads,1);
 current=bloc('Wolof : Nouvelle phrase exacte.\nFrançais : Nouveau texte.');asr.invaliderDevoirs();
 assert.match((await chat.devoirsALire()).devoirs[0].texte,/Nouvelle phrase exacte/);assert.equal(reads,2);
 assert.match((await asr.devoirsALire()).devoirs[0].texte,/Nouvelle phrase exacte/);assert.equal(reads,2);
 g.biaLectureDevoirs.cache.expires=0;await chat.devoirsALire();assert.equal(reads,3);
});
test('independent instruction readers share the warm data and a confirmed new instruction',async()=>{
 const g={};let rows=[{source:'old',corrigee:'Première règle.'}],reads=0;
 const deps={'node:crypto':crypto,'./lexique':{lexiqueConfig:{actif:true,url:'https://fixture.invalid',table:'lessons',cle:'fixture'},ajouterCorrection:async r=>rows.unshift({source:r.source,corrigee:r.corrigee})},'./lexique-apprentissage-core':{APP_LECONS:'test'}};
 function instance(){const m={exports:{}};new Function('require','module','exports','globalThis','fetch',ts.transpileModule(fs.readFileSync('lib/instructions-apprentissage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>deps[n],m,m.exports,g,async()=>{reads++;return Response.json(rows)});return m.exports;}
 const asr=instance(),chat=instance();assert.equal(await asr.contexteInstructions(),await chat.contexteInstructions());assert.equal(reads,1);
 await asr.garderInstruction('Nouvelle règle exacte.');const afterWrite=reads;
 assert.match(await chat.contexteInstructions(),/Nouvelle règle exacte/);assert.equal(reads,afterWrite);
 g.biaLectureInstructions.cache.expires=0;await chat.contexteInstructions();assert.equal(reads,afterWrite+1);
});
test('independent dialogue modules reuse the same index, while a changed source changes it immediately',async()=>{
 const g={},core=load('lib/dialogue-devoirs-core.ts',{},g);let texte='Wolof : Tamaate.\nFrançais : Tomate.';
 const deps={'./lexique-partage':{indexLexiquePartage:async()=>[]},'./dialogue-rapide':{chargerDialoguesRapides(){}},'./cerveau-anthropic':{},'./cerveau-cerebras':{},'./devoirs-apprentissage':{devoirsALire:async()=>({devoirs:[{id:'lesson',texte,date:'2026-10-22',valide:true}]})},'./dialogue-devoirs-core':core,'./langue':{},'./salutations-dialogue':{}};
 const asr=load('lib/dialogue-devoirs.ts',deps,g),chat=load('lib/dialogue-devoirs.ts',deps,g);
 const a=await asr.indexDialogue();assert.strictEqual(await chat.indexDialogue(),a);
 texte='Wolof : Nouvelle formulation exacte.\nFrançais : Formulation corrigée.';
 const b=await chat.indexDialogue();assert.notStrictEqual(b,a);assert.equal(b[0].repliques[0].wo,'Nouvelle formulation exacte.');assert.strictEqual(await asr.indexDialogue(),b);
});
