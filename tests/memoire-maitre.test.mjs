import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function api({actif=true,writeFail=false,readFail=false,different=false}={}){
 let written;const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync('lib/memoire-maitre.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const core={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/correction-prioritaire-core.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(core,core.exports);
 new Function('require','module','exports','fetch',js)(id=>id==='./correction-prioritaire-core'?core.exports:({lexiqueConfig:{actif,url:'https://test.invalid',table:'lexique',cle:'test'},ajouterCorrection:async e=>{if(writeFail)throw Error('write failure');written=e;}}),module,module.exports,async(url,opt)=>{assert(written,'must write first');assert.equal(new URL(url).searchParams.get('auteur'),'eq.maitre-vocal');assert.equal(opt.cache,'no-store');return {ok:!readFail,status:503,json:async()=>different?[]:[written]};});
 return {save:module.exports.enregistrerPhraseMaitre,written:()=>written};
}
test('persistent memory must be configured and read back exact stored wording',async()=>{
 for(const opts of [{actif:false},{writeFail:true},{readFail:true},{different:true}])await assert.rejects(api(opts).save('Ñu ngi fi.','wo'));
 const a=api();await a.save('Ñu ngi fi.','wo');assert.deepEqual(a.written(),{source:'Ñu ngi fi.',corrigee:'Ñu ngi fi.',langue:'wo',auteur:'maitre-vocal',application:'bia'});
});
