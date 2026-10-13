import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('lib/horloge.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};new Function('module','exports',code)(m,m.exports);
const {reponseHorloge,contexteHorloge}=m.exports;
test('date and hour come from Dakar clock across midnight and do not need a model',()=>{
 const before=new Date('2026-10-13T23:59:00Z'),after=new Date('2026-10-14T00:01:00Z');
 assert.equal(reponseHorloge("On est quel jour aujourd'hui ?",before).reply,'Nous sommes le mardi 13 octobre 2026.');
 assert.equal(reponseHorloge('Il fait quelle heure ?',before).reply,'Il est 23 h 59 à Dakar.');
 assert.equal(reponseHorloge('Quelle heure est-il ?',after).reply,'Il est 00 h 01 à Dakar.');
 assert.match(reponseHorloge('La date',after).reply,/mercredi 14 octobre/);
 assert.match(contexteHorloge(after),/14 octobre 2026/);
});
test('no interception of events, another city, teaching or past dates',()=>{
 for(const q of ['À quelle heure est mon rendez-vous ?','Quelle heure est-il à Paris ?','Répète : il est quelle heure','Quelle était la date hier ?','On est quel jour aujourd’hui et quelle est la météo ?'])assert.equal(reponseHorloge(q),null,q);
});
