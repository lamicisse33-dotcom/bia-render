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
 const server=load('lib/transcription-contextuelle.ts',{'./transcription-contexte-core':core,'./correction-transcription':{corrigerTranscription:async texte=>({texte,texte_brut:texte,corrections_transcription:[],suggestions_ecriture:[]})}});
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
test('all voice entry paths are gated before actions; full and light uploads carry context',()=>{
 const s=fs.readFileSync('app/page.tsx','utf8');
 const ask=s.slice(s.indexOf('const askBia ='),s.indexOf('const askBia =')+7000);
 assert(ask.indexOf('/api/ecouter/corriger')<ask.indexOf('demandeLecture(question)'));
 assert.match(ask,/await arreterSurTranscriptionIncertaine/);
 assert.match(s,/askBia\(transcript, true\)/);
 assert.match(s,/askBia\(dit, true, monTour, true\)/);
 assert.match(s,/forme.append\("historique"/);assert.match(s,/legere.append\("historique"/);
 const audio=s.slice(s.indexOf('const monTour = ouvrirUnTour();',s.indexOf('forme.append("audio"')),s.indexOf('const d = await r.json() as { texte?',s.indexOf('forme.append("audio"')));
 assert(!audio.includes('attendreEnParlant('));assert(!audio.includes('jouerEtAnimer('));assert(!audio.includes('soufflerEnAttendant('));
});
