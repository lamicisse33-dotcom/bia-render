import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(path,req=()=>{throw Error('Unexpected import')}){
 const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id==='./comprehension-conversation'?load('lib/comprehension-conversation.ts'):id==='./rapidite-core'?load('lib/rapidite-core.ts'):id==='./rapidite-etat'?load('lib/rapidite-etat.ts'):req(id),m,m.exports);return m.exports;
}
const tick=()=>new Promise(r=>setTimeout(r,0));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const fileApi=load('lib/briques-file.ts');
const brick=n=>({numero:n,texte:'Brique '+n,audio:'AAAA',voice:'female',langue:'fr'});

test('first brick plays before final transcript; appending cannot replace it or overlap playback',async()=>{
 const f=fileApi.creerFileBriques(),release=deferred(),starts=[];let active=0,max=0;
 f.ajouter(brick(0));
 const played=f.lire({signal:new AbortController().signal,taire(){},attente(){assert.fail('no long gap');},mesure(){},jouer:async b=>{starts.push(b.texte);max=Math.max(max,++active);if(b.numero===0)await release.promise;active--;return true;}});
 assert.deepEqual(starts,['Brique 0']);
 f.ajouter({...brick(0),texte:'replacement forbidden'});f.ajouter(brick(1));f.fermer();
 assert.deepEqual(starts,['Brique 0']);release.resolve();assert.equal(await played,'Brique 0 Brique 1');assert.equal(max,1);
});
test('late correction stays in the next brick; no missing index accepted',async()=>{
 const f=fileApi.creerFileBriques();f.ajouter(brick(0));assert.throws(()=>f.ajouter(brick(2)),/manquante/);
 f.ajouter({...brick(1),texte:'Tu précises finalement que le cordonnier était fermé.'});f.fermer();
 const said=await f.lire({signal:new AbortController().signal,jouer:async()=>true,attente(){},taire(){},mesure(){}});
 assert.equal(said,'Brique 0 Tu précises finalement que le cordonnier était fermé.');
});
test('one optional reflection per long gap, stopped before actual reply, never counted as first sound',async()=>{
 const f=fileApi.creerFileBriques(),events=[],gap=deferred();f.ajouter(brick(0));
 const done=f.lire({signal:new AbortController().signal,delai:5,jouer:async b=>{events.push('play'+b.numero);return true;},attente(){events.push('hmm');gap.resolve();},taire(){events.push('stop-hmm');},mesure(){events.push('gap');}});
 await gap.promise;f.ajouter(brick(1));f.fermer();await done;
 assert.equal(events.filter(x=>x==='hmm').length,1);assert(events.indexOf('hmm')>events.indexOf('play0'));
 assert.equal(events[events.indexOf('play1')-1],'stop-hmm');
});
test('interrupting a waiting queue immediately releases it and prevents future bricks',async()=>{
 const f=fileApi.creerFileBriques(),abort=new AbortController(),played=[];f.ajouter(brick(0));
 const done=f.lire({signal:abort.signal,jouer:async b=>{played.push(b.numero);return true;},attente(){assert.fail('cancelled filler');},taire(){},mesure(){}});
 await tick();abort.abort();f.ajouter(brick(1));assert.equal(await done,'Brique 0');assert.deepEqual(played,[0]);
});

