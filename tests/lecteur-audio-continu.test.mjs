import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/lecteur-audio-continu.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);const {LecteurAudioContinu}=m.exports;
function setup(){const sources=[],ctx={currentTime:0,destination:{},createBufferSource(){const s={connect(){},disconnect(){},stop(){this.stopped=true;},start(t,offset){this.t=t;this.offset=offset;},onended:null};sources.push(s);return s;}};let first=0;return {sources,ctx,file:new LecteurAudioContinu(ctx,()=>first++),first:()=>first};}
test('next clip is scheduled while the first still plays, with no decoding gap',async()=>{
 const {ctx,sources,file,first}=setup();file.ajouter({duration:2});ctx.currentTime=.8;file.ajouter({duration:1});
 assert.equal(sources[0].t,.025);assert.equal(sources[1].t,2.025);assert.equal(file.bilan.couture_max_ms,0);assert.equal(first(),1);
 let ended=false;const done=file.terminer().then(()=>ended=true);sources[0].onended();await Promise.resolve();assert.equal(ended,false);sources[1].onended();await done;assert(ended);
});
test('pause resumes the current syllable offset and retains the unplayed next clip',async()=>{
 const {ctx,sources,file}=setup();file.ajouter({duration:2});file.ajouter({duration:1});ctx.currentTime=1.025;file.pause();assert(sources.every(x=>x.stopped));
 ctx.currentTime=5;file.reprendre();assert(Math.abs(sources[2].offset-1)<1e-9);assert.equal(sources[3].offset,0);assert.equal(sources[3].t,6.025);
 const done=file.terminer();sources[2].onended();sources[3].onended();await done;
});
test('stop prevents buffered clips and rejects completion without claiming the sentence was read',async()=>{
 const {file,sources}=setup();file.ajouter({duration:2});file.ajouter({duration:1});const done=file.terminer();file.arreter();await assert.rejects(done,/arrêté/);assert(sources.every(x=>x.stopped));assert.throws(()=>file.ajouter({duration:1}),/arrêté/);
});
test('a late clip reports the actual gap and still plays in full',async()=>{
 const {ctx,file,sources}=setup();file.ajouter({duration:1});sources[0].onended();ctx.currentTime=2;file.ajouter({duration:1});assert.equal(sources[1].offset,0);assert.equal(file.bilan.couture_max_ms,1000);const done=file.terminer();sources[1].onended();await done;
});
test('only a short opening waits for one neighbour; long openings start immediately',async()=>{
 for(const duration of [.7,2]){
  const {ctx,sources}=setup();const file=new LecteurAudioContinu(ctx,()=>{},true);file.ajouter({duration});
  assert.equal(sources.length,duration<1.6?0:1);ctx.currentTime=.9;file.ajouter({duration:1});assert.equal(sources.length,2);
  assert(Math.abs(sources[1].t-sources[0].t-duration)<1e-9);assert.equal(file.bilan.couture_max_ms,0);
  const done=file.terminer();sources[0].onended();sources[1].onended();await done;
 }
});
