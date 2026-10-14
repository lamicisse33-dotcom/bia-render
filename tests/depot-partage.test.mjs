import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function instance(){const m={exports:{}};const s=ts.transpileModule(fs.readFileSync('lib/morceaux-de-parole.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',s)(()=>{throw Error('unexpected dependency');},m,m.exports);return m.exports;}
test('separate upload and transcription modules share the same numbered audio deposit',async()=>{
 const upload=instance(),lecture=instance(),cle='test_dep_shared_123';
 assert(upload.poserMorceau(cle,1,new Uint8Array([3,4]),'audio/webm','test.webm').ok);
 assert(upload.poserMorceau(cle,0,new Uint8Array([1,2]),'audio/webm','test.webm').ok);
 assert(lecture.annoncerLaFin(cle,2).ok);
 const r=lecture.recoudre(cle);assert(r.ok);assert.deepEqual([...new Uint8Array(await r.son.blob.arrayBuffer())],[1,2,3,4]);
 upload.oublierLeDepot(cle);assert.equal(lecture.recoudre(cle).ok,false);
});
test('independent route instances retain duplicate handling and complete-only reconstruction',()=>{
 const a=instance(),b=instance(),cle='test_dep_missing_123';a.poserMorceau(cle,0,new Uint8Array([1]),'audio/webm','test.webm');a.poserMorceau(cle,0,new Uint8Array([9]),'audio/webm','test.webm');b.annoncerLaFin(cle,2);assert.equal(b.recoudre(cle).ok,false);a.oublierLeDepot(cle);
});
