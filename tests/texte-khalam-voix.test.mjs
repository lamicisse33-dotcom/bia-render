import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function url(file) {
 let code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace(/from ["']\.\/([\w-]+)["']/g,(_,name)=>'from '+JSON.stringify(url('lib/'+name+'.ts')));
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
test('formatting, decorative emoji and invisible controls never reach the voice',()=>{
 assert.equal(texteKhalamVoix('## **Bonjour** 👋\n- Jërëjëf, _papa_.\n> « Ñu ngi fi. »'),'Bonjour Jërëjëf, papa. Ñu ngi fi.');
 assert.equal(texteKhalamVoix('[BIA](https://app.khalam.app) dit “bonjour”.'),'BIA dit bonjour.');
 assert.equal(texteKhalamVoix('<b>École</b> &amp; café\u200b ✓'),'École et café');
 assert.equal(texteKhalamVoix('Dama bëgg wax wolof ak français.'),'Dama bëgg wax wolof ak français.');
});
test('meaningful digits, units, apostrophes and ordinary punctuation survive cleaning',()=>{
 assert.equal(texteKhalamVoix('**16 000 FCFA**, « 12,5 % ».'),'seize mille francs CFA, douze virgule cinq pour cent.');
 assert.equal(texteKhalamVoix("C’est l’âge, ñaata att nga am ?"),"C'est l'âge, ñaata att nga am ?");
 assert.equal(texteKhalamVoix('3 + 2 = 5'),'trois plus deux égale cinq');
});

test('multiplication is spoken rather than erased as Markdown',()=>{assert.equal(texteKhalamVoix('3 * 2 = 6'),'trois fois deux égale six');});

const {preparerAvecRegles}=await import(url('lib/passages-khalam-core.ts'));
test('actual bilingual voice plan removes formatting before language splitting and keeps corrected vocabulary',()=>{
 const raw='**Ñu ngi fi, jërëjëf.** 👋';
 const plan=preparerAvecRegles(raw,'wo',[],[],false,true);
 assert(plan.length>0);assert.equal(plan.map(p=>p.texte).join(' '),'Ñu ngi fi, jërëjëf.');
 assert(plan.every(p=>p.langue==='wo'));
 assert.equal(raw,'**Ñu ngi fi, jërëjëf.** 👋');
 assert.deepEqual(preparerAvecRegles('**👋**','wo',[],[]),[]);
 const lecon={texte:'at',prononciation:'att',langue:'wo',statut:'validé',date:'2026-10-21',date_validation:'2026-10-21',exemple:''};
 assert(preparerAvecRegles('**Ñaata at nga am ?**','wo',[lecon],[],false,true).some(p=>p.texte.includes('att')));
});