function server(answer,options={}){
 delete globalThis.biaBriques;const models=[],syntheses=[],state={},saved=[];let quota=0;
 const core=load('lib/anticipation-core.ts',id=>id==='./seuils-anticipation'?{signesAnticipation:()=>20}:crypto);
 const api=load('lib/briques-reponse.ts',id=>{
  if(id==='node:crypto')return crypto;if(id==='next/server')return {NextRequest:Request};
  if(id==='./codes')return {verifierCode:(code,compter)=>{if(compter)quota++;return {ok:true,maitre:true};}};
  if(id==='./souvenirs')return {garder:async d=>saved.push(d)};
  if(id==='./identite-core')return load('lib/identite-core.ts',dep=>load('lib/'+dep.slice(2)+'.ts'));
  if(id==='./salutations-dialogue')return load('lib/salutations-dialogue.ts',dep=>load('lib/'+dep.slice(2)+'.ts'));
  if(id==='./anticipation-core')return core;
  if(id==='./seuils-anticipation')return {premierSegmentMs:()=>600,segmentMs:()=>1500,attenteEnvoiMs:()=>800,patienceBriqueMs:()=>1200,signesAnticipation:()=>20,teteCourteSignes:()=>20,phraseLongueSignes:()=>70};
  if(id==='./eligibilite-etat')return {noterRefusServeur(){},noterEligibilite(){},resumeEligibilite:()=>({})};
  if(id==='./briques-etat')return {etatBriques:state};
  if(id==='./anticipation-gpu')return {gpuAnticipation:async f=>f()};
  if(id==='./cerveau-anthropic')return {MODELE_SONNET:'test',MODELE_HAIKU:'test-haiku',modeleBriques:()=>'test-haiku',messagesAnthropic:messages=>({messages}),contenuAnthropic:d=>d.text,fetchAnthropic:async(u,init)=>{
   const request=JSON.parse(init.body),context=JSON.parse(request.messages.at(-1).content);models.push(context);options.modele?.(request);
   const result=answer?await answer(context,init.signal):{eligible:true,reply:context.fin_de_parole?'Tu as finalement payé trois mille francs.':'Tu as profité de ta sortie pour faire réparer tes chaussures.',traite:context.texte_integral};
   if(request.output_config.format.schema.properties.traite.type==='integer'&&typeof result.traite==='string')result.traite=result.traite.split(' ').length;
   return Response.json({text:JSON.stringify(result)});
  }};
  if(id==='./briques-audio')return load('lib/briques-audio.ts');
  if(id==='./briques-prompt')return load('lib/briques-prompt.ts');
  if(id==='./conversation-groq')return {messagesConversation:o=>[{role:'system',content:JSON.stringify(o)}]};
  if(id==='./memoire-organisee')return {contexteMemoireCommune:async()=>''};if(id==='./instructions-apprentissage')return {contexteInstructions:async()=>''};
  if(id==='./langue')return {detecterLangue:()=> 'fr'};if(id==='./assembler-sons-courants')return {assemblerSonsCourants:()=>({wav:new ArrayBuffer(1200)})};
  if(id.includes('chatterbox-test'))return {POST:async req=>{const body=await req.json();syntheses.push(body);if(options.synthese)await options.synthese(body,syntheses.length-1,req.signal);return new Response(JSON.stringify({type:'morceau',audio:Buffer.alloc(1200).toString('base64'),partie:0,parties:1,empreinte:'stable',voice:'female'})+'\n'+JSON.stringify({type:'fin'})+'\n');}};
  throw Error(id);
 });return {...api,models,syntheses,saved,quota:()=>quota};
}
const question='En allant au marché je suis passé chez le cordonnier pour refaire mes chaussures.';
const body={texte:question,tour:'test-briques-123',history:[{role:'bia',text:'Bonjour papa.'}],resume:'',voice:'female',persona:'bia'};
test('a chain of greetings cannot start paid brick generation before the local opening',async()=>{
 const s=server(),signal=new AbortController().signal;
 const r=await s.preparerBrique({...body,texte:'Bonjour bonjour salut comment allez-vous ?'},'owner',true,signal);
 assert.equal(r,null);assert.equal(s.models.length,0);assert.equal(s.syntheses.length,0);
});
test('opening addresses are spoken only on the first brick and reset for a new answer',async()=>{
 const replies=['Oui papa, tes chaussures sont réparées.','D’accord papa, le coiffeur suivait le match.','Oui, papa ! Tu as obtenu le prix habituel.'];
 const s=server(c=>({eligible:true,reply:replies[c.briques_verrouillees.length],traite:c.texte_integral})),signal=new AbortController().signal;
 const first=await s.preparerBrique(body,'owner',true,signal),locked=JSON.stringify(first.brique);
 const suite=question+' Ensuite je suis passé chez le coiffeur pour me coiffer.';
 const second=await s.preparerBrique({id:first.id,texte:suite},'owner',true,signal);
 const third=await s.preparerBrique({id:first.id,texte:suite+' Puis le chargeur coûtait trois mille francs.',final:true},'owner',true,signal);
 assert.deepEqual(s.syntheses.map(x=>x.texte),[replies[0],'le coiffeur suivait le match.','Tu as obtenu le prix habituel.']);
 assert.equal(second.brique.texte,s.syntheses[1].texte);assert.equal(third.brique.texte,s.syntheses[2].texte);
 assert.equal(JSON.stringify(first.brique),locked);assert.equal(s.models.length,3,'no extra model request');
 const next=await s.preparerBrique({...body,tour:'test-new-answer'},'owner',true,signal);
 assert.equal(next.brique.texte,replies[0]);
});
test('continuation cleanup preserves substantive speech, quotations and learned Wolof',()=>{
 const {enchainerBrique}=load('lib/briques-prompt.ts');
 for(const text of ['Oui papa, tes chaussures sont réparées.','D’accord papa ! Tu as bien négocié.','Bien sûr papa : le coiffeur suivait le match.']){
  assert.equal(enchainerBrique(text,0),text);assert(!/papa/i.test(enchainerBrique(text,1)));
 }
 for(const text of ['Le commerçant a dit « Oui papa ».','Oui, le chargeur coûtait trois mille francs.','Papa est allé au marché.','Jërëjëf, ba beneen yoon.'])assert.equal(enchainerBrique(text,1),text);
});
test('server keeps locked audio, appends late corrections, charges once and persists only delivered speech',async()=>{
 const s=server(),signal=new AbortController().signal;
 const first=await s.preparerBrique(body,'owner',true,signal);assert(first.brique);const locked=JSON.stringify(first.brique);assert.equal(s.quota(),0);
 const final=question+' Finalement, le cordonnier était fermé. Au marché le chargeur est passé de quinze mille à trois mille francs.';
 const next=await s.preparerBrique({id:first.id,texte:final,final:true},'owner',true,signal);
 assert(next.termine);assert.equal(next.brique.numero,1);assert.equal(JSON.stringify(first.brique),locked);
 assert.equal(s.models[1].briques_verrouillees[0],first.brique.texte);assert.equal(s.syntheses.length,2);assert.equal(s.quota(),1);assert.equal(s.saved.length,0);
 await s.preparerBrique({id:first.id,action:'livree',nombre:2},'owner',true,signal);
 await s.preparerBrique({id:first.id,action:'livree',nombre:2},'owner',true,signal);
 assert.equal(s.saved.length,1);assert.equal(s.saved[0].dit,final);assert.equal(s.saved[0].repondu,first.brique.texte+' '+next.brique.texte);
});
test('a different account cannot read, append or deliver another conversation; actions keep ordinary routing',async()=>{
 const s=server(),signal=new AbortController().signal,first=await s.preparerBrique(body,'owner',true,signal);
 await assert.rejects(s.preparerBrique({id:first.id,texte:question,final:true},'other',true,signal),/inconnue/);
 const end=await s.preparerBrique({id:first.id,texte:question+' Mémorise ma nouvelle adresse.',final:true},'owner',true,signal);
 assert(end.normal);assert.equal(s.syntheses.length,1);assert.equal(s.quota(),0);
});
test('sequential conversations are not disabled after four completed turns',async()=>{
 const s=server(),signal=new AbortController().signal;
 for(let i=0;i<6;i++){
  const first=await s.preparerBrique({...body,tour:'test-briques-'+i},'owner',true,signal);assert(first?.brique);
  await s.preparerBrique({id:first.id,texte:question,final:true},'owner',true,signal);
 }
 assert.equal(s.quota(),6);
});
test('client consumes queued audio while final generation is still pending',async()=>{
 const original=globalThis.fetch,finalRequest=deferred(),started=[];let calls=0;
 globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);calls++;if(b.final){await finalRequest.promise;return Response.json({preparation:{id:'session',brique:brick(1),termine:true}});}return Response.json({preparation:{id:'session',brique:brick(0)}});};
 try{
  const api=load('lib/briques-client.ts',()=>fileApi),p=api.creerProducteurBriques({...body,code:'owner',actuel:()=>true});
  p.progresser(question);await tick();p.arreterEcoute();
  const reading=p.commencer({signal:new AbortController().signal,jouer:async b=>{started.push(b.numero);return true;},attente(){},taire(){},mesure(){}});assert(reading);assert.deepEqual(started,[0]);
  const finishing=p.terminer(question+' Je suis ensuite allé au marché.');await tick();assert.equal(calls,2);assert.deepEqual(started,[0]);
  finalRequest.resolve();await finishing;const r=await reading.fin;assert.equal(r.reponse,'Brique 0 Brique 1');assert.equal(r.normal,false);
 }finally{globalThis.fetch=original;}
});

