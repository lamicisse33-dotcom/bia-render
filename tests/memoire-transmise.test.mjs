import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/conversation-groq.ts','utf8').replace(/^import \{CONSIGNE_COMPREHENSION,langueConversation\} from .*;$/m,fs.readFileSync('lib/comprehension-conversation.ts','utf8')),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {messagesConversation,resumeTransmissionMemoire}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('memories, Wolof corrections and KHALAM knowledge survive an oversized unrelated context',()=>{
 const messages=messagesConversation({question:'Que sais-tu de notre projet ?',history:[],maitre:true,
  souvenirs:'Souvenir vérifié: rendez-vous à 15 heures.',lexique:'Correction wolof exacte: ñëwal.',
  connaissances:'KHALAM: information du référentiel.',lecons:'Leçon de papa conservée.',
  contexte:'Autre contexte. '.repeat(3000),resume:'Résumé indépendant.'});
 const all=messages.map(m=>m.content).join('\n');
 for(const text of ['rendez-vous à 15 heures','ñëwal','information du référentiel','Leçon de papa conservée','Résumé indépendant.'])assert(all.includes(text));
 assert.equal(messages.at(-1).content,'Que sais-tu de notre projet ?');
 const d=resumeTransmissionMemoire();
 assert(d.derniere.souvenirs_signes>0 && d.derniere.lexique_signes>0 && d.derniere.connaissances_khalam_signes>0);
 assert(!JSON.stringify(d).includes('rendez-vous'));
});
test('private master lessons are not transmitted in a non-master conversation',()=>{
 const messages=messagesConversation({question:'Bonjour',history:[],lecons:'LECON_PRIVEE',maitre:false});
 assert(!messages.some(m=>m.content.includes('LECON_PRIVEE')));
 assert.equal(resumeTransmissionMemoire().derniere.lecons_signes,0);
});
test('each source has an independent bound; one oversized source cannot evict the others',()=>{
 const messages=messagesConversation({question:'Continue',history:[{role:'user',content:'Contrainte du tour précédent'}],
  souvenirs:'s'.repeat(20000),lexique:'MOT_VALIDÉ',connaissances:'CONNAISSANCE_VALIDÉE',resume:'RÉSUMÉ_VALIDÉ'});
 const all=messages.map(m=>m.content).join('\n');
 for(const value of ['MOT_VALIDÉ','CONNAISSANCE_VALIDÉE','RÉSUMÉ_VALIDÉ','Contrainte du tour précédent'])assert(all.includes(value));
 assert.equal(resumeTransmissionMemoire().derniere.souvenirs_signes,5000);
});
test('product knowledge survives unrelated context, reaches all accounts and is measured without exposing content',()=>{
 for(const maitre of [false,true]){
  const products=fs.readFileSync('data/produits.md','utf8').split(/^---$/m).slice(1).join('---');
  const messages=messagesConversation({question:'Tu connais DDsking ?',history:[],maitre,produits:products,contexte:'autre contexte '.repeat(5000),connaissances:'k'.repeat(10000)});
  const all=messages.map(m=>m.content).join('\n');
  for(const value of ['DD SKIN','Didi et Awa','DD BLACK SOAP','DD FACE SOAP','DD CLEANSING LOTION','78 117 02 87'])assert(all.includes(value));
  assert(resumeTransmissionMemoire().derniere.produits_signes>0);assert(!JSON.stringify(resumeTransmissionMemoire()).includes('DD BLACK SOAP'));
 }
 const absent=messagesConversation({question:'Je suis étudiant.',history:[]});assert(!absent.some(m=>m.content.includes('DD SKIN')));assert.equal(resumeTransmissionMemoire().derniere.produits_signes,0);
});
test('connected cards, validated assignments, pedagogy and media cannot fall out of a long generic context',()=>{
 const sources={fiches:'FICHE_TARDIVE',instructions:'INSTRUCTION_MAITRE',devoirs:'DEVOIR_VALIDÉ',vitrine:'MEDIA_DISPONIBLE'};
 for(const maitre of [true,false]){
  const ms=messagesConversation({question:'Continue',history:[],maitre,...sources,contexte:'bruit '.repeat(10000)});const text=ms.map(m=>m.content).join('\n');
  for(const key of ['fiches','devoirs','vitrine'])assert(text.includes(sources[key]));assert.equal(text.includes(sources.instructions),maitre);
 }
});
