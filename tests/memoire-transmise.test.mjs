import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/conversation-groq.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
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
