import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,deps={},env={}){const m={exports:{}};new Function('require','module','exports',...Object.keys(env),compile(fs.readFileSync(path,'utf8')))(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(env));return m.exports;}
const core=load('lib/dialogue-devoirs-core.ts'),lecture=load('lib/lecture-devoirs-core.ts'),comparaison=load('lib/comparaison-lexique-core.ts');
const bloc=texte=>({version:2,type:'devoir',id:'lesson',index:0,total:1,date:'2026-10-13',statut:'validé',date_validation:'2026-10-13',texte});
function service(fetch){return load('lib/devoirs-apprentissage.ts',{'node:crypto':crypto,'./lecture-devoirs-core':lecture,'./dialogue-devoirs-core':core,'./comparaison-lexique-core':comparaison,'./lecture-devoirs-etat':{noterChargementDevoirs(){}},'./lexique':{lexiqueConfig:{actif:true,url:'https://fixture.invalid',table:'lexique',cle:'fixture'},ajouterCorrection:async()=>{}},'./lexique-apprentissage-core':{APP_LECONS:'test'}},{fetch,globalThis:{}});}
test('raw lesson context uses the same language aliases as conversation selection',()=>{
 const s=service(()=>{throw Error('unexpected network');});
 const b=bloc('DEVOIR 33 — L’ENFANT AU QUOTIDIEN\nWolof : Xale bi dafay nelaw.\nFrançais : L’enfant dort.');
 for(const q of ['Parlons des enfants.','Khalé bi.'])assert.equal(s.selectionnerDevoirs([b],q),b.texte);
 assert.equal(s.selectionnerDevoirs([{...b,statut:undefined}], 'enfants'),'');
});
test('recognition vocabulary retains standalone drills while excluding superseded lesson spellings',async()=>{
 const recente={...bloc('DEVOIR 33 — Enfants\nWolof : Xale bi.\nFrançais : L’enfant.\nKhalé, enfant, khalé, enfant.'),id:'new',date:'2026-10-13'};
 const ancienne={...bloc('DEVOIR 33 — Enfants\nWolof : Ancienne graphie.\nFrançais : Ancienne phrase.'),id:'old',date:'2026-10-12'};
 const s=service(async()=>({ok:true,json:async()=>[recente,ancienne].map(b=>({proposee:JSON.stringify(b)}))}));
 const phrases=await s.phrasesApprisesDevoirs();
 assert(phrases.includes('Xale bi.'));assert(phrases.includes('Khalé, enfant, khalé, enfant.'));assert(!phrases.some(p=>p.includes('Ancienne graphie')));
});
test('a read started before a root correction cannot restore an obsolete cache',async()=>{
 let release,reads=0;
 const old=bloc('ancienne version'),newer=bloc('version corrigée');
 const s=service(async()=>{reads++;if(reads===1){await new Promise(r=>release=r);return {ok:true,json:async()=>[{proposee:JSON.stringify(old)}]};}return {ok:true,json:async()=>[{proposee:JSON.stringify(newer)}]};});
 const inFlight=s.devoirsALire();
 s.invaliderDevoirs();release();
 assert.equal((await inFlight).devoirs[0].texte,newer.texte);
 assert.equal((await s.devoirsALire()).devoirs[0].texte,newer.texte);
 assert.equal(reads,2);
});
