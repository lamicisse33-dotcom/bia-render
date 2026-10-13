import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file,modules={}){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert(id in modules,id);return modules[id];},module,module.exports);return module.exports;}
const langue=load('lib/langue.ts');const core=load('lib/transcription-contexte-core.ts',{'./langue':langue});
const {corrigerTexteApprentissage:c}=load('lib/correction-apprentissage-core.ts',{'./transcription-contexte-core':core});
const phrases=['Dama bëgg soxla preuve de paiement.','Xale bi dafay jooy.'];
test('validated accent and kh/x spelling, exact line offsets and French preserved',()=>{
 const original='Wolof : Dama begg sokhla preuve de paiement.\nFrançais : Je veux partir.\nWolof : Xale bidafay jooy.';
 const r=c(original,phrases,[]);assert.equal(r.texte,'Wolof : Dama bëgg soxla preuve de paiement.\nFrançais : Je veux partir.\nWolof : Xale bi dafay jooy.');assert.equal(r.passages.length,2);
 for(const p of r.passages)assert.equal(r.texte.slice(p.debut,p.fin),p.apres);
});
test('ambiguous accents, known compounds, numbers and new words retained',()=>{
 const s='Dama begg bidafay 2000 zzz.';assert.equal(c(s,[...phrases,'Dama begg bidafay.'],[]).texte,s);
 assert.equal(c('Dama bég',[ 'Dama bëg.','Dama bèg.'],[]).texte,'Dama bég');
});
test('learned exact spelling rule only, semantic replacement rejected',()=>{
 assert.equal(c('Dama xaaliss bi.',phrases,[{entendu:'xaaliss',corrige:'xaalis'}]).texte,'Dama xaalis bi.');
 assert.equal(c('Dama soxla.',phrases,[{entendu:'Dama soxla',corrige:'Je veux partir'}]).texte,'Dama soxla.');
 assert.equal(c('Français : begg\nTEST: begg',phrases,[]).texte,'Français : begg\nTEST: begg');
});
test('markup remains plain text, no missing words, stable repeated correction',()=>{
 const r=c('<img src=x> Dama begg.',phrases,[]);assert(r.texte.startsWith('<img src=x>'));assert.equal(c(r.texte,phrases,[]).texte,r.texte);
});