test('the actual default portrait can activate silent preparation; other exclusions remain explicit',()=>{
 const text=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let definition;
 function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='personnageAuDemarrage')definition=n.getText(ast);ts.forEachChild(n,walk);}walk(ast);assert(definition);
 const choisir=new Function(ts.transpileModule(definition,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';return personnageAuDemarrage;')();
 const values=new Map(),persona=choisir({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)});assert.equal(persona,'rara');
 const {exclusionAnticipation}=load('lib/activation-anticipation.ts');
 const context={persona,voixCompatible:true,desactivee:false,apprentissage:false,correctionDevoir:false,correctionListe:false,prenom:false,reprise:false};
 assert.equal(exclusionAnticipation(context),'');assert.equal(exclusionAnticipation({...context,persona:'bia'}),'');
 for(const [flag,reason] of [['apprentissage','apprentissage'],['correctionDevoir','correction_devoir'],['correctionListe','correction_liste'],['prenom','prenom'],['reprise','reprise'],['desactivee','desactivee']])assert.equal(exclusionAnticipation({...context,[flag]:true}),reason);
 assert.equal(exclusionAnticipation({...context,voixCompatible:false}),'voix_incompatible');
});
test('server prepares both locked bricks with the default portrait and selected voice',async()=>{
 const s=server(),signal=new AbortController().signal;
 const first=await s.preparerBrique({...body,persona:'rara'},'owner-default',true,signal);
 assert(first?.brique);const locked=JSON.stringify(first.brique);
 const next=await s.preparerBrique({id:first.id,texte:question+' Ensuite je suis passé chez le coiffeur pour me coiffer.',final:true},'owner-default',true,signal);
 assert(next?.termine);assert(next.brique);assert.equal(JSON.stringify(first.brique),locked);
 assert.equal(s.syntheses.length,2);assert(s.syntheses.every(x=>x.voice===body.voice));
});
test('capture telemetry distinguishes default appearance from a real learning exclusion',()=>{
 delete globalThis.biaProtectionParole;
 const api=load('lib/protection-parole-etat.ts');
 api.noterProtectionParole({type:'capture_progressive',etape:'branchee',motif:'',apparence:'rara'});
 assert.equal(api.resumeProtectionParole().captures.branchee,1);
 assert.equal(api.resumeProtectionParole().derniere_capture.apparence,'rara');
 api.noterProtectionParole({type:'capture_progressive',etape:'contexte_exclu',motif:'correction_devoir',apparence:'rara'});
 assert.equal(api.resumeProtectionParole().motifs_exclusion.correction_devoir,1);
});


