import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(path,deps={}){const m={exports:{}};new Function('require','module','exports',compile(fs.readFileSync(path,'utf8')))(n=>{assert(n in deps,n);return deps[n];},m,m.exports);return m.exports;}
const textes=load('lib/repertoire-textes.ts'),normaliser=load('lib/normaliser.ts'),services=load('lib/services-textes.ts');
const salut=load('lib/salutations-dialogue.ts',{'./repertoire-textes':textes,'./normaliser':normaliser,'./services-textes':services});
test('whole and combined French/Wolof greetings are identified without swallowing a real request',()=>{
 for(const [q,key] of [['Bonjour','salut'],['Bonsoir Bia','bonsoir'],['Bia, bonjour !','salut'],['Nanga def ?','ca-va'],['Salut, comment vas-tu ?','ca-va'],['Bonjour, comment ça va ?','ca-va'],['Salaamaleekum','salut'],['Assalamou aleykoum','salut'],['Bonjour bonjour','salut']]){
  assert.equal(salut.salutationReconnue(q)?.cle,key,q);assert.equal(salut.accusePertinent(q),false,q);
 }
 for(const q of ['Bonjour, ma copine ne répond plus','Bonjour, cherche une pharmacie','Ça va pas du tout','Je suis triste','Non','D’accord','Merci','Tu me dis bonjour'])assert.equal(salut.salutationReconnue(q),undefined,q);
});
test('acknowledgements need an explicit action, never social speech, distress or a question',()=>{
 for(const q of ['','Bonjour','Bonsoir','Nanga def','Merci','Au revoir','Je suis triste','Mon père est mort','Non','D’accord','Combien coûte un sac de riz ?','Pourquoi tu répètes ?'])assert.equal(salut.accusePertinent(q),false,q);
 for(const q of ['Cherche une pharmacie','Vérifie cette information','Lis ce document','Calcule 12 fois 6'])assert.equal(salut.accusePertinent(q),true,q);
});
test('repeated greetings keep the exact corrected phrase and its matching recording',async()=>{
 let reads=0;const audio={cle:'salut',langue:'fr',texte:'Bonjour. Comment vas-tu ?',adresse:'https://audio.test/bonjour.mp3'};
 const api=load('lib/reponse-salutation.ts',{'./salutations-dialogue':salut,'./repertoire':{langueDe:()=> 'fr'},'./sons-courants':{lireCatalogueCourant:async()=>{reads++;return [{...audio,revision:2,audio}];}}});
 for(let i=0;i<3;i++){const r=await api.reponseSalutation('Bonjour');assert.equal(r.reply,audio.texte);assert.deepEqual(r.son_courant,audio);assert.equal(r.salutation,true);}
 assert.equal(reads,1);assert.equal(await api.reponseSalutation('Bonjour, ma copine ne répond plus'),null);
});
test('audio from an older correction is never attached to a newer greeting',async()=>{
 const api=load('lib/reponse-salutation.ts',{'./salutations-dialogue':salut,'./repertoire':{langueDe:()=> 'fr'},'./sons-courants':{lireCatalogueCourant:async()=>[{cle:'salut',langue:'fr',texte:'Bonjour !',audio:{texte:'Ancienne phrase'}}]}});
 const r=await api.reponseSalutation('Bonjour');assert.equal(r.reply,'Bonjour !');assert.equal(r.son_courant,undefined);
});
