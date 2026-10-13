import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
function load(path,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n];},m,m.exports);return m.exports;}
const dialogue=load('lib/dialogue-devoirs-core.ts');
const core=load('lib/biba-corrections-core.ts',{'node:crypto':crypto,'./dialogue-devoirs-core':dialogue});
const archive={version:1,type:'corrections-biba',exporte:'2026-10-13',fichier_present:true,lexique:[],reponses_origine:[{question_wo:'Nanga def?',question_fr:'Comment vas-tu ?',reponse_wo:'Maa ngi fi.'}],reponses:[]};
test('reject incomplete archives',()=>assert.throws(()=>core.verifierArchiveBiba({...archive,reponses:undefined}),/incomplet/));
test('latest validated correction overrides original without turning the French question into a translation',()=>{
 const rows=core.reponsesValideesBiba({...archive,reponses:[{question_wo:'Nanga def?',question_fr:'Comment vas-tu ?',reponse_wo:'Maa ngi fi rekk.',validee:true,quand:'2026-10-12'},{question_wo:'Nanga def?',reponse_wo:'Old',validee:true,quand:'2026-10-11'}]});
 assert.equal(rows.length,1);assert.equal(rows[0].reponse_wo,'Maa ngi fi rekk.');assert.equal(rows[0].question_fr,'Comment vas-tu ?');assert.equal(rows[0].origine,'correction_biba');
 for(const q of ['Nanga def?','Comment vas-tu ?'])assert.equal(core.selectionnerBiba(rows,q,[])[0].id,rows[0].id);
});
test('pending replacement does not resurrect an obsolete approved reply',()=>assert.equal(core.reponsesValideesBiba({...archive,reponses:[{question_wo:'Nanga def?',reponse_wo:'Pending',validee:false}]}).length,0));
test('retrieval keeps complete source replies and obeys budget',()=>{
 const rows=core.reponsesValideesBiba(archive);assert.deepEqual(core.selectionnerBiba(rows,'Nanga def?',[],1),[]);assert.equal(core.selectionnerBiba(rows,'Nanga def?',[])[0].reponse_wo,'Maa ngi fi.');assert.deepEqual(core.selectionnerBiba(rows,'ordinateur',[]),[]);
});
