import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('lib/mesure-reception-audio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {mesurerReceptionAudio}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const line=d=>JSON.stringify(d)+'\n';
const audio=n=>({type:'audio',sequence:n,offset_samples:2*n,samples:2,audio_base64:'a-private-payload'});
function witness(chunks){
 let i=0,clock=0,cancelled=false;
 const body=new ReadableStream({pull(c){if(i===chunks.length){clock+=5;c.close();return;}const [ms,value]=chunks[i++];clock=ms;c.enqueue(new TextEncoder().encode(value));},cancel(){cancelled=true;}},{highWaterMark:0});
 const observed=mesurerReceptionAudio(new Response(body,{headers:{'content-type':'application/x-ndjson'}}),0,()=>clock);
 return {...observed,cancelled:()=>cancelled};
}
test('metadata is not audio; fragmented packets retain exact bytes and distinct arrival times',async()=>{
 const a=line(audio(0)),b=line(audio(1)),end=line({type:'end',packets:2,samples:4,generation_ms:490});
 const chunks=[[10,line({type:'meta',audio_en_cache:false})],[100,a.slice(0,20)],[300,a.slice(20)],[500,b+end]];
 const w=witness(chunks),reader=w.response.body.getReader();let received='';
 received+=new TextDecoder().decode((await reader.read()).value);assert.equal(w.bilan().premier_octet_ms,10);assert.equal(w.bilan().premier_audio_ms,null);
 received+=new TextDecoder().decode((await reader.read()).value);assert.equal(w.bilan().premier_audio_ms,null);
 for(;;){const r=await reader.read();if(r.done)break;received+=new TextDecoder().decode(r.value);}
 assert.equal(received,chunks.map(c=>c[1]).join(''));
 const t=w.bilan();assert.equal(t.premier_audio_ms,300);assert.equal(t.dernier_audio_ms,500);assert.equal(t.fin_flux_ms,500);assert.equal(t.fermeture_http_ms,505);assert.equal(t.ecart_premier_dernier_audio_ms,200);assert.equal(t.paquets_audio,2);assert.equal(t.lectures_avec_audio,2);assert.deepEqual(t.arrivees_audio_ms,[300,500]);assert.equal(t.generation_progressive_confirmee,false);assert(!JSON.stringify(t).includes('a-private-payload'));
});
test('multiple audio packets delivered in one HTTP read do not imply progressive generation',async()=>{
 const w=witness([[2000,line({type:'meta',audio_en_cache:true})+line(audio(0))+line(audio(1))+line({type:'end',packets:2,samples:4,generation_ms:1800})]]);
 await w.response.text();const t=w.bilan();assert.equal(t.paquets_audio,2);assert.equal(t.lectures_avec_audio,1);assert.equal(t.ecart_premier_dernier_audio_ms,0);assert.equal(t.audio_en_cache,true);assert.equal(t.generation_progressive_confirmee,false);
});
test('cancellation reaches the source and snapshots cannot mutate retained measurements',async()=>{
 const w=witness([[10,line({type:'meta'})],[20,line(audio(0))],[30,line(audio(1))]]),r=w.response.body.getReader();await r.read();await r.read();const snapshot=w.bilan();snapshot.arrivees_audio_ms.push(999);assert.deepEqual(w.bilan().arrivees_audio_ms,[20]);await r.cancel();assert.equal(w.cancelled(),true);assert.equal(w.bilan().fin_flux_ms,null);
});
test('long streams retain bounded timing samples and continue forwarding every packet',async()=>{
 const chunks=[[0,line({type:'meta'})],...Array.from({length:40},(_,n)=>[n+1,line(audio(n))]),[50,line({type:'end',packets:40,samples:80,generation_ms:48})]];
 const w=witness(chunks);const text=await w.response.text();assert.equal(text,chunks.map(c=>c[1]).join(''));assert.equal(w.bilan().paquets_audio,40);assert.equal(w.bilan().arrivees_audio_ms.length,16);assert.equal(w.bilan().dernier_audio_ms,40);
});
