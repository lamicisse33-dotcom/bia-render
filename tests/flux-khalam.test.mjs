import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/flux-khalam.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {ouvrirFluxVoix}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const meta={type:'meta',parties:2,sample_rate:24000};const audio=n=>({type:'audio',sequence:n,offset_samples:n*24000,samples:24000,audio_base64:'UklGRg=='});
const line=d=>new TextEncoder().encode(JSON.stringify(d)+'\n');
test('first audio returns before remaining packets are generated',async()=>{
 let sink,cancelled=false;const response=new Response(new ReadableStream({start(c){sink=c;c.enqueue(line(meta));c.enqueue(line(audio(0)));}}));
 const first=await ouvrirFluxVoix(response,()=>cancelled=true);assert.equal(first.audio,'UklGRg==');assert.equal(first.parties,2);assert.equal(cancelled,false);
 sink.enqueue(line(audio(1)));sink.enqueue(line({type:'end',packets:2,samples:48000}));sink.close();
 const rest=[];for await(const a of first.flux)rest.push(a);assert.equal(rest.length,1);assert(cancelled);
});
test('arbitrary network chunk boundaries retain every packet',async()=>{
 const text=[meta,audio(0),audio(1),{type:'end',packets:2,samples:48000}].map(d=>JSON.stringify(d)+'\n').join('');
 const response=new Response(new ReadableStream({start(c){for(const ch of text)c.enqueue(new TextEncoder().encode(ch));c.close();}}));
 const first=await ouvrirFluxVoix(response,()=>{});const clips=[first.audio];for await(const clip of first.flux)clips.push(clip);assert.equal(clips.length,2);
});
test('missing tail, out-of-order packet and upstream error cannot appear complete',async()=>{
 for(const bad of [audio(2),{type:'error',error:'GPU failed'},null]){
  const response=new Response(new ReadableStream({start(c){c.enqueue(line(meta));c.enqueue(line(audio(0)));if(bad)c.enqueue(line(bad));c.close();}}));
  const first=await ouvrirFluxVoix(response,()=>{});await assert.rejects(async()=>{for await(const ignored of first.flux){};});
 }
});
test('explicit interruption cancels both reader and upstream request',async()=>{
 let readerCancelled=false,requestCancelled=false;
 const response=new Response(new ReadableStream({start(c){c.enqueue(line(meta));c.enqueue(line(audio(0)));},cancel(){readerCancelled=true;}}));
 const first=await ouvrirFluxVoix(response,()=>requestCancelled=true);first.annuler();await Promise.resolve();assert(readerCancelled);assert(requestCancelled);
});
