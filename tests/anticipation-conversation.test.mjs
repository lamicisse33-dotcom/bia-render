import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import crypto from 'node:crypto';import vm from 'node:vm';
function load(path,req=()=>{throw Error('unexpected dependency')}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(req,m,m.exports);return m.exports;}
const long=load('lib/ecoute-longue.ts'),core=load('lib/anticipation-core.ts',id=>id==='./seuils-anticipation'?{signesAnticipation:()=>20}:crypto);
const progressive=()=>load('lib/ecoute-progressive.ts',()=>long);
test('two minutes: one ordered ASR queue, complete PCM coverage, and progress before stop',async()=>{
 let active=0,max=0,frames=0,progress=0;const received=[];
 const p=progressive().creerEcouteProgressive(async f=>{active++;max=Math.max(max,active);const bytes=await f.get('audio').arrayBuffer(),v=new DataView(bytes);frames+=(bytes.byteLength-44)/2;received.push(v.getInt16(44,true));await new Promise(r=>setTimeout(r,1));active--;return Response.json({texte:'bloc '+received.length});},()=> 'wo',()=>true,()=>progress++);
 for(let i=0;i<480;i++){p.pousser(new Float32Array(4000).fill(.2),true);if(i%32===0)await new Promise(r=>setTimeout(r,3));}
 const avant=progress;assert(avant>0,'partial transcripts must arrive while microphone is open');const result=await p.finir();assert.equal(max,1);assert.equal(frames,120*16000);assert.equal(result.progressive.secondes,120);assert.equal(progress,avant,'no new draft after stop');assert(result.texte.endsWith('bloc '+received.length));
});
test('short speech retains original path; an ASR failure never returns partial text',async()=>{
 const p=progressive().creerEcouteProgressive(()=>{throw Error('must not request');},()=> 'wo',()=>true,()=>{});p.pousser(new Float32Array(16000),true);assert.equal(await p.finir(),null);
 const q=progressive().creerEcouteProgressive(async()=>Response.json({panne:true}),()=> 'wo',()=>true,()=>{});for(let i=0;i<40;i++)q.pousser(new Float32Array(4000),true);await assert.rejects(q.finir());
});
test('changed intent, actions and context cannot reuse a provisional answer',()=>{
 const q='Je voudrais comprendre pourquoi mon ami ne me parle plus.';
 assert.equal(core.verifierSuite(q,q),'exact');assert.equal(core.verifierSuite(q,q+' Finalement non, parle de sport.'),'refus');assert.equal(core.verifierSuite(q,q+' Il a changé de téléphone.'),'verification');assert.equal(core.verifierSuite(q,'Mémorise cette phrase pour la prochaine fois.'),'refus');assert(!core.eligibleAnticipation('Réserve un restaurant pour demain soir à Dakar.'));
 assert.deepEqual(core.contexteAnticipation([{role:'assistant',text:'Bonjour'},{role:'user',text:q}],q),[{role:'assistant',content:'Bonjour'}]);
});
test('GPU queue gives pending ASR priority over speculative TTS',async()=>{
 const gpu=load('lib/anticipation-gpu.ts'),order=[];let release;const first=gpu.gpuAnticipation(()=>new Promise(r=>{release=r;}),0);const voice=gpu.gpuAnticipation(async()=>order.push('voice'),0),asr=gpu.gpuAnticipation(async()=>order.push('asr'),2);release();await Promise.all([first,voice,asr]);assert.deepEqual(order,['asr','voice']);
});
test('AudioWorklet flush preserves final samples and acknowledges completion',()=>{
 let Klass;const messages=[];
 const context={AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>messages.push(m)};}},sampleRate:48000,Float32Array,registerProcessor:(name,k)=>{Klass=k;}};
 vm.runInNewContext(fs.readFileSync('public/anticipation/capture.js','utf8'),context);const worklet=new Klass();for(let i=0;i<480;i++)worklet.process([[new Float32Array(1000).fill(.25)]]);worklet.port.onmessage({data:'fin'});const arrays=messages.filter(m=>m.pcm).map(m=>m.pcm);assert.equal(arrays.reduce((n,a)=>n+a.length,0),160000);assert(arrays.every(a=>a.every(x=>x===.25)));assert.equal(messages.at(-1).fin,true);const n=messages.length;worklet.process([[new Float32Array(48000)]]);assert.equal(messages.length,n);
});
test('draft ownership, single consumption and changed intent are enforced without repeating synthesis',async()=>{
 delete globalThis.biaAnticipationReponse;let syntheses=0,modeles=0;
 const api=load('lib/anticipation-reponse.ts',id=>{
 if(id==='node:crypto')return crypto;if(id==='next/server')return {NextRequest:Request};if(id==='./anticipation-core')return core;
 if(id==='./seuils-anticipation')return {premierSegmentMs:()=>700,signesAnticipation:()=>20};
 if(id==='./eligibilite-etat')return {noterRefusServeur(){},noterEligibilite(){},resumeEligibilite:()=>({})};
 if(id==='./anticipation-gpu')return {gpuAnticipation:async f=>f()};
 if(id==='./cerveau-anthropic')return {MODELE_SONNET:'test',MODELE_HAIKU:'test-haiku',messagesAnthropic:messages=>({messages}),contenuAnthropic:d=>d.text,fetchAnthropic:async()=>{modeles++;return Response.json({text:JSON.stringify({eligible:true,reply:'Écoute ton ami et demande-lui ce qui lui ferait du bien.',valide:false})});}};
 if(id==='./conversation-groq')return {messagesConversation:()=>[]};if(id==='./memoire-organisee')return {contexteMemoireCommune:async()=>''};if(id==='./instructions-apprentissage')return {contexteInstructions:async()=>''};if(id==='./langue')return {detecterLangue:()=> 'fr'};if(id==='./assembler-sons-courants')return {assemblerSonsCourants:()=>({wav:new ArrayBuffer(1200)})};
 if(id.includes('chatterbox-test'))return {POST:async()=>{syntheses++;return Response.json({audio:Buffer.alloc(1200).toString('base64'),partie:0,parties:1,empreinte:'fixed',voice:'female'});}};throw Error(id);
 });
 const question='Je voudrais comprendre comment écouter mon ami sans le juger.',body={texte:question,tour:'test-tour-123',history:[],resume:'',voice:'female',persona:'bia'};
 const p=await api.preparerReponseAnticipee(body,'test-owner',true,new AbortController().signal);assert(p);
 const final={anticipationId:p.id,message:question,history:[],resume:'',voixAnticipee:'female'};
 assert.equal(await api.consommerReponseAnticipee(final,'other-owner'),null);
 const reply=await api.consommerReponseAnticipee(final,'test-owner');assert(reply.audio_anticipe);assert.equal(syntheses,1);assert.equal(modeles,2);assert.equal(await api.consommerReponseAnticipee(final,'test-owner'),null);
 const p2=await api.preparerReponseAnticipee(body,'owner-2',true,new AbortController().signal);assert(p2);assert.equal(await api.consommerReponseAnticipee({...final,anticipationId:p2.id,message:question+' Finalement non, changeons de sujet.'},'owner-2'),null);
});

