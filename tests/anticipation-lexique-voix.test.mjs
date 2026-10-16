import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function charger(lire,regles){
 const m={exports:{}};
 const source=ts.transpileModule(fs.readFileSync('lib/anticipation-lexique-voix.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','require','globalThis',source)(m,m.exports,n=>n==='./lexique-apprentissage'?{lireLecons:lire}:n==='./prononciation'?{reglesPrononciation:regles}:{},{});
 return m.exports;
}
const tick=()=>new Promise(r=>setImmediate(r));
test('preparation overlaps the model, shares pending reads and rereads after completion',async()=>{
 let calls=0,rules=0,release;
 const api=charger(()=>{calls++;return new Promise(r=>release=r);},async()=>{rules++;});
 assert.equal(api.anticiperLexiqueVoix(),undefined);
 api.anticiperLexiqueVoix();assert.equal(calls,1);assert.equal(rules,1);
 assert.equal(api.resumeAnticipationLexique().en_cours,true);
 release([]);await tick();
 assert.equal(api.resumeAnticipationLexique().en_cours,false);
 // A new call goes through the source loader again, not a frozen copy.
 api.anticiperLexiqueVoix();assert.equal(calls,2);release([]);await tick();
});
test('a failed speculative read does not reject chat and can be retried',async()=>{
 let count=0;const api=charger(async()=>{if(count++===0)throw Error('offline');return [];},async()=>[]);
 api.anticiperLexiqueVoix();await tick();assert.equal(api.resumeAnticipationLexique().erreurs,1);
 api.anticiperLexiqueVoix();await tick();assert.equal(api.resumeAnticipationLexique().appels,2);
 assert.equal(api.resumeAnticipationLexique().en_cours,false);
});
