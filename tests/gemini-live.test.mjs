import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
test('microphone resampling preserves the stream across worklet boundaries at 44.1 and 48 kHz',()=>{
 for(const rate of [44100,48000]){
  const module={exports:{}};new Function('module','exports',compile('lib/gemini-live-client.ts')+'\nmodule.exports.worklet=WORKLET;')(module,module.exports);
  function run(block){
   let Capture;const chunks=[];
   class Processor{port={postMessage:v=>chunks.push(new Uint8Array(v.raw))};}
   vm.runInNewContext(module.exports.worklet,{AudioWorkletProcessor:Processor,sampleRate:rate,registerProcessor:(_,c)=>Capture=c,ArrayBuffer,DataView,Math});
   const capture=new Capture(),audio=new Float32Array(rate+1024);
   for(let i=0;i<audio.length;i++)audio[i]=0.4*Math.sin(2*Math.PI*440*i/rate);
   for(let i=0;i<audio.length;i+=block)capture.process([[audio.subarray(i,i+block)]]);
   return Buffer.concat(chunks.map(v=>Buffer.from(v)));
  }
  const small=run(128),large=run(4096);assert.equal(small.length,large.length);assert(small.length>=32000);assert.equal(small.length%1280,0);
  for(let i=0;i<small.length;i+=2)assert(Math.abs(small.readInt16LE(i)-large.readInt16LE(i))<=1);
 }
});
test('session authentication precedes Google and returns only a constrained ephemeral token',async()=>{
 const module={exports:{}},oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldGoogle=process.env.GOOGLE_API_KEY;
 const dependencies={
  '@/lib/gemini-live-diagnostic':{resumeGeminiLive:()=>({statut:'non_lance'})},
  'next/server':{NextResponse:{json:(d,o)=>Response.json(d,o)}},
  '@/lib/lexique':{motsCorriges:async()=>[{faux:'ancien',juste:'corrigé',fois:1}]},
  '@/lib/codes':{verifierCode:code=>code==='MASTER'?{ok:true,maitre:true}:code==='VISITOR'?{ok:true,maitre:false}:{ok:false}},
  '@/lib/instructions-apprentissage':{contexteInstructions:async()=>'Consignes apprises'},
  '@/lib/gemini-live-prompt':{BIA_LIVE_CONSIGNES_BASE:'Identité de Bia',BIA_LIVE_LANGUES:'FR_WO_UNIQUEMENT'}
 };
 const calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,init});return Response.json({name:'auth_tokens/ephemeral-test'});};
 process.env.GEMINI_API_KEY='FAKE-SERVER-KEY';delete process.env.GOOGLE_API_KEY;
 try{
  new Function('module','exports','require',compile('app/api/gemini-live/session/route.ts'))(module,module.exports,n=>dependencies[n]||require(n));
  const request=code=>({headers:new Headers({'x-bia-code':code,origin:'https://app.khalam.app'}),nextUrl:{origin:'https://app.khalam.app'}});
  assert.equal((await module.exports.POST(request('INVALID'))).status,401);assert.equal(calls.length,0);
  const foreign=request('MASTER');foreign.headers.set('origin','https://evil.example');
  assert.equal((await module.exports.POST(foreign)).status,403);assert.equal(calls.length,0);
  /* Khalam Rapide est la connexion par défaut de tout le monde depuis le 23
     octobre 2026. Un visiteur obtient donc sa session — mais jamais les
     consignes pédagogiques privées du maître. Le lexique corrigé, lui, est la
     façon de parler de BIA et part pour tous. */
  assert.equal((await module.exports.POST(request('VISITOR'))).status,200);
  const consigneVisiteur=JSON.parse(calls[0].init.body).bidiGenerateContentSetup.systemInstruction.parts[0].text;
  assert(!consigneVisiteur.includes('Consignes apprises'));
  assert(consigneVisiteur.includes('corrigé'));
  assert(consigneVisiteur.includes('Identité de Bia'));
  calls.length=0;
  const proxy=request('MASTER');proxy.nextUrl.origin='http://localhost:10000';
  assert.equal((await module.exports.POST(proxy)).status,200);
  const response=await module.exports.POST(request('MASTER'));assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.token,'auth_tokens/ephemeral-test');assert(!JSON.stringify(data).includes('FAKE-SERVER-KEY'));
  const body=JSON.parse(calls[0].init.body);assert.equal(body.uses,1);assert.equal(calls[0].init.headers['x-goog-api-key'],'FAKE-SERVER-KEY');
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.includes('Consignes apprises'));
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.includes('corrigé'));
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.startsWith('FR_WO_UNIQUEMENT'));
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.endsWith('FR_WO_UNIQUEMENT'));assert.deepEqual(body.bidiGenerateContentSetup.generationConfig.responseModalities,['AUDIO']);
  assert(Date.parse(body.expireTime)-Date.now()<=600000);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldGoogle===undefined)delete process.env.GOOGLE_API_KEY;else process.env.GOOGLE_API_KEY=oldGoogle;}
});