test('an unfinished first preparation survives microphone closure and plays before final ASR',async()=>{
 const original=globalThis.fetch,firstReady=deferred(),finalReady=deferred(),started=[];
 globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);if(b.final){await finalReady.promise;return Response.json({preparation:{id:'session',brique:brick(1),termine:true}});}await firstReady.promise;return Response.json({preparation:{id:'session',brique:brick(0)}});};
 try{
  const p=load('lib/briques-client.ts',()=>fileApi).creerProducteurBriques({...body,code:'owner',actuel:()=>true});
  p.progresser(question);p.arreterEcoute();assert.deepEqual(p.etat(),{pretes:0,en_cours:true});
  const reading=p.commencer({signal:new AbortController().signal,jouer:async b=>{started.push(b.numero);return true;},attente(){},taire(){},mesure(){}});assert(reading);assert.deepEqual(started,[]);
  firstReady.resolve();await tick();assert.deepEqual(started,[0],'must play without waiting for terminer / final ASR');
  const finishing=p.terminer(question+' Ensuite je suis allé chez le coiffeur.');await tick();assert.deepEqual(started,[0]);
  finalReady.resolve();await finishing;assert.equal((await reading.fin).reponse,'Brique 0 Brique 1');
 }finally{globalThis.fetch=original;}
});
test('pending ineligible preparation returns to ordinary chat without silence-loop or fabricated speech',async()=>{
 const original=globalThis.fetch,firstReady=deferred();
 globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);if(b.action)return Response.json({});await firstReady.promise;return Response.json({preparation:null});};
 try{
  const p=load('lib/briques-client.ts',()=>fileApi).creerProducteurBriques({...body,code:'owner',actuel:()=>true});
  p.progresser(question);p.arreterEcoute();
  const reading=p.commencer({signal:new AbortController().signal,jouer:async()=>assert.fail('no audio exists'),attente(){assert.fail('no filler before first brick');},taire(){},mesure(){}});assert(reading);
  const finishing=p.terminer(question);firstReady.resolve();await finishing;
  assert.deepEqual(await reading.fin,{reponse:'',normal:true});
 }finally{globalThis.fetch=original;}
});
test('a cancelled pending preparation can never speak in a new turn',async()=>{
 const original=globalThis.fetch,firstReady=deferred();
 globalThis.fetch=async()=>{await firstReady.promise;return Response.json({preparation:{id:'session',brique:brick(0)}});};
 try{
  const p=load('lib/briques-client.ts',()=>fileApi).creerProducteurBriques({...body,code:'owner',actuel:()=>true});
  p.progresser(question);p.arreterEcoute();const abort=new AbortController();
  const reading=p.commencer({signal:abort.signal,jouer:async()=>assert.fail('obsolete audio'),attente(){},taire(){},mesure(){}});
  abort.abort();firstReady.resolve();assert.equal((await reading.fin).reponse,'');await tick();assert.equal(p.etat().pretes,0);
 }finally{globalThis.fetch=original;}
});
test('all already transcribed points can be prepared silently without waiting for more words',async()=>{
 const original=globalThis.fetch;let calls=0;const started=[];
 globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);if(b.final)return Response.json({preparation:{id:'session',termine:true}});const n=calls++;return Response.json({preparation:{id:'session',brique:brick(n),continuer:n===0}});};
 try{
  const p=load('lib/briques-client.ts',()=>fileApi).creerProducteurBriques({...body,code:'owner',actuel:()=>true});
  p.progresser(question+' Puis je suis passé chez le coiffeur pour me coiffer.');await tick();await tick();
  assert.equal(calls,2);assert.deepEqual(started,[]);assert.equal(p.etat().pretes,2);p.arreterEcoute();
  const reading=p.commencer({signal:new AbortController().signal,jouer:async b=>{started.push(b.numero);return true;},attente(){},taire(){},mesure(){}});
  await p.terminer(question);assert.equal((await reading.fin).reponse,'Brique 0 Brique 1');assert.deepEqual(started,[0,1]);
 }finally{globalThis.fetch=original;}
});
test('server drains an unprocessed point from the same transcript and accepts a revised final transcript',async()=>{
 const combined=question+' Ensuite je suis passé chez le coiffeur pour me coiffer.';
 const s=server(c=>({eligible:true,reply:c.prefixe_deja_traite?'Tu précises la suite de ta journée.':'Tu as fait réparer tes chaussures.',traite:c.prefixe_deja_traite?c.texte_integral:question})),signal=new AbortController().signal;
 const first=await s.preparerBrique({...body,texte:combined},'owner',true,signal),locked=JSON.stringify(first.brique);assert(first.continuer);
 const second=await s.preparerBrique({id:first.id,texte:combined},'owner',true,signal);assert.equal(second.brique.numero,1);assert(!second.continuer);
 const revision='En fait je suis passé chez le coiffeur avant le cordonnier.';
 const last=await s.preparerBrique({id:first.id,texte:revision,final:true},'owner',true,signal);
 assert.equal(last.brique.numero,2);assert(last.termine);assert.equal(last.normal,false);assert.equal(JSON.stringify(first.brique),locked);
});
test('buying a charger in a story remains eligible, while instructions still retain normal routing',async()=>{
 const core=load('lib/anticipation-core.ts',id=>id==='./seuils-anticipation'?{signesAnticipation:()=>20}:crypto);
 assert(core.eligibleBriques('Après le coiffeur je suis parti au marché pour acheter un chargeur.'));
 assert(core.eligibleBriques('Finalement, le chargeur coûtait trois mille francs.'));
 assert(core.eligibleBriques('Je me corrige : le chargeur coûtait trois mille francs.'));
 assert(!core.eligibleBriques('Mémorise cette phrase pour la prochaine conversation.'));
 assert(!core.eligibleBriques('Peux-tu acheter un chargeur pour mon téléphone demain ?'));
 const s=server(),r=await s.preparerBrique({...body,texte:question+' Je suis ensuite allé acheter un chargeur.'},'owner',true,new AbortController().signal);assert(r.brique);
});
test('departure telemetry separates ready, still running, and absent preparation',()=>{
 delete globalThis.biaBriquesEtat;const a=load('lib/briques-etat.ts',id=>id==='./seuils-anticipation'?{premierSegmentMs:()=>600,segmentMs:()=>1500,attenteEnvoiMs:()=>800,patienceBriqueMs:()=>1200,signesAnticipation:()=>20,teteCourteSignes:()=>20,phraseLongueSignes:()=>70}:load('lib/reflexion-courte.ts'));
 /* Le quatrième choix du 23 octobre : un départ qui parie sur la
    transcription finale ne doit pas se confondre avec `sans_preparation`. */
 a.noterBriques({etape:'depart',ms:0,pretes:0,en_cours:0,finale:1});
 a.noterBriques({etape:'depart',ms:0,pretes:2,en_cours:1});a.noterBriques({etape:'depart',ms:0,pretes:0,en_cours:1});a.noterBriques({etape:'depart',ms:0,pretes:0,en_cours:0});
 assert.deepEqual(a.resumeBriques().departs,{sur_transcription_finale:1,prete:1,en_fabrication:1,sans_preparation:1});
 /* Le relevé rend ce que le serveur a décidé, pas une valeur gravée ici :
    le décor dit 600 (levier 2 du 25 octobre), et la taille des segments
    voyage avec — sans elle, le téléphone retombait sur 4 000 sans le dire. */
 assert.equal(a.resumeBriques().premier_segment_apres_ms,600);
 assert.equal(a.resumeBriques().segment_ms,1500);
 assert.equal(a.resumeBriques().seuil_signes_anticipation,20);
});

