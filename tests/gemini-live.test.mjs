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
  assert.equal((await module.exports.POST(request('VISITOR'))).status,403);
  const foreign=request('MASTER');foreign.headers.set('origin','https://evil.example');
  assert.equal((await module.exports.POST(foreign)).status,403);assert.equal(calls.length,0);
  const proxy=request('MASTER');proxy.nextUrl.origin='http://localhost:10000';
  assert.equal((await module.exports.POST(proxy)).status,200);
  const response=await module.exports.POST(request('MASTER'));assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.token,'auth_tokens/ephemeral-test');assert(!JSON.stringify(data).includes('FAKE-SERVER-KEY'));
  const body=JSON.parse(calls[0].init.body);assert.equal(body.uses,1);assert.equal(calls[0].init.headers['x-goog-api-key'],'FAKE-SERVER-KEY');
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.includes('Consignes apprises'));
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
