import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import crypto from 'node:crypto';
function load(file,deps={},env={}){const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',...Object.keys(env),js)(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(env));return m.exports;}
const cache=load('lib/cache-voix-dialogue.ts'),{ouvrirRepliques}=load('lib/flux-repliques.ts');
const delay=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const audio=i=>({type:'morceau',partie:i,parties:3,empreinte:'same',audio:'clip'+i});
test('one connection exposes first audio immediately and drains later clips without another request',async()=>{
 let controller;const stream=new ReadableStream({start(c){controller=c;}}),enc=new TextEncoder();const emit=x=>controller.enqueue(enc.encode(JSON.stringify(x)+'\n'));let closed=0;
 const f=ouvrirRepliques(new Response(stream),()=>closed++);const first=f.morceau(0);emit(audio(0));assert.equal((await first).audio,'clip0');
 emit(audio(1));emit(audio(2));emit({type:'fin'});controller.close();await new Promise(r=>setTimeout(r,0));
 assert.equal((await f.morceau(1)).audio,'clip1');assert.equal((await f.morceau(2)).audio,'clip2');assert.equal(closed,1);
});
test('missing, changed, reordered and failed packets stop before skipping any clip',async()=>{
 for(const packet of [{...audio(1),partie:2},{...audio(1),empreinte:'changed'},{type:'erreur',error:'gpu'}]){
  let c;const f=ouvrirRepliques(new Response(new ReadableStream({start(x){c=x;}})),()=>{}),enc=new TextEncoder();
  const p=f.morceau(0);c.enqueue(enc.encode(JSON.stringify(audio(0))+'\n'));await p;
  const next=f.morceau(1);c.enqueue(enc.encode(JSON.stringify(packet)+'\n'));await assert.rejects(next);
 }
});
test('bounded cache expires, isolates voices and evicts least recently used audio',()=>{
 let now=0;const c=new cache.CacheVoixDialogue(10,50,()=>now);c.set('female','a',5);c.set('male','b',5);assert.equal(c.get('female'),'a');c.set('other','c',5);assert.equal(c.get('male'),undefined);now=51;assert.equal(c.get('female'),undefined);c.set('large','x',11);assert.equal(c.get('large'),undefined);
});
function route(){
 let plans=0,calls=0;const gate=delay(),count={flux:0,clips:0,cache:0,erreurs:0};
 const r=load('app/api/chatterbox-test/bia/route.ts',{'@/lib/prise-voix':load('lib/prise-voix.ts',{'node:crypto':crypto}),
 '@/lib/passages-khalam':{preparerPassagesKhalam:async()=>{plans++;return [{texte:'Dañu bëgg ma def',langue:'wo'},{texte:'lu ma bëggul.',langue:'wo'}];}},
 '@/lib/langue':{detecterLangue:()=> 'wo'},'next/server':{NextRequest:Request,NextResponse:{json:Response.json}},'node:crypto':crypto,
 '@/lib/codes':{verifierCode:()=>({ok:true})},'../route':{POST:async req=>{calls++;const body=await req.json();if(calls===2)await gate.promise;return Response.json({status:'COMPLETED',output:{voice:'female',audio_base64:body.input.text,generation_ms:2,duration_seconds:1}});}},
 '@/lib/chatterbox-test-etat':{noterChatterboxTest(){}},'@/lib/cache-voix-dialogue':cache,'@/lib/continuite-voix-etat':{continuiteVoix:count},
 '@/lib/cache-accuses-lecon':{CacheAccusesLecon:class{get(){}set(){}}},
 },{process:{env:{CHATTERBOX_TEST_KEY:'test',CHATTERBOX_TEST_URL:'https://gpu.invalid'}}});
 return {gate,plans:()=>plans,calls:()=>calls,count,request:(extra={})=>r.POST(new Request('https://bia.invalid/tts',{method:'POST',body:JSON.stringify({texte:'Dañu bëgg ma def lu ma bëggul.',voice:'female',lecture_fidele:true,continu:true,...extra})}))};
}
test('actual server streams faithful chunks using one plan; replay reuses audio without GPU calls',async()=>{
 const r=route(),response=await r.request();assert.match(response.headers.get('content-type'),/ndjson/);const f=ouvrirRepliques(response,()=>{});
 const first=await f.morceau(0);assert.equal(first.audio,'Dañu bëgg ma def');assert.equal(r.plans(),1);r.gate.resolve();assert.equal((await f.morceau(1)).audio,'lu ma bëggul.');
 const replay=ouvrirRepliques(await r.request(),()=>{});assert.equal((await replay.morceau(0)).audio_en_cache,true);assert.equal((await replay.morceau(1)).audio_en_cache,true);assert.equal(r.calls(),2);
});

test('validating a source correction invalidates even identical previously generated audio',async()=>{
 const r=route();r.gate.resolve();const f=ouvrirRepliques(await r.request(),()=>{});await f.morceau(0);await f.morceau(1);assert.equal(r.calls(),2);
 globalThis.biaGenerationDevoirs=(globalThis.biaGenerationDevoirs||0)+1;
 const next=ouvrirRepliques(await r.request(),()=>{});assert.equal((await next.morceau(0)).audio_en_cache,false);await next.morceau(1);assert.equal(r.calls(),4);
});

test('explicit regeneration makes a new take even when identical text is already cached',async()=>{
 const r=route();r.gate.resolve();let f=ouvrirRepliques(await r.request(),()=>{});await f.morceau(0);await f.morceau(1);assert.equal(r.calls(),2);
 f=ouvrirRepliques(await r.request({nouvelle_prise:'new-take'}),()=>{});assert.equal((await f.morceau(0)).audio_en_cache,false);await f.morceau(1);assert.equal(r.calls(),4);
});


test('conversation uses the same continuous transport and bounded audio cache without forcing lesson chunking',async()=>{
 const r=route();r.gate.resolve();const f=ouvrirRepliques(await r.request({lecture_fidele:false}),()=>{});
 assert.equal((await f.morceau(0)).audio,'Dañu bëgg ma def');await f.morceau(1);
 const replay=ouvrirRepliques(await r.request({lecture_fidele:false}),()=>{});
 assert.equal((await replay.morceau(0)).audio_en_cache,true);await replay.morceau(1);assert.equal(r.calls(),2);
 const page=fs.readFileSync('app/page.tsx','utf8');
 const start=page.indexOf('const transport=transportConversation(');
 assert(start>=0);
 const branch=page.slice(start,page.indexOf('const demander = async (partie: number)',start));
 assert.match(branch,/lecture_fidele:Boolean\(lecture\),continu:true/);
});
test('transport comparison joins complete PCM frames without deleting even tiny samples',async()=>{
 const source=fs.readFileSync('lib/essai-transport-voix.ts','utf8').replace(/^import .*;\n/gm,'');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {reunirWav}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const make=values=>{const b=Buffer.alloc(44+values.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(values.length*2,40);values.forEach((v,i)=>b.writeInt16LE(v,44+i*2));return b;};
 const a=make([0,1,-1,32767]),b=make([-32768,2,0]);const wav=reunirWav([a,b]);
 assert.deepEqual(wav.subarray(44),Buffer.concat([a.subarray(44),b.subarray(44)]));
 assert.equal(wav.readUInt32LE(40),14);assert.equal(wav.readUInt32LE(4),wav.length-8);
 assert.throws(()=>reunirWav([a.subarray(0,45)]));
});
test('only free French conversation uses token streaming; Wolof and faithful reading retain clips',()=>{
 const {transportConversation}=load('lib/transport-conversation.ts');
 assert.equal(transportConversation(true,'fr',false),'stream-fr');
 for(const [langue,lecture] of [['wo',false],['wo',true],['fr',true]])assert.equal(transportConversation(true,langue,lecture),'clips');
 assert.equal(transportConversation(false,'fr',false),'ordinaire');
});
test('French stream replays only validated completion and an embedded Wolof segment releases clips before GPU',async()=>{
 let calls=0,langue='fr',upstreamSuccess=0,texte='Le budget est limité.',fail=false;
 const sha='b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75';
 const frames=[{type:'meta',sample_rate:24000,voice:'female',checkpoint_sha256:sha},{type:'audio',sequence:0,offset_samples:0,samples:2,audio_base64:'audio'},{type:'end',packets:1,samples:2,generation_ms:1}];
 const route=load('app/api/chatterbox-test/bia/stream/route.ts',{
 '@/lib/langue':{detecterLangue:()=>langue},'@/lib/passages-khalam':{preparerPassagesKhalam:async()=>[{texte,langue}]},'next/server':{NextRequest:Request,NextResponse:{json:Response.json}},'node:crypto':crypto,'@/lib/cache-voix-dialogue':cache,'@/lib/codes':{verifierCode:()=>({ok:true})},'@/lib/chatterbox-test-etat':{noterChatterboxTest:()=>upstreamSuccess++},
 },{process:{env:{CHATTERBOX_TEST_URL:'https://gpu.invalid',CHATTERBOX_TEST_KEY:'test-only'}},fetch:async()=>{calls++;return new Response((fail?frames.slice(0,2):frames).map(f=>JSON.stringify(f)).join('\n')+'\n');}});
 const request=()=>route.POST(new Request('https://bia.invalid',{method:'POST',body:JSON.stringify({texte:'Le budget est limité.',voice:'female',langue:'fr',fr_seulement:true})}));
 const a=await request();const first=(await a.text()).trim().split('\n').map(JSON.parse);assert.equal(first[1].audio_base64,'audio');assert.equal(calls,1);
 const b=await request();const replay=(await b.text()).trim().split('\n').map(JSON.parse);assert(replay[0].audio_en_cache);assert.equal(calls,1);assert.equal(upstreamSuccess,1);
 globalThis.biaGenerationPrononciation=(globalThis.biaGenerationPrononciation||0)+1;
 await (await request()).text();assert.equal(calls,2);
 langue='wo';const skip=await request();assert.equal(skip.status,409);assert.equal(skip.headers.get('x-bia-stream-skipped'),'language');assert.equal(calls,2);
 langue='fr';texte='Le budget est différent.';fail=true;assert.match(await (await request()).text(),/\"type\":\"error\"/);assert.equal(calls,3);
 fail=false;await (await request()).text();assert.equal(calls,4);await (await request()).text();assert.equal(calls,4);
});