test('compact word positions reject invalid boundaries before synthesis and keep exact Unicode words',async()=>{
 for(const index of [-1,0,1.5,999]){
  const s=server(c=>({eligible:true,reply:'Une réponse complète.',traite:index}));
  await assert.rejects(s.preparerBrique(body,'owner',true,new AbortController().signal),/invalide/);assert.equal(s.syntheses.length,0);
 }
 const texte='Je suis passé chez le cordonnier. Puis je suis passé chez le coiffeur pour me faire couper les cheveux.';
 const s=server(c=>({eligible:true,reply:'Tu as fait réparer tes chaussures.',traite:6}));
 const r=await s.preparerBrique({...body,texte},'owner',true,new AbortController().signal);assert(r.brique);assert(r.continuer);
 assert.deepEqual(s.models[0].positions[5],[6,'cordonnier.']);
});
test('final points are synthesized one at a time and charged only after the last point',async()=>{
 const a=question,b=a+' Ensuite je suis allé chez le coiffeur.',c=b+' Puis le chargeur coûtait trois mille francs.';
 const s=server(ctx=>({eligible:true,reply:'Une phrase complète sur le prochain point.',traite:!ctx.prefixe_deja_traite?a:ctx.prefixe_deja_traite===a?b:c})),signal=new AbortController().signal;
 const first=await s.preparerBrique({...body,texte:c},'owner',true,signal);const locked=JSON.stringify(first.brique);
 const next=await s.preparerBrique({id:first.id,texte:c,final:true},'owner',true,signal);assert(!next.termine);assert.equal(next.brique.numero,1);assert.equal(s.quota(),0);
 const last=await s.preparerBrique({id:first.id,texte:c,final:true},'owner',true,signal);assert(last.termine);assert.equal(last.brique.numero,2);assert.equal(s.quota(),1);assert.equal(JSON.stringify(first.brique),locked);
});
test('ASR without a prepared or running brick takes ordinary chat without a preliminary model call',async()=>{
 const original=globalThis.fetch;let calls=0;
 /* La déclaration des portes part vers /api/mesure : ce n'est pas une demande
    de brique, et c'est elle qui dit pourquoi rien n'a été préparé. L'intention
    de l'épreuve — aucun appel au modèle avant le chat ordinaire — est gardée
    telle quelle. */
 globalThis.fetch=async(url)=>{if(String(url)==='/api/mesure')return {ok:true,json:async()=>({ok:true})};calls++;assert.fail('no final brick request before ordinary chat');};
 try{
  const p=load('lib/briques-client.ts',()=>fileApi).creerProducteurBriques({...body,code:'owner',actuel:()=>true});p.arreterEcoute();
  const reading=p.commencer({signal:new AbortController().signal,jouer:async()=>assert.fail('no prepared audio'),attente(){},taire(){},mesure(){}});assert.equal(reading,null);
  await p.terminer(question);assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('focused prompt preserves complete teaching instructions and exact memory without duplicating the question',()=>{
 const {messagesBriques}=load('lib/briques-prompt.ts');const instructions='Règle précise du maître. '.repeat(400),memoire='BIA-SPO-001 : formulation wolof exactement validée.';
 const m=messagesBriques({maitre:true,instructions,memoire,resume:'Un contexte donné.',history:[{role:'user',content:'Une question précédente.'}]});
 assert(m.some(x=>x.content.endsWith(instructions)));assert(m.some(x=>x.content.includes(memoire)));assert.equal(m.filter(x=>x.role==='user').length,1);assert(m[0].content.includes('papa'));assert(m[0].content.includes('Ton nom est Bia'));
});


test('continuous brick audio keeps one complete ordered pronunciation plan and requires explicit end',async()=>{
 const {lireAudioBrique}=load('lib/briques-audio.ts'),signal=new AbortController().signal;
 const frame=n=>({type:'morceau',partie:n,parties:2,empreinte:'stable',voice:'female',audio:Buffer.from('son '+n).toString('base64'),preparation_ms:350,generation_ms:800,fabrication_ms:1000});
 const valid=[frame(0),frame(1),{type:'fin'}];
 const response=events=>{const bytes=new TextEncoder().encode(events.map(x=>JSON.stringify(x)).join('\n')+'\n');return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}));};
 const a=await lireAudioBrique(response(valid),'female',signal);assert.equal(a.clips.length,2);assert.equal(a.preparation_ms,350,'pronunciation preparation is counted once');assert.equal(a.generation_ms,1600);assert.equal(Buffer.from(a.clips[0]).toString(),'son 0');
 for(const broken of [[frame(0),frame(1)],[frame(0),{type:'fin'}],[frame(1),frame(0),{type:'fin'}],[frame(0),{...frame(1),voice:'male'},{type:'fin'}],[frame(0),{...frame(1),empreinte:'changed'},{type:'fin'}]])await assert.rejects(lireAudioBrique(response(broken),'female',signal),/incomplet/);
});
test('cancelling continuous brick audio releases the reader without returning a partial brick',async()=>{
 const {lireAudioBrique}=load('lib/briques-audio.ts'),abort=new AbortController();let cancelled=false;
 const response=new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(JSON.stringify({type:'morceau',partie:0,parties:2,empreinte:'stable',voice:'female',audio:'AAAA'})+'\n'));},cancel(){cancelled=true;}}));
 const result=lireAudioBrique(response,'female',abort.signal);await tick();abort.abort();await assert.rejects(result);assert(cancelled);
});


