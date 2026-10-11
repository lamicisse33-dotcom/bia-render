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
 const r=load('app/api/chatterbox-test/bia/route.ts',{
 '@/lib/passages-khalam':{preparerPassagesKhalam:async()=>{plans++;return [{texte:'Dañu bëgg ma def',langue:'wo'},{texte:'lu ma bëggul.',langue:'wo'}];}},
 '@/lib/langue':{detecterLangue:()=> 'wo'},'next/server':{NextRequest:Request,NextResponse:{json:Response.json}},'node:crypto':crypto,
 '@/lib/codes':{verifierCode:()=>({ok:true})},'../route':{POST:async req=>{calls++;const body=await req.json();if(calls===2)await gate.promise;return Response.json({status:'COMPLETED',output:{voice:'female',audio_base64:body.input.text,generation_ms:2,duration_seconds:1}});}},
 '@/lib/chatterbox-test-etat':{noterChatterboxTest(){}},'@/lib/cache-voix-dialogue':cache,'@/lib/continuite-voix-etat':{continuiteVoix:count},
 '@/lib/cache-accuses-lecon':{CacheAccusesLecon:class{get(){}set(){}}},
 },{process:{env:{CHATTERBOX_TEST_KEY:'test',CHATTERBOX_TEST_URL:'https://gpu.invalid'}}});
 return {gate,plans:()=>plans,calls:()=>calls,count,request:()=>r.POST(new Request('https://bia.invalid/tts',{method:'POST',body:JSON.stringify({texte:'Dañu bëgg ma def lu ma bëggul.',voice:'female',lecture_fidele:true,continu:true})}))};
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
