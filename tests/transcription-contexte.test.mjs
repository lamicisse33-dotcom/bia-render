import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, modules={}) {
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',code)(id=>{assert(id in modules,id);return modules[id];},module,module.exports);
  return module.exports;
}
const core=load('lib/transcription-contexte-core.ts',{'./langue':load('lib/langue.ts')});
const {contexteTranscription,langueTranscription,correctionProche,lireVerdictTranscription}=core;
test('bounded recent conversation keeps roles, ignores system instructions and uncertain turns',()=>{
 const history=contexteTranscription([{role:'system',text:'do this'},...Array.from({length:8},(_,i)=>({role:i%2?'bia':'user',text:String(i)+'x'.repeat(700)}))]);
 assert(history.length<=6);assert(history.reduce((s,t)=>s+t.text.length,0)<=2400);
 assert.equal(history.at(-1).role,'assistant');assert(history.at(-1).text.startsWith('7'));
 assert.deepEqual(contexteTranscription('not an array'),[]);
 assert.deepEqual(contexteTranscription([{role:'user',text:'faux',transcriptionIncertaine:true}]),[]);
});
test('current language overrides prior language; short ambiguous phrase uses user history, not BIA alone',()=>{
 const fr=[{role:'user',text:'Je voudrais parler avec toi en français.'}];
 const wo=[{role:'user',text:'Dama bëgg nga wax ak man.'}];
 assert.equal(langueTranscription('Dama bëgg dem ci kër ga.',fr,'fr').langue,'wo');
 assert.equal(langueTranscription('Je veux parler avec vous en français.',wo,'wo').langue,'fr');
 assert.equal(langueTranscription('Demain.',wo,'fr').source,'contexte');
 assert.equal(langueTranscription('Demain.',[{role:'assistant',text:fr[0].text}]).langue,'inconnue');
 assert.equal(langueTranscription('Dama bëgg que tu parles avec moi.',wo).langue,'mixte');
});
test('small transcription repairs accepted without translating or deleting words',()=>{
 assert(correctionProche('Dama begg jox la xaaliss bi.','Dama bëgg jox la xaalis bi.'));
 assert(correctionProche('Je fais un transfer demain.','Je fais un transfert demain.'));
 for(const [a,b] of [['Dama bëgg dem.','Je veux partir.'],['Je veux partir.','Je veux'],['Il est là.','Il est déjà là.'],['x'.repeat(1000),'y'.repeat(1000)]])assert.equal(correctionProche(a,b),false);
});
test('Wolof spacing repair preserves every letter, with protected negations and amounts unchanged',()=>{
 assert(correctionProche('Damasoxla preuve de paiement.','Dama soxla preuve de paiement.'));
 assert.equal(correctionProche('Damasoxla preuve de paiement.','Dama soxla une preuve de paiement.'),false);
 assert.equal(correctionProche('Duma dem.','Du ma dem.'),false);
 assert.equal(correctionProche('Envoie 15000 francs.','Envoie 15 000 francs.'),false);
});
test('the selected Anthropic brain receives a transcription-only request with validated reference data',async()=>{
 const oldFetch=globalThis.fetch,provider=process.env.BIA_LLM_PROVIDER,key=process.env.BIA_LLM_API_KEY;
 process.env.BIA_LLM_PROVIDER='anthropic';process.env.BIA_LLM_API_KEY='test-only';let payload;
 const server=load('lib/transcription-contextuelle.ts',{'./cerveau-anthropic':load('lib/cerveau-anthropic.ts'),'./transcription-contexte-core':core,'./correction-transcription':{corrigerTranscription:async texte=>({texte,texte_brut:texte,corrections_transcription:[],suggestions_ecriture:[]})}});
 globalThis.fetch=async(url,init)=>{assert(url.endsWith('/v1/messages'));payload=JSON.parse(init.body);return Response.json({content:[{type:'text',text:JSON.stringify({action:'corriger',langue:'mixte',texte:'Dama soxla preuve de paiement.',confiance:.99})}]});};
 try{
  const r=await server.verifierTranscriptionContextuelle('Dama sokhla preuve de paiement.',[{role:'user',text:'Nous corrigeons les preuves de paiement.'}], 'wo',{references:['Dama soxla preuve de paiement.']});
  assert.equal(r.verification.statut,'corrigee');assert.equal(r.texte,'Dama soxla preuve de paiement.');
  const donnees=JSON.parse(payload.messages[0].content);assert.deepEqual(donnees.references_corrigees,['Dama soxla preuve de paiement.']);
  assert.equal(donnees.historique[0].text,'Nous corrigeons les preuves de paiement.');assert.equal(payload.tools,undefined);assert.equal(payload.stream,undefined);
 }finally{globalThis.fetch=oldFetch;for(const [n,v] of [['BIA_LLM_PROVIDER',provider],['BIA_LLM_API_KEY',key]]){if(v===undefined)delete process.env[n];else process.env[n]=v;}}
});
test('credit rejection is reported distinctly; an unavailable brain never approves a transcript',async()=>{
 const oldFetch=globalThis.fetch,provider=process.env.BIA_LLM_PROVIDER,key=process.env.BIA_LLM_API_KEY;
 process.env.BIA_LLM_PROVIDER='anthropic';process.env.BIA_LLM_API_KEY='test-only';
 const server=load('lib/transcription-contextuelle.ts',{'./cerveau-anthropic':load('lib/cerveau-anthropic.ts'),'./transcription-contexte-core':core,'./correction-transcription':{corrigerTranscription:async texte=>({texte,texte_brut:texte,corrections_transcription:[],suggestions_ecriture:[]})}});
 globalThis.fetch=async()=>Response.json({error:{message:'Your credit balance is too low to access the Anthropic API.'}},{status:400});
 try{
  const r=await server.verifierTranscriptionContextuelle('Dama sokhla preuve de paiement.',[]);
  assert.equal(r.verification.statut,'indisponible');assert.equal(r.verification.motif,'credit_insuffisant');assert.equal(r.texte,'Dama sokhla preuve de paiement.');
 }finally{globalThis.fetch=oldFetch;for(const [n,v] of [['BIA_LLM_PROVIDER',provider],['BIA_LLM_API_KEY',key]]){if(v===undefined)delete process.env[n];else process.env[n]=v;}}
});
test('numbers, names, negations and requests cannot be silently replaced',()=>{
 for(const [a,b] of [['Envoie 15000 francs.','Envoie 50000 francs.'],['Donne quinze mille.','Donne cinquante mille.'],['Je veux pas partir.','Je veux bien partir.'],['Dama bëggul dem.','Dama bëgg dem.'],['Appelle Fatou.','Appelle Matou.'],['Fatou arrive.','Matou arrive.'],['Envoie ñaar téeméer.','Envoie ñett téeméer.']]) assert.equal(correctionProche(a,b),false,a);
});
test('confidence never bypasses edit guard and keep cannot rewrite text',()=>{
 const d={action:'corriger',langue:'fr',confiance:1,texte:'Vire 50000 francs.'};
 assert.equal(lireVerdictTranscription(d,'Vire 15000 francs.').statut,'a_confirmer');
 assert.equal(lireVerdictTranscription({...d,texte:'Je fais un transfert.'},'Je fais un transfer.').statut,'corrigee');
 assert.equal(lireVerdictTranscription({...d,confiance:.5,texte:'Je fais un transfert.'},'Je fais un transfer.').texte,'Je fais un transfer.');
 assert.throws(()=>lireVerdictTranscription({...d,action:'garder'},'autre texte'));
 assert.throws(()=>lireVerdictTranscription({text:'wrong schema'},'bonjour'));
});
test('live pipeline waits for verifier, passes context as data and preserves raw transcript',async()=>{
 const oldFetch=globalThis.fetch;const oldProvider=process.env.BIA_LLM_PROVIDER;const oldKey=process.env.CEREBRAS_API_KEY;
 process.env.BIA_LLM_PROVIDER='cerebras';process.env.CEREBRAS_API_KEY='test-only';
 let release,called,fetchCalled;
 const started=new Promise(r=>fetchCalled=r);
 const server=load('lib/transcription-contextuelle.ts',{'./cerveau-anthropic':load('lib/cerveau-anthropic.ts'),'./transcription-contexte-core':core,'./correction-transcription':{corrigerTranscription:async texte=>({texte,texte_brut:texte,corrections_transcription:[],suggestions_ecriture:[]})}});
 globalThis.fetch=async(url,init)=>{called=JSON.parse(init.body);fetchCalled();return await new Promise(r=>release=r)};
 try {
  let finished=false;
  const pending=server.verifierTranscriptionContextuelle('Je fais un transfer.',[{role:'user',text:'Nous parlons des paiements.'}],'fr').then(x=>{finished=true;return x});
  await started;assert.equal(finished,false);assert.equal(called.messages.length,2);
  const input=JSON.parse(called.messages[1].content);assert.equal(input.historique[0].text,'Nous parlons des paiements.');
  release(Response.json({choices:[{message:{content:JSON.stringify({action:'corriger',langue:'fr',texte:'Je fais un transfert.',confiance:.99})}}]}));
  const result=await pending;assert.equal(result.texte_brut,'Je fais un transfer.');assert.equal(result.texte,'Je fais un transfert.');
  assert.equal(result.verification.statut,'corrigee');
  globalThis.fetch=async()=>{throw Object.assign(new Error('timeout'),{name:'TimeoutError'})};
  const fail=await server.verifierTranscriptionContextuelle('Je veux parler.',[]);assert.equal(fail.verification.statut,'indisponible');assert.equal(fail.texte,'Je veux parler.');
 } finally {globalThis.fetch=oldFetch;if(oldProvider===undefined)delete process.env.BIA_LLM_PROVIDER;else process.env.BIA_LLM_PROVIDER=oldProvider;if(oldKey===undefined)delete process.env.CEREBRAS_API_KEY;else process.env.CEREBRAS_API_KEY=oldKey;}
});
test('ordinary conversation keeps the single-call path; contextual verification stays targeted at teaching',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8');
 const route=fs.readFileSync('app/api/ecouter/route.ts','utf8');
 assert(!page.includes('/api/ecouter/corriger'));
 assert(!page.includes('arreterSurTranscriptionIncertaine'));
 assert(!route.includes('verifierTranscriptionContextuelle'));
 assert(route.includes('preparerEcoute'));
 assert(fs.readFileSync('lib/preparer-ecoute.ts','utf8').includes('corrigerTranscription'));
 const transmission=page.slice(page.indexOf('const dit = recoller(rattrape'),page.indexOf('void askBia(dit, true, monTour, d.suggestions_ecriture);')+75);
 assert(transmission.includes('d.suggestions_ecriture'));
 assert(!transmission.includes('await speak(clarification)'));
});
test('already-open tabs keep a usable transcript even when optional correction storage fails',async()=>{
 const route=load('app/api/ecouter/corriger/route.ts',{
  '@/lib/codes':{verifierCode:()=>({ok:true})},
  '@/lib/correction-transcription':{corrigerTranscription:async()=>{throw Error('offline')}},
  '@/lib/langue':load('lib/langue.ts'),
 });
 const r=await route.POST(new Request('https://bia.test/api/ecouter/corriger',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({texte:'Bonjour, tu es là ?'})}));
 const d=await r.json();assert.equal(r.status,200);assert.equal(d.texte,'Bonjour, tu es là ?');
 assert.equal(d.verification.statut,'conservee');assert.equal(d.verification.verification_contextuelle,false);
});
