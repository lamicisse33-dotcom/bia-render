import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {silenceQuiSuffit}=await import('data:text/javascript;base64,'+Buffer.from(compile(fs.readFileSync('lib/micro.ts','utf8'))).toString('base64'));
const {attendreSonTour}=await import('data:text/javascript;base64,'+Buffer.from(compile(fs.readFileSync('lib/tour-de-parole.ts','utf8'))).toString('base64'));
const page=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name){let body;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)body=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,walk);}walk(ast);assert(body);return new Function('env',`with(env){${compile('const run='+body)};return run;}`);}
const makeGate=callback('autoriserLaVoix'),makePlay=callback('jouerEtAnimer');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function environment(){
 let now=10000,speech=false,plays=0;const events=[];
 const ctx={currentTime:0,destination:{},decodeAudioData:async()=>({duration:.01}),createBufferSource(){return {connect(){},start(){plays++;queueMicrotask(()=>this.onended?.());}};}};
 const env={silenceQuiSuffit,coupesTropTotRef:{current:0},Date:{now:()=>now},attendreSonTour,conversationRef:{current:true},enregistreurRef:{current:null},porteRef:{current:null},
  analyseRef:{current:{frequencyBinCount:128,context:{sampleRate:48000},getByteTimeDomainData:a=>a.fill(speech?150:128),getByteFrequencyData:a=>a.fill(speech?1:0)}},
  sourceRef:{current:null},sourcesRef:{current:new Set()},voixDuTelephoneRef:{current:false},sonDelleRef:{current:0},seuilRef:{current:8},dernierSignalParoleRef:{current:{quand:0,delai:1500}},
  partVocale:()=>speech?.6:0,fetch:async(_u,o)=>{events.push(JSON.parse(o.body));return {ok:true};},numeroDuTourRef:{current:1},
  reveillerLeSon:async()=>ctx,ralentir:(_c,a)=>a,sansSilence:(_c,a)=>a,vitesseAudioBia:()=>1,enveloppeDe:()=>({valeurs:[1],pic:1,pas:.01}),
  setMode(){},setFace(){},animationRef:{current:null},segmentEnCoursRef:{current:false},requestAnimationFrame:()=>1,cancelAnimationFrame(){},envoyerLeTour(){}};
 env.autoriserLaVoix=makeGate(env);
 return {env,ctx,events,now:v=>now=v,speech:v=>speech=v,plays:()=>plays};
}
test('an open recorder still holds audio; after closure renewed speech restarts the full 400 ms guard',{timeout:2000},async()=>{
 const x=environment();x.env.enregistreurRef.current={state:'recording'};let finished=false;
 const pending=x.env.autoriserLaVoix(()=>true).then(v=>{finished=true;return v;});
 x.now(55000);await sleep(80);assert.equal(finished,false);
 x.env.enregistreurRef.current=null;x.speech(true);await sleep(80);assert.equal(finished,false);
 x.speech(false);x.now(55399);await sleep(80);assert.equal(finished,false);
 x.now(55400);assert.equal(await pending,true);assert.equal(x.events.at(-1).etape,'retenue');
});
test('disappearing React gate cannot release audio while speech continues',{timeout:2000},async()=>{
 const x=environment(),gate=deferred();x.env.porteRef.current={attendre:gate.promise};let finished=false;
 const pending=x.env.autoriserLaVoix(()=>true).then(v=>{finished=true;return v;});
 x.speech(true);x.env.porteRef.current=null;gate.resolve();await sleep(80);assert.equal(finished,false);
 x.speech(false);x.now(12000);assert.equal(await pending,true);
});
test('an obsolete turn escapes an unresolved gate without playing',{timeout:1000},async()=>{
 const x=environment();x.env.porteRef.current={attendre:new Promise(()=>{})};let current=true;
 const pending=x.env.autoriserLaVoix(()=>current);current=false;
 assert.equal(await pending,false);assert.equal(x.events.at(-1).etape,'annulee');
});
test('actual cached/brick playback rechecks after decode, retains audio, then plays once',{timeout:2000},async()=>{
 const x=environment(),decode=deferred();x.ctx.decodeAudioData=()=>decode.promise;
 const pending=makePlay(x.env)(new ArrayBuffer(2),true);
 await Promise.resolve();x.speech(true);decode.resolve({duration:.01});await sleep(80);assert.equal(x.plays(),0);
 x.speech(false);x.now(12000);await pending;assert.equal(x.plays(),1);
});
test('actual low-level playback drops a decoded clip when its turn was cancelled',{timeout:1000},async()=>{
 const x=environment(),decode=deferred();x.ctx.decodeAudioData=()=>decode.promise;
 const pending=makePlay(x.env)(new ArrayBuffer(2),false);
 await Promise.resolve();x.env.numeroDuTourRef.current++;decode.resolve({duration:.01});
 assert.equal(await pending,0);assert.equal(x.plays(),0);
});

