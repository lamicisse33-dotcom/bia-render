import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const cache=new Map();function load(name){if(cache.has(name))return cache.get(name);const m={exports:{}};const js=ts.transpileModule(fs.readFileSync('lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',js)(id=>load(id.slice(2)),m,m.exports);cache.set(name,m.exports);return m.exports;}
const {accuseDemandePertinent}=load('accuse-demande');
test('a concrete question or search can acknowledge verification',()=>{
 for(const q of ['Cherche une pharmacie à Dakar','Peux-tu vérifier cette information ?','Quel est le prix du riz ?','Combien coûte un billet ?','Pourquoi le ciel est bleu ?','Comment fonctionne une batterie ?','Explique les règles du football','Où se trouve la mairie ?','Lan mooy inflation ?'])assert.equal(accuseDemandePertinent(q),true,q);
});
test('name, greetings, emotional conversation and follow-ups cannot become waiting phrases',()=>{
 for(const q of ["Comment tu t'appelles ?",'Bonjour, quel est ton nom ?','Noo tudd ?','Sa tur mooy lan ?','Bonjour','Nanga def ?','Oui','Non','D’accord','Et ensuite ?','Pourquoi ?','Comment va ta journée ?','Qu’est-ce que tu en penses ?','Tu es là ?','Je suis triste','Ma copine ne répond pas','Pourquoi tu me réponds comme ça ?'])assert.equal(accuseDemandePertinent(q),false,q);
});
