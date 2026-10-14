import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import ts from 'typescript';
import vm from 'node:vm';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const core=compile(fs.readFileSync('lib/focus-locuteur-core.ts','utf8'));
const {ressemblanceVoix,verdictLocuteur}=await import('data:text/javascript;base64,'+Buffer.from(core).toString('base64'));
test('speaker vectors reject only clear mismatches, not uncertain or invalid evidence',()=>{
 const a=Float32Array.from({length:192},(_,i)=>i===0?1:0),b=Float32Array.from({length:192},(_,i)=>i===1?1:0);
 assert.equal(verdictLocuteur(ressemblanceVoix(a,a)),'meme');assert.equal(verdictLocuteur(ressemblanceVoix(a,b)),'autre');
 assert.equal(verdictLocuteur(.3),'incertain');assert.equal(verdictLocuteur(ressemblanceVoix(a,[])),'incertain');
});
const url='data:text/javascript;base64,'+Buffer.from(core).toString('base64');
const code=compile(fs.readFileSync('lib/focus-locuteur.ts','utf8')).replace('"./focus-locuteur-core"',JSON.stringify(url)).replace("'./focus-locuteur-core'",JSON.stringify(url));
const {creerFocusLocuteur}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('actual client gates other voices and interruptions, then resets for a new user',async()=>{
 let worker;const posted=[];globalThis.fetch=async()=>({ok:true});
 globalThis.Worker=class{constructor(){worker=this;}postMessage(m){posted.push(m);}terminate(){this.ended=true;}};
 globalThis.AudioWorkletNode=class{port={};connect(){}disconnect(){}};
 const ctx={audioWorklet:{addModule:async()=>{}},createGain:()=>({gain:{value:0},connect(){},disconnect(){}})};
 const f=creerFocusLocuteur();await f.brancher(ctx,{connect(){}});
 worker.onmessage({data:{type:'pret'}});f.observer(true);let epoch=posted.at(-1).epoch;
 worker.onmessage({data:{type:'voix',epoch,score:null,reference:true,ms:180}});
 assert(f.autoriser());assert(f.interruption());
 worker.onmessage({data:{type:'voix',epoch,score:.05,reference:true,ms:180}});
 assert.equal(f.autoriser(),false);assert.equal(f.interruption(),false);
 worker.onmessage({data:{type:'voix',epoch,score:.3,reference:true,ms:180}});
 assert(f.autoriser());assert.equal(f.interruption(),false);
 f.reset();assert(f.autoriser());assert(f.interruption());
 worker.onmessage({data:{type:'voix',epoch,score:.05,reference:true,ms:180}});assert(f.autoriser());
 f.terminer();assert(worker.ended);
});
test('unsupported or failed worker leaves the existing microphone usable',async()=>{
 globalThis.Worker=class{constructor(){throw Error('unsupported');}};
 const f=creerFocusLocuteur();await f.brancher({},{});assert(f.autoriser());assert(f.interruption());assert.equal(f.bilan().pret,false);
});
test('actual audio worklet retains contiguous mono samples at 16 kHz',()=>{
 let Capture;const frames=[];
 const sandbox={AudioWorkletProcessor:class{port={postMessage:x=>frames.push(x)};},sampleRate:48000,Float32Array,registerProcessor:(_name,c)=>Capture=c};
 vm.runInNewContext(fs.readFileSync('public/locuteur/capture.js','utf8'),sandbox);
 const capture=new Capture();for(let i=0;i<75;i++)capture.process([[new Float32Array(128).fill(.25)]]);
 assert.equal(frames.length,2);assert(frames.every(f=>f.length===1600&&f.every(x=>x===.25)));
});
test('actual worker cannot adopt a voice result from a preceding conversation',async()=>{
 const messages=[];let finish,entered;const started=new Promise(r=>entered=r);
 const hash=Uint8Array.from('a7586b34c8db1bbf32c64efc2b269be54f66787e50320c4472614bbe95218a81'.match(/../g),x=>parseInt(x,16));
 const session={run:async()=>{entered();return new Promise(r=>finish=()=>r({embs:{data:Float32Array.from({length:192},(_,i)=>i===0?1:0)}}));}};
 const sandbox={importScripts(){},ort:{env:{wasm:{}},Tensor:class{},InferenceSession:{create:async()=>session}},crypto:{subtle:{digest:async()=>hash.buffer}},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(22193734)}),postMessage:m=>messages.push(m),Date,performance,Uint8Array,Float32Array};
 vm.runInNewContext(fs.readFileSync('public/locuteur/worker.js','utf8'),sandbox);
 for(let i=0;i<10&&!messages.some(m=>m.type==='pret');i++)await new Promise(r=>setTimeout(r,0));
 sandbox.onmessage({data:{type:'reset',epoch:1}});
 sandbox.onmessage({data:{type:'pcm',epoch:1,pcm:new Float32Array(19200),fiable:true}});await started;
 sandbox.onmessage({data:{type:'reset',epoch:2}});finish();await new Promise(r=>setTimeout(r,0));
 assert.equal(messages.filter(m=>m.type==='voix').length,0);
});