test('Live code normalization matches normal Bia before creating HTTP headers',()=>{
 const module={exports:{}};
 new Function('module','exports',compile('lib/gemini-live-client.ts'))(module,module.exports);
 const client=new module.exports.BiaGeminiLive('  ma\u00a0st-er\u200b  ',{});
 assert.equal(client.code,'MASTER');
 assert.equal(new Headers({'x-bia-code':client.code}).get('x-bia-code'),'MASTER');
});

test('Live retains the exact native identity and shared base instructions',()=>{
 function literal(path,name){
  const source=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);let value;
  function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name&&node.initializer&&ts.isNoSubstitutionTemplateLiteral(node.initializer))value=node.initializer.text;ts.forEachChild(node,visit);}
  visit(source);assert.equal(typeof value,'string',name);return value;
 }
 const identity=literal('app/api/chat/route.ts','system');
 const relations=literal('lib/relations.ts','SOCLE_RELATIONS');
 const comprehensionModule={exports:{}};
 new Function('module','exports',compile('lib/comprehension-conversation.ts'))(comprehensionModule,comprehensionModule.exports);
 const comprehension=comprehensionModule.exports.CONSIGNE_COMPREHENSION;
 const master=literal('lib/conversation-groq.ts','CONSIGNE_MAITRE');
 const deps={'./relations':{SOCLE_RELATIONS:relations},'./comprehension-conversation':{CONSIGNE_COMPREHENSION:comprehension},'./conversation-groq':{CONSIGNE_MAITRE:master}};
 const module={exports:{}};
 new Function('module','exports','require',compile('lib/gemini-live-prompt.ts'))(module,module.exports,n=>deps[n]);
 assert.equal(module.exports.BIA_LIVE_SYSTEM,identity);
 assert.equal(module.exports.BIA_LIVE_CONSIGNES_BASE,[identity,relations,comprehension,master].join('\n\n'));
});

test('Latin alphabet guard preserves Wolof and French and refuses foreign scripts',()=>{
 const module={exports:{}};new Function('module','exports',compile('lib/gemini-live-client.ts'))(module,module.exports);
 for(const text of ['Bonjour papa !','Ñëwal, gëmmeen tuwuma.','Ŋ, ñ, é, ë, à, ç, œ, 15 000 F CFA 😊','Bia et Google'])assert(module.exports.alphabetLiveAutorise(text),text);
 for(const text of ['مرحبا','Привет','你好','नमस्ते','Bonjour مرحبا'])assert.equal(module.exports.alphabetLiveAutorise(text),false,text);
 // Latin words can belong to many languages; do not pretend this is language detection.
 assert(module.exports.alphabetLiveAutorise('Google'));
});