for(const final of [false,true])test(`next text is ready during current audio, reused once and never synthesized early (final=${final})`,async()=>{
 const audio=deferred(),nextText=deferred(),events=[];
 const combined=question+' Ensuite je suis allé chez le coiffeur.';
 const s=server(async c=>{
  events.push('model'+c.briques_verrouillees.length);
  if(c.briques_verrouillees.length===1)await nextText.promise;
  return {eligible:true,reply:c.briques_verrouillees.length?'D’accord papa, tu es ensuite allé chez le coiffeur.':'Oui papa, tes chaussures sont réparées.',traite:c.briques_verrouillees.length?combined:question};
 },{synthese:async(_b,n)=>{events.push('audio'+n);if(n===0)await audio.promise;}});
 const firstPending=s.preparerBrique({...body,texte:combined,final},'owner',true,new AbortController().signal);
 await tick();assert(events.includes('model1'),'next model must run before first audio completes');
 assert.equal(s.syntheses.length,1,'no speculative audio');assert.equal(s.saved.length,0);assert.equal(s.quota(),0);
 nextText.resolve();await tick();audio.resolve();const first=await firstPending;
 assert.equal(first.brique.numero,0);assert(!first.termine);
 const second=await s.preparerBrique({id:first.id,texte:combined,final},'owner',true,new AbortController().signal);
 assert.equal(second.mesure.modele_anticipe,true);assert.equal(s.models.length,2,'prefetch must replace the next model call');
 assert.equal(second.brique.numero,1);assert.equal(second.brique.texte,'tu es ensuite allé chez le coiffeur.');assert.equal(second.termine,final);assert.equal(s.quota(),final?1:0);
});
test('finalization does not reuse text prefetched under the still-speaking rules',async()=>{
 const combined=question+' Ensuite je suis allé chez le coiffeur.';
 const s=server(c=>({eligible:true,reply:c.fin_de_parole?'La phrase finale prend en compte la fin.':'Une réponse sans conclusion prématurée.',traite:c.prefixe_deja_traite?combined:question}));
 const first=await s.preparerBrique({...body,texte:combined},'owner',true,new AbortController().signal);await tick();
 const next=await s.preparerBrique({id:first.id,texte:combined,final:true},'owner',true,new AbortController().signal);
 assert.equal(next.mesure.modele_anticipe,false);assert.equal(next.brique.texte,'La phrase finale prend en compte la fin.');assert.equal(s.syntheses.length,2);
});
test('a revised final transcript aborts a pending look-ahead and uses the correction instead',async()=>{
 const pending=deferred();let pendingSignal;
 const combined=question+' Ensuite je suis allé chez le coiffeur.';
 const correction='Finalement le cordonnier était fermé et je suis rentré chez moi.';
 const s=server(async(c,signal)=>{
  if(c.prefixe_deja_traite&&c.texte_integral===combined){pendingSignal=signal;await pending.promise;}
  return {eligible:true,reply:c.texte_integral===correction?'Tu précises que le cordonnier était fermé.':'Tes chaussures sont réparées.',traite:c.prefixe_deja_traite?c.texte_integral:question};
 });
 const first=await s.preparerBrique({...body,texte:combined,final:true},'owner',true,new AbortController().signal);await tick();
 const last=await s.preparerBrique({id:first.id,texte:correction,final:true},'owner',true,new AbortController().signal);
 assert(pendingSignal.aborted);assert.equal(last.mesure.modele_anticipe,false);assert.equal(last.brique.texte,'Tu précises que le cordonnier était fermé.');
 pending.resolve();await tick();assert.equal(s.syntheses.length,2,'discarded draft cannot produce audio');
});
test('cancelling a session aborts its pending next text and prevents any later audio',async()=>{
 let pendingSignal;const pending=deferred();const combined=question+' Ensuite je suis allé chez le coiffeur.';
 const s=server(async(c,signal)=>{if(c.prefixe_deja_traite){pendingSignal=signal;await pending.promise;}return {eligible:true,reply:'Tes chaussures sont réparées.',traite:c.prefixe_deja_traite?combined:question};});
 const first=await s.preparerBrique({...body,texte:combined,final:true},'owner',true,new AbortController().signal);await tick();
 const next=s.preparerBrique({id:first.id,texte:combined,final:true},'owner',true,new AbortController().signal);await tick();
 await s.preparerBrique({id:first.id,action:'annuler'},'owner',true,new AbortController().signal);
 assert(pendingSignal.aborted);pending.resolve();await assert.rejects(next,/annulée/);assert.equal(s.syntheses.length,1);assert.equal(s.quota(),0);
});
test('a failed look-ahead falls back to the ordinary model request without losing a point',async()=>{
 let failed=false;const combined=question+' Ensuite je suis allé chez le coiffeur.';
 const s=server(c=>{if(c.prefixe_deja_traite&&!failed){failed=true;throw Error('temporary model failure');}return {eligible:true,reply:'Une phrase complète sur ce point.',traite:c.prefixe_deja_traite?combined:question};});
 const first=await s.preparerBrique({...body,texte:combined,final:true},'owner',true,new AbortController().signal);
 const last=await s.preparerBrique({id:first.id,texte:combined,final:true},'owner',true,new AbortController().signal);
 assert(last.termine);assert.equal(last.brique.numero,1);assert.equal(s.models.length,3);assert.equal(s.syntheses.length,2);assert.equal(s.quota(),1);
});


