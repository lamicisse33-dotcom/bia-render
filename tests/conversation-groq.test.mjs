import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
const load = async (path) => {
  const source=fs.readFileSync(path,'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
};
const {messagesConversation,effortConversation,reglagesConversation,CONSIGNE_RESUME_CONVERSATION}=await load('lib/conversation-groq.ts');
const {fenetreDuFil}=await load('lib/fenetre-du-fil.ts');
test('early constraints and arguments survive twenty conversational turns',()=>{
  const history=Array.from({length:38},(_,i)=>({role:i%2?'assistant':'user',content:`Message ${i}: `+(i===0?'Budget maximal de 25000 francs, je refuse les prêts.':'Argument '+i)}));
  const messages=messagesConversation({question:'Quelle solution respecte mon budget ?',history:fenetreDuFil(history)});
  assert(messages.some(m=>m.content.includes('25000 francs')));
  assert.equal(messages.filter(m=>m.role!=='system').length,39);
});
test('summary cannot disappear behind many retrieved memories',()=>{
  const m=messagesConversation({question:'Revenons au désaccord.',history:[],resume:'BIA propose A ; la personne défend B pour le coût.',contexte:'x'.repeat(20000)});
  assert(m.some(x=>x.content.includes('la personne défend B')));
});
test('an objection at the beginning of a long turn is not sliced away',()=>{
  const phrase='Mon objection est le manque de transport. '+ 'détail '.repeat(160);
  const m=messagesConversation({question:'Et alors ?',history:[{role:'user',content:phrase}]});
  assert.equal(m[1].content,phrase);
});
test('reasoning follows the actual task, including short objections and Wolof',()=>{
  for(const q of ['Bonjour','Naka nga def ?','Merci','Traduis bonjour en wolof'])assert.equal(effortConversation(q),'low');
  for(const q of ['Pas d’accord.','Lu tax ?','Waaye sama xalaat mooy…','Explique en français pourquoi tu défends cette idée.','2000 moins 500'])assert.equal(effortConversation(q),'medium');
  assert.equal(effortConversation('Analyse en profondeur ces objections.'),'high');
  assert.equal(effortConversation('Explique pourquoi',true),'low');
  assert(reglagesConversation('Pas d’accord.').max_completion_tokens>1536);
});
test('prompt keeps debate attribution, language priority and summarization requirements',()=>{
  const m=messagesConversation({question:'En français.',history:[],maitre:true});
  assert(m[0].content.includes('sans flatterie'));
  assert(m[0].content.includes('changement de langue prime'));
  assert(CONSIGNE_RESUME_CONVERSATION.includes('Attribue chaque position à son auteur'));
});
