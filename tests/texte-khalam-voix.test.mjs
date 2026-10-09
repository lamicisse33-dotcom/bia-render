import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function url(file) {
 let code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace(/from "\.\/(\w+)"/g,(_,name)=>'from '+JSON.stringify(url('lib/'+name+'.ts')));
 return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
}
const {texteKhalamVoix}=await import(url('lib/texte-khalam-voix.ts'));
test('French amounts, percentage, clock and negatives are spoken without digits',()=>{
 assert.equal(texteKhalamVoix('16 000 FCFA'), 'seize mille francs CFA');
 assert.equal(texteKhalamVoix('71 et 95'), 'soixante et onze et quatre-vingt-quinze');
 assert.equal(texteKhalamVoix('12,5 %'), 'douze virgule cinq pour cent');
 assert.equal(texteKhalamVoix('À 14h30 et 09:05.'), 'À quatorze heures trente et neuf heures cinq.');
 assert.equal(texteKhalamVoix('-12 degrés'), 'moins douze degrés');
});
test('telephone remains a digit sequence in French, not a monetary amount',()=>{
 assert.equal(texteKhalamVoix('77 123 45 67'), 'sept sept un deux trois quatre cinq six sept');
});
test('accents and Wolof words preserved without extra commentary',()=>{
 for(const phrase of ['Émilie préfère le café.','Ñu ngi fi, jërëjëf.','Répète après moi.'])
  assert.equal(texteKhalamVoix(phrase),phrase);
 assert.equal(texteKhalamVoix('e\u0301cole'),'école');
});