test('a transient startup failure permits one authenticated diagnostic retry, then stops',async()=>{
 const previous=process.env.BIA_CODE_MAITRE;process.env.BIA_CODE_MAITRE='test-only';let calls=0;const state={};
 try{
  const api=load('lib/essai-briques.ts',id=>{
   if(id==='./briques-reponse')return {preparerBrique:async()=>{calls++;throw Error('Instructions Supabase inaccessibles');}};
   if(id==='./briques-etat')return {etatBriques:state};if(id==='node:crypto')return crypto;throw Error(id);
  });
  await api.verifierBriques();assert.equal(state.essai.tentatives,1);assert.equal(state.essai.motif,'Instructions Supabase inaccessibles');
  await api.verifierBriques();assert.equal(state.essai.tentatives,2);await api.verifierBriques();assert.equal(calls,2);
  state.essai={statut:'confirme',tentatives:1};await api.verifierBriques();assert.equal(calls,2);
 }finally{if(previous===undefined)delete process.env.BIA_CODE_MAITRE;else process.env.BIA_CODE_MAITRE=previous;}
});



test('an experimental brick session uses Haiku and cannot be resumed under another profile',async()=>{
 const modeles=[];const s=server(null,{modele:r=>modeles.push(r.model)}),signal=new AbortController().signal;
 const first=await s.preparerBrique({...body,essaiRapidite:'haiku'},'owner',true,signal);assert(first?.brique);
 assert.equal(modeles[0],'claude-haiku-5-5');
 await assert.rejects(s.preparerBrique({id:first.id,texte:question,final:true,essaiRapidite:'sonnet'},'owner',true,signal),/Session inconnue/);
 const fin=await s.preparerBrique({id:first.id,texte:question,final:true,essaiRapidite:'haiku'},'owner',true,signal);assert(fin.termine);
});

/* ── SEPT RÈGLES SOUS UN SEUL NOM ─────────────────────────────────────────
   Mesuré le 25 octobre : sessions 7, préparées 3, ERREURS 2, dernier_echec
   « Brique invalide » après 1 499 ms — sans dire laquelle des sept règles le
   modèle avait enfreinte. Un refus sans nom est un refus qu'on cherchera
   encore dans six jours. */
test('chaque règle de validation d’une brique porte son nom',()=>{
 const code=fs.readFileSync('lib/briques-reponse.ts','utf8');
 const raisons=[...code.matchAll(/refuser\('([a-z_]+)'\)/g)].map(m=>m[1]);
 /* Les sept règles de la condition composée d'avant, une par une. */
 for(const attendue of ['mots_traites_hors_bornes','traite_pas_prefixe_du_texte',
  'aucun_progres_depuis_la_brique_precedente','reponse_trop_courte',
  'reponse_trop_longue','balise_decran_dans_la_reponse',
  'finale_ne_couvre_pas_le_texte'])
  assert.ok(raisons.includes(attendue),'règle sans nom : '+attendue);
 /* Et plus aucune condition composée qui jetterait sept cas sous un nom. */
 assert.ok(!/\|\|.*\|\|.*\|\|.*throw Error\('Brique invalide'\)/.test(code),
  'une condition composée remettrait sept raisons sous un seul nom');
 /* La raison doit être comptée, pas seulement affichée une fois. */
 assert.match(code,/motifs_invalides\[raison\]/);
});

/* ── QUI TUE LA PRÉPARATION ? ─────────────────────────────────────────────
   Le 25 octobre : erreurs 3, « Modèle indisponible », annulé: true, à
   801 ms — sans dire QUI avait annulé. Quatre chemins y mènent, et ils
   n'appellent pas le même remède. Un arrêt sans nom est un arrêt qu'on
   cherchera encore demain. */
test('chaque annulation d’une préparation porte son nom',()=>{
 const code=fs.readFileSync('lib/briques-client.ts','utf8');
 const raisons=[...code.matchAll(/arreterLaPreparation\('([a-z_]+)'\)/g)].map(m=>m[1]);
 for(const attendue of ['erreur_de_fabrication','lecture_abandonnee',
  'rien_de_pret_a_la_fermeture'])
  assert.ok(raisons.includes(attendue),'annulation sans nom : '+attendue);
 /* Plus aucun abort nu : tous passent par la fonction qui nomme. */
 const nus=[...code.matchAll(/(?<!arreterLaPreparation\([^)]*\);\s*)abort\.abort\(\)/g)];
 assert.ok(code.indexOf('function arreterLaPreparation')>0,'la fonction doit exister');
 assert.equal((code.match(/abort\.abort\(\)/g)||[]).length,1,
  'un seul abort, dans la fonction qui le nomme');
 /* Et la DURÉE est notée : tuer une préparation de 800 ms n’est pas la même
    décision que d’en tuer une qui vient de commencer. */
 assert.match(code,/ms:debutPreparation\?Date\.now\(\)-debutPreparation:0/);
});

test('le relevé range les annulations par raison, avec leurs durées',()=>{
 delete globalThis.biaBriquesEtat;
 /* briques-etat lit les seuils publiés par le serveur ; ici on éprouve le
    rangement des annulations, pas les seuils. */
 const e=load('lib/briques-etat.ts',id=>({
  premierSegmentMs:()=>600,segmentMs:()=>1500,attenteEnvoiMs:()=>800,patienceBriqueMs:()=>1200,signesAnticipation:()=>20,teteCourteSignes:()=>20,
  briquesSurTranscriptionFinale:()=>false,REFLEXION_COURTE:{attente_ms:1200,volume:0.35},
 }));
 e.noterBriques({etape:'preparation_tuee',raison:'rien_de_pret_a_la_fermeture',ms:801,en_vol:1});
 e.noterBriques({etape:'preparation_tuee',raison:'rien_de_pret_a_la_fermeture',ms:640,en_vol:1});
 e.noterBriques({etape:'preparation_tuee',raison:'fin_du_tour_sur_la_page',ms:120,en_vol:0});
 const r=e.resumeBriques().preparations_tuees;
 assert.equal(r.rien_de_pret_a_la_fermeture.fois,2);
 assert.deepEqual(r.rien_de_pret_a_la_fermeture.ms_median,[801,640]);
 assert.equal(r.fin_du_tour_sur_la_page.fois,1);
 /* Un nom inventé ne doit pas faire tomber le relevé. */
 e.noterBriques({etape:'preparation_tuee',ms:50});
 assert.equal(e.resumeBriques().preparations_tuees.sans_nom.fois,1);
});

