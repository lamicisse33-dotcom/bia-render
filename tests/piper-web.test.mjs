import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
await import('../public/piper/core.js');
const core=globalThis.KhalamPiperCore;
const config=JSON.parse(fs.readFileSync('public/piper/khalam-v2.json'));
assert.deepEqual(core.encode('bëgg',config),core.encode('be\u0308gg',config));
assert.deepEqual(core.encode('D’accord.',config),core.encode("D'accord.",config));
assert.throws(()=>core.encode('Nanga 🦁 def?',config),/caractères/);
assert.throws(()=>core.encode('mot_inconnu',config),/caractères/);
const text=('Nanga def? Maa ngi fi rekk. Bonjour, je suis prête à discuter avec toi. ').repeat(40);
const parts=core.split(text);
assert.equal(parts.join(' ').replace(/\s+/g,' '),text.trim());
assert(parts.every(p=>Array.from(p).length<=220));
assert.throws(()=>core.split('a'.repeat(300)),/mot est trop long/);
const wav=new DataView(core.wav(new Float32Array([0,.5,-.5,1,-1]),22050));
assert.equal(wav.getUint32(24,true),22050);assert.equal(wav.getUint32(40,true),10);assert.equal(wav.getInt16(52,true),-32767);
assert.throws(()=>core.wav(new Float32Array([NaN]),22050),/invalide/);
assert.throws(()=>core.wav(new Float32Array([0,0]),22050),/silence/);
const store=new Map();let native=false;
const context={exports:{},URLSearchParams,window:{location:{search:''},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}},require:()=>({piperLocaleDisponible:()=>native})};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/chatterbox-essai.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const c=context.exports;
assert.equal(c.choixVoixBia(),'female');
assert(c.choisirVoixBia('piper-web'));assert.equal(c.choixVoixBia(),'piper-web');assert.equal(c.essaiChatterboxActif(),false);assert.equal(c.routeVoixBia(),'/api/piper-web/synthese');
native=true;assert.equal(c.choixVoixBia(),'piper-web');
assert(c.choisirVoixBia('female'));assert(c.essaiChatterboxActif());assert.equal(c.routeVoixBia(),'/api/chatterbox-test/bia');
assert(c.choisirVoixBia('piper'));assert.equal(c.routeVoixBia(),'/api/voix');
console.log('Piper web: exact alphabet, no skipped unknown characters, complete segmentation, WAV and independent voice selection passed.');

// Two queued requests share a worker: cancelling the turn must reject both,
// ignore its late audio, and let the next request use a fresh worker.
const workers=[];let remote=0;
class FakeWorker{constructor(){workers.push(this);}postMessage(d){this.last=d;}terminate(){this.dead=true;}}
const browser={exports:{},window:{dispatchEvent(){}},localStorage:{getItem:()=>null},Worker:FakeWorker,WebAssembly,
 AbortController,DOMException,CustomEvent:class{},Error,Response,Headers,setTimeout,clearTimeout,
 fetch:async()=>{remote++;return new Response('{}');}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/piper-web.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,browser);
const api=browser.exports,abort=new AbortController();
const one=api.lirePiperWeb('Bonjour',0,'test',abort.signal),two=api.lirePiperWeb('Bonjour',1,'test',abort.signal);
const rejected=[assert.rejects(one,{name:'AbortError'}),assert.rejects(two,{name:'AbortError'})];
abort.abort();await Promise.all(rejected);assert(workers[0].dead);
workers[0].onmessage({data:{id:1,wav:new ArrayBuffer(5)}});
const ready=api.preparerPiperWeb('test');assert.equal(workers.length,2);
workers[1].onmessage({data:{id:workers[1].last.id,ready:true}});await ready;
const calls=remote;await api.fetchVoixBia('/api/chatterbox-test/bia',{});assert.equal(remote,calls+1);
console.log('Piper web: queued cancellation, late-result isolation, restart and main engine routing passed.');

// A preview must not replace the saved voice. Ordinary playback uses the saved
// choice; the ONNX feed must receive that exact speaker (including zero).
let savedSpeaker=null;
browser.localStorage.getItem=key=>key==='bia-piper-web-speaker'?savedSpeaker:null;
browser.localStorage.setItem=(key,value)=>{if(key==='bia-piper-web-speaker')savedSpeaker=value;};
assert.equal(api.voixFemininePiper(),1);
assert.equal(api.choisirVoixFemininePiper(2),false);
const preview=api.lirePiperWeb('Bonjour',0,'test',undefined,0);
assert.equal(workers[1].last.speaker,0);assert.equal(savedSpeaker,null);
workers[1].onmessage({data:{id:workers[1].last.id,parts:1,part:0,empty:true}});await preview;
assert.equal(api.choisirVoixFemininePiper(0),true);
const normal=api.lirePiperWeb('Bonjour',0,'test');assert.equal(workers[1].last.speaker,0);
workers[1].onmessage({data:{id:workers[1].last.id,parts:1,part:0,empty:true}});await normal;
savedSpeaker='999';assert.equal(api.voixFemininePiper(),1);
const messages=[],feeds=[];
class Tensor{constructor(type,data,shape){this.data=data;}dispose(){}}
const runtime={importScripts(){},ort:{env:{wasm:{}},Tensor},KhalamPiperCore:core,
 postMessage:d=>messages.push(d),performance:{now:()=>0},configData:config,
 fakeSession:{run:async inputs=>{feeds.push(Number(inputs.sid.data[0]));return {output:{data:new Float32Array([.1,-.1]),dispose(){}}};}}};
vm.createContext(runtime);vm.runInContext(fs.readFileSync('public/piper/worker.js','utf8'),runtime);
vm.runInContext('prepared=Promise.resolve();config=configData;session=fakeSession;',runtime);
for(const speaker of [0,1,undefined,2,-1,99,.5]){
 runtime.onmessage({data:{id:messages.length+1,kind:'speak',text:'Bonjour',part:0,speaker}});
 await vm.runInContext('queue',runtime);
}
assert.deepEqual(feeds,[0,1,1]);
assert.equal(messages.filter(m=>m.wav).length,3);
assert.equal(messages.filter(m=>m.error).length,4);
console.log('Piper female voices: preview isolation, saved choice, exact ONNX speaker IDs and invalid-speaker rejection passed.');