test('Sonnet request preserves the constrained JSON schema and default conversation settings',()=>{
 const api=load('lib/cerveau-anthropic.ts');const schema={type:'json_schema',schema:{type:'object',properties:{valide:{type:'boolean'}},required:['valide'],additionalProperties:false}};
 const normal=api.corpsAnthropic({model:api.MODELE_SONNET,max_tokens:1200,temperature:.7});assert.deepEqual(normal.output_config,{effort:'low'});assert.equal(normal.temperature,undefined);
 const constrained=api.corpsAnthropic({model:api.MODELE_SONNET,max_tokens:1200,output_config:{format:schema}});assert.deepEqual(constrained.output_config,{effort:'low',format:schema});assert.deepEqual(constrained.thinking,normal.thinking);
});


/* ── LE PREMIER SEGMENT PART À 1,5 s DE PAROLE, PAS À 4 s ─────────────────

   Contrat changé sciemment le 23 octobre 2026. À 4 s, le premier segment
   était hors de portée d'une phrase ordinaire : mesuré sur quatre tours
   Khalam réels, 702, 767, 1151 et 2686 ms de parole, l'anticipation ne
   partait jamais. Voir lib/premier-segment.ts et
   tests/eligibilite-anticipation.test.mjs.

   Ce qui NE change pas, et que cette épreuve garde intact : aucun échantillon
   perdu ni dupliqué, les segments restent ordonnés, et la durée totale
   annoncée est exactement celle qui a été poussée. */
test('first partial transcription starts after 1.5 s of speech and preserves ordered complete samples',async()=>{
 const sent=[],updates=[];const p=progressive().creerEcouteProgressive(async f=>{sent.push((await f.get('audio').arrayBuffer()).byteLength);return Response.json({texte:'Un premier point achevé.'});},()=> 'fr',()=>true,t=>updates.push(t));
 for(let i=0;i<5;i++)p.pousser(new Float32Array(4000).fill(.2),true);
 await new Promise(r=>setTimeout(r,0));assert.equal(sent.length,0,'rien avant 1,5 s de parole');
 p.pousser(new Float32Array(4000).fill(.2),true);await new Promise(r=>setTimeout(r,0));assert.equal(sent.length,1);assert.equal(updates.length,1);
 const end=await p.finir();
 assert.deepEqual(sent.map(b=>(b-44)/2),[8160,15840],'coupe au plus silencieux, puis le reste');
 assert.equal(sent.reduce((n,b)=>n+(b-44)/2,0),1.5*16000,'tous les échantillons, une seule fois');
 assert.equal(end.progressive.secondes,1.5);
});

test('a short utterance is transcribed during the endpointing pause and resumed speech retains every sample',async()=>{
 let frames=0;const updates=[];const p=progressive().creerEcouteProgressive(async f=>{frames+=((await f.get('audio').arrayBuffer()).byteLength-44)/2;return Response.json({texte:'Un point complet.'});},()=> 'fr',()=>true,t=>updates.push(t));
 for(let i=0;i<8;i++)p.pousser(new Float32Array(4000).fill(.2),true);
 for(let i=0;i<2;i++)p.pousser(new Float32Array(4000),false);
 /* Deux segments depuis le 23 octobre 2026, et c'est le progrès : un PENDANT
    la parole (à 1,5 s), un à la pause d'endpointing. Avant, le premier ne
    partait qu'à 4 s, donc jamais sur une phrase de deux secondes, et seule
    la pause produisait du texte — trop tard pour préparer quoi que ce soit. */
 await new Promise(r=>setTimeout(r,0));assert.equal(p.segmentsCommences,2);assert.equal(updates.length,2,'must start before the 1.5–2 second endpoint');assert.equal(frames,40000);
 for(let i=0;i<5;i++)p.pousser(new Float32Array(4000).fill(.15),true);
 for(let i=0;i<2;i++)p.pousser(new Float32Array(4000),false);
 const result=await p.finir();assert.equal(p.segmentsCommences,3);assert.equal(frames,17*4000,'aucun échantillon perdu ni dupliqué');assert.equal(result.progressive.secondes,4.25);
});