/* ── L'ORDRE ÉTAIT LE DÉFAUT, ET MON CHANTIER 02 L'AVAIT CRÉÉ ─────────────

   Mesuré le 25 octobre, `preparations_tuees` :
     rien_de_pret_a_la_fermeture × 7   durées [2464, 1, 1, 1, 1, 2, 0]
     départs sans_preparation 7, lectures 0

   SIX SUR SEPT TUÉES À UNE MILLISECONDE. La transcription livrée après la
   fermeture — gain du chantier 02 — déclenchait `lancer()`, mais
   `commencer()` venait de rendre la main en disant « rien de prêt », et la
   ligne suivante tuait ce que la précédente démarrait. */
test('la fermeture laisse se poser ce qui est déjà en vol',async()=>{
 const E=load('lib/ecoute-progressive.ts',()=>({wavLong:()=>new Blob([new Uint8Array(8)])}));
 const enAttente=[];
 const envoyer=()=>new Promise(r=>{enAttente.push(r);});
 const livrees=[];
 const p=E.creerEcouteProgressive(envoyer,()=>'fr',()=>true,t=>livrees.push(t),4000,()=>{},1000);
 for(let i=0;i<40;i++)p.pousser(new Float32Array(1600).fill(0.5),true);
 for(let i=0;i<12;i++)p.pousser(new Float32Array(1600).fill(0),false);
 for(let i=0;i<20&&!enAttente.length;i++)await new Promise(r=>setTimeout(r,0));

 /* Rien n'est encore livré : la transcription est EN VOL. */
 assert.deepEqual(livrees,[],'rien ne doit être livré avant la réponse de l’ASR');

 /* On laisse se poser, avec un plafond. */
 const attente=p.attendreEnvois(500);
 enAttente.shift()({ok:true,json:async()=>({texte:'je voudrais aller au marché'})});
 const ms=await attente;
 assert.ok(ms>=0&&ms<=600,'l’attente doit être bornée : '+ms);
 assert.ok(livrees.length>=1,'la transcription doit être posée avant qu’on rende la main');
});

test('l’attente est bornée, et nulle quand rien n’est en vol',async()=>{
 const E=load('lib/ecoute-progressive.ts',()=>({wavLong:()=>new Blob([new Uint8Array(8)])}));
 const p=E.creerEcouteProgressive(()=>{throw Error('aucun envoi attendu');},()=>'fr',()=>true,()=>{},4000,()=>{},1000);
 /* Aucun segment commencé : on ne doit pas attendre une milliseconde. */
 assert.equal(await p.attendreEnvois(2000),0);
 /* Et un plafond à zéro rend le comportement d’avant, à la milliseconde. */
 assert.equal(await p.attendreEnvois(0),0);
});

test('le plafond d’attente est réglable par variable Render, et borné',()=>{
 const avant=process.env.BIA_ATTENTE_ENVOI_MS;
 try{
  const lire=()=>load('lib/seuils-anticipation.ts').attenteEnvoiMs();
  delete process.env.BIA_ATTENTE_ENVOI_MS;
  assert.equal(lire(),800,'défaut');
  process.env.BIA_ATTENTE_ENVOI_MS='0';
  assert.equal(lire(),0,'zéro doit rendre le comportement d’avant');
  for(const mauvais of ['-1','9999','abc','']){
   process.env.BIA_ATTENTE_ENVOI_MS=mauvais;
   assert.equal(lire(),800,'refusé : '+mauvais);
  }
 }finally{
  if(avant===undefined)delete process.env.BIA_ATTENTE_ENVOI_MS;
  else process.env.BIA_ATTENTE_ENVOI_MS=avant;
 }
});

/* ── TRANCHER SANS REDÉPLOYER ─────────────────────────────────────────────
   « Les 800 ms paient-elles ? » n'a pas de réponse dans les chiffres du
   25 octobre : le mécanisme marche, mais la médiane a bougé dans le mauvais
   sens sur un échantillon différent. Seul le MÊME essai avec et sans
   l'attente peut trancher — et un aller-retour par variable Render coûte
   deux minutes de construction. */
test('l’attente se règle par l’adresse, bornée, sans effet si absente',()=>{
 const code=fs.readFileSync('app/page.tsx','utf8');
 const bloc=code.slice(code.indexOf('const reglagesAnticipation=()=>{'));
 const corps=bloc.slice(0,bloc.indexOf('\n  };')+5);
 /* Absente : on ne change RIEN, le serveur décide. */
 assert.match(corps,/if\(v===null\)return serveur;/,'absent : le réglage du serveur passe, inchangé');
 /* Bornée comme la variable Render : pas de valeur folle par l’adresse. */
 assert.match(corps,/n>=0&&n<=3000/);
 /* Et elle passe DEVANT le réglage du serveur, sinon l’essai ne servirait à rien. */
 /* Et AUCUN nom neuf dans la ligne que les épreuves extraient : l'essai est
    replié dans reglagesAnticipation, qui existe déjà dans leurs décors. */
 assert.match(code,/attenteEnvoiMs:reglagesAnticipation\(\)\?\.attente_envoi_ms/);
 assert.doesNotMatch(code,/attenteDemandee/,'pas de nom neuf dans le callback extrait');
});
