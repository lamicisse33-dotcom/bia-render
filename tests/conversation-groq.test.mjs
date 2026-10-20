import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
const load = async (path) => {
  const source=fs.readFileSync(path,'utf8').replace(/^import \{CONSIGNE_COMPREHENSION,langueConversation\} from .*;$/m,fs.readFileSync('lib/comprehension-conversation.ts','utf8'));
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
};
const {messagesConversation,effortConversation,reglagesConversation,CONSIGNE_RESUME_CONVERSATION}=await load('lib/conversation-groq.ts');
test('cached personality stays identical when retrieved topics change',()=>{
 const a=messagesConversation({question:'Parlons des études',history:[],maitrises:'études',outils:'outil A',fiches:'fiche études'});
 const b=messagesConversation({question:'Parlons du commerce',history:[],maitrises:'commerce',outils:'outil B',fiches:'fiche commerce'});
 assert.equal(a[0].content,b[0].content);
 assert(a.filter(m=>m.role==='system').map(m=>m.content).join('\n\n').includes('outil A\n\nétudes'));
 assert(b.filter(m=>m.role==='system').map(m=>m.content).join('\n\n').includes('outil B\n\ncommerce'));
});
test('rapid context prioritises late relevant memories without cutting the current long question',()=>{
 const question='Je défends un budget limité pour les transports. '+ 'Mon objection reste précise. '.repeat(35);
 const souvenir='Note hors sujet\n'.repeat(300)+'Les transports doivent respecter le budget annoncé.';
 const messages=messagesConversation({question,history:[],rapide:true,souvenirs:souvenir,lexique:'correction wolof\n'.repeat(400),instructions:'Règle du maître intégrale',maitre:true});
 const text=messages.map(m=>m.content).join('\n');
 assert(text.includes('Les transports doivent respecter le budget annoncé.'));
 assert(text.includes('Règle du maître intégrale'));
 assert.equal(messages.at(-1).content,question);
});
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
  assert(m[0].content.includes("N'invente ni mot wolof, ni traduction, ni souvenir, ni source, ni résultat d'action"));
  assert(m[0].content.includes('changement de langue prime'));
  assert(CONSIGNE_RESUME_CONVERSATION.includes('Attribue chaque position à son auteur'));
});

test('learned conversational directions reach the provider alongside the current question and history',()=>{
 const messages=messagesConversation({question:'Oui.',history:[{role:'assistant',content:'Parlons des études ?'}],maitrises:'DOMAINES VALIDÉS DISPONIBLES: études'});
 assert(messages.filter(m=>m.role==='system').some(m=>m.content.includes('DOMAINES VALIDÉS DISPONIBLES: études')));
 assert(messages.some(m=>m.role==='assistant'&&m.content==='Parlons des études ?'));
 assert.equal(messages.at(-1).content,'Oui.');
});

test('actual compact messages carry contextual interpretation and bounded unconfirmed hints without rewriting user speech',()=>{
 const question='Dama sokhla preuve de paiement.';
 const history=[{role:'assistant',content:'Depuis quand ?'},{role:'user',content:'depui hier soire'}];
 const messages=messagesConversation({question,history,suggestionsTranscription:['Dama soxla preuve de paiement.','x'.repeat(900),'trois','quatre']});
 assert(messages[0].content.includes('COMPRÉHENSION ACTIVE'));
 assert(messages[0].content.includes('rectifie mentalement'));
 const hints=messages.find(m=>m.content.includes('HYPOTHÈSES DE TRANSCRIPTION'));
 assert(hints);assert(!hints.content.includes('quatre'));assert(!hints.content.includes('x'.repeat(601)));
 assert.deepEqual(messages.filter(m=>m.role!=='system'),[...history,{role:'user',content:question}]);
});

test('Wolof sentence structure survives French borrowings and explicit French preference wins',()=>{
 for(const q of ['Dama sokhla preuve de paiement.','pour dem université bi','Déedéet, bëgguma.']){
  const m=messagesConversation({question:q,history:[]});assert(m.at(-2).content.includes('LANGUE DE CE TOUR : wolof'));
 }
 for(const q of ['Je veux une preuve de paiement.','depui hier soire','pour te la rendre'])assert(messagesConversation({question:q,history:[]}).at(-2).content.includes('LANGUE DE CE TOUR : français'));
 assert(messagesConversation({question:'Dama soxla preuve de paiement.',history:[{role:'user',content:'Réponds en français.'}]}).at(-2).content.includes('LANGUE DE CE TOUR : français'));
});
test('a refusal must reach contextual conversation, not a fixed echo',async()=>{
 const {dependDuContexte}=await load('lib/comprehension-conversation.ts');
 assert(dependDuContexte('Déedéet, bëgguma.'));assert(dependDuContexte('Waaw.'));
 assert(!dependDuContexte('Bonjour'));
 const route=fs.readFileSync('app/api/chat/route.ts','utf8');
 const ast=ts.createSourceFile('route.ts',route,ts.ScriptTarget.Latest,true);let predicate;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='repertoireUtilisable')predicate=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(predicate);
 const js=ts.transpileModule(predicate,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const allowed=(question,ouvertureSalutation)=>new Function('env',`with(env){return (${js.trim().replace(/;$/,'')});}`)({repertoireActif:()=>true,estRara:false,dependDuContexte,question,ouvertureSalutation,salutationReconnue:q=>q==='Bonjour'})();
 for(const q of ['Déedéet, bëgguma.','Waaw.'])for(const ouverture of [true,false])assert.equal(allowed(q,ouverture),false);
 assert.equal(allowed('Bonjour',true),true);assert.equal(allowed('Bonjour',false),false);
});


test('tools precede changing lesson options with exactly the same combined source text',()=>{
 const outils="Les commandes d'écran se placent ici.\nRègle inchangée.",maitrises='Répliques exactes du devoir.';
 const msgs=messagesConversation({question:'Et ensuite ?',history:[],outils,maitrises});
 const i=msgs.findIndex(m=>m.content===outils);assert(i>0);assert.equal(msgs[i+1].content,maitrises);
 assert.equal(msgs.slice(i,i+2).map(m=>m.content).join('\n\n'),outils+'\n\n'+maitrises);
});