test('a foreign-script transcript stops queued playback before the same packet can play',async()=>{
 const module={exports:{}};new Function('module','exports',compile('lib/gemini-live-client.ts'))(module,module.exports);
 const old={fetch:globalThis.fetch,WebSocket:globalThis.WebSocket,localStorage:globalThis.localStorage};
 let socket,played=0,stopped=0;const errors=[];
 class Socket{
  static OPEN=1;readyState=1;
  constructor(){socket=this;queueMicrotask(()=>this.onopen());}
  send(raw){if(JSON.parse(raw).setup)queueMicrotask(()=>this.onmessage({data:JSON.stringify({setupComplete:{}})}));}
  close(){}
 }
 try{
  globalThis.WebSocket=Socket;globalThis.localStorage={setItem(){}};
  globalThis.fetch=async()=>Response.json({token:'auth_tokens/synthetic',setup:{model:'synthetic'}});
  const client=new module.exports.BiaGeminiLive('TEST',{etat(){},transcription(){},parle(){},latence(){},erreur:e=>errors.push(e)});
  client.stoppe=false;client.jouer=()=>played++;client.arreter=()=>stopped++;
  await client.connecter();
  await socket.onmessage({data:JSON.stringify({serverContent:{outputTranscription:{text:'مرحبا'},modelTurn:{parts:[{inlineData:{data:'AAAA',mimeType:'audio/pcm;rate=24000'}}]}}})});
  assert.equal(played,0);assert.equal(stopped,1);assert.equal(errors.length,1);assert(errors[0].includes('français et wolof uniquement'));
 }finally{globalThis.fetch=old.fetch;globalThis.WebSocket=old.WebSocket;if(old.localStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=old.localStorage;}
});

test('Live reads all lesson and lexicon pages, exact corrections and master instructions without writes',async()=>{
 const module={exports:{}};let reads=0;
 const deps={
  'next/server':{NextResponse:{json:(d,o)=>Response.json(d,o)}},
  '@/lib/codes':{verifierCode:code=>({ok:code==='MASTER'||code==='VISITOR',maitre:code==='MASTER'})},
  '@/lib/devoirs-apprentissage':{contexteDevoirs:async()=>{reads++;return 'Répliques du devoir';},devoirsALire:async()=>{reads++;return {devoirs:[{id:'lesson',texte:'Texte exact du devoir'.repeat(500),valide:true,langue:'wo'},{id:'brouillon',texte:'Devoir en cours de relecture',valide:false,langue:'wo'}],incomplets:1};}},
  '@/lib/dialogue-devoirs':{contexteMaitrises:async()=>{reads++;return 'Lexique partagé';}},
  '@/lib/instructions-apprentissage':{contexteInstructions:async()=>{reads++;return 'Consigne exacte du maître';}},
  '@/lib/lexique':{lexiqueConfig:{actif:true},lectureLexique:()=>({motif:''}),toutes:async()=>{reads++;return Array.from({length:12},(_,i)=>({source:'source'+i,corrigee:'corrigée'+i}));},correctionExacte:async()=>({source:'question',corrigee:'Réponse validée'}),exemplesPour:async()=>[{source:'question',corrigee:'Réponse validée'}],motsCorriges:async()=>[{faux:'ancien',juste:'corrigé'}]}
 };
 new Function('module','exports','require',compile('app/api/gemini-live/connaissances/route.ts'))(module,module.exports,n=>deps[n]);
 const request=(body,code='MASTER')=>({headers:new Headers({'x-bia-code':code}),json:async()=>body});
 assert.equal((await module.exports.POST(request({question:'enfants'},'INVALID'))).status,401);assert.equal(reads,0);
 /* ── LA FRONTIÈRE, MAINTENANT QUE TOUT LE MONDE PASSE PAR LÀ ────────────
    Khalam Rapide est ouverte à tous depuis le 23 octobre 2026. Un visiteur
    lit les devoirs validés et le lexique — c'est ce qu'enseigne BIA — mais
    jamais les consignes pédagogiques de Lamine, ses maîtrises, ni un devoir
    encore en relecture. */
 const visiteur=await (await module.exports.POST(request({question:'enfants'},'VISITOR'))).json();
 assert.equal(visiteur.contexte.instructions,'');
 assert.equal(visiteur.contexte.maitrises,'');
 assert.equal(visiteur.acces.instructions_chargees,false);
 assert.equal(visiteur.contexte.correction_exacte.corrigee,'Réponse validée');
 const catalogueVisiteur=await (await module.exports.POST(request({action:'lister_devoirs'},'VISITOR'))).json();
 assert.equal(catalogueVisiteur.total,1);
 assert.equal((await module.exports.POST(request({action:'lire_devoir',devoir_id:'brouillon'},'VISITOR'))).status,404);
 assert.equal((await module.exports.POST(request({action:'lire_devoir',devoir_id:'brouillon'}))).status,200);
 const recherche=await (await module.exports.POST(request({question:'enfants'}))).json();
 assert.equal(recherche.contexte.correction_exacte.corrigee,'Réponse validée');assert.equal(recherche.contexte.instructions,'Consigne exacte du maître');assert.equal(recherche.acces.lexique_entrees,12);
 const catalogue=await (await module.exports.POST(request({action:'lister_devoirs'}))).json();assert.equal(catalogue.total,2);
 const lecture=await (await module.exports.POST(request({action:'lire_devoir',devoir_id:'lesson',offset:8000}))).json();assert.equal(lecture.devoir.texte,'Texte exact du devoir'.repeat(500).slice(8000));
 const page1=await (await module.exports.POST(request({action:'lister_lexique'}))).json(),page2=await (await module.exports.POST(request({action:'lister_lexique',offset:10}))).json();
 assert.equal(page1.lexique.length,10);assert.equal(page1.suivant,10);assert.equal(page2.lexique.length,2);assert.equal(page2.suivant,null);
 assert.equal((await module.exports.POST(request({action:'lire_devoir',devoir_id:'absent'}))).status,404);
 assert.equal((await module.exports.POST(request({action:'supprimer'}))).status,400);
 assert.equal((await module.exports.POST(request({action:'lister_lexique',offset:-1}))).status,400);
});
