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
  'next/server':{NextResponse:{json:(d,o)=>Response.json(d,o)}},
  '@/lib/codes':{verifierCode:code=>code==='MASTER'?{ok:true,maitre:true}:{ok:false}},
  '@/lib/instructions-apprentissage':{contexteInstructions:async()=>'Consignes apprises'},
  '@/lib/gemini-live-prompt':{BIA_LIVE_SYSTEM:'Identité de Bia'}
 };
 const calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,init});return Response.json({name:'auth_tokens/ephemeral-test'});};
 process.env.GEMINI_API_KEY='FAKE-SERVER-KEY';delete process.env.GOOGLE_API_KEY;
 try{
  new Function('module','exports','require',compile('app/api/gemini-live/session/route.ts'))(module,module.exports,n=>dependencies[n]||require(n));
  const request=code=>({headers:new Headers({'x-bia-code':code,origin:'https://app.khalam.app'}),nextUrl:{origin:'https://app.khalam.app'}});
  assert.equal((await module.exports.POST(request('INVALID'))).status,401);assert.equal(calls.length,0);
  const response=await module.exports.POST(request('MASTER'));assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.token,'auth_tokens/ephemeral-test');assert(!JSON.stringify(data).includes('FAKE-SERVER-KEY'));
  const body=JSON.parse(calls[0].init.body);assert.equal(body.uses,1);assert.equal(calls[0].init.headers['x-goog-api-key'],'FAKE-SERVER-KEY');
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.includes('Consignes apprises'));assert.deepEqual(body.bidiGenerateContentSetup.generationConfig.responseModalities,['AUDIO']);
  assert(Date.parse(body.expireTime)-Date.now()<=600000);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldGoogle===undefined)delete process.env.GOOGLE_API_KEY;else process.env.GOOGLE_API_KEY=oldGoogle;}
});
