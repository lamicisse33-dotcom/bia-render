import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
const tick=()=>new Promise(r=>setTimeout(r,0));
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function load(path,imports={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(id=>{assert(id in imports,id);return imports[id];},m,m.exports);return m.exports;}

function voiceRoute(gpu,onGenerate){
 const Cache=class{get(){return undefined;}set(){}};
 return load('app/api/chatterbox-test/bia/route.ts',{
  '@/lib/prise-voix':{grainePriseVoix:()=>913},
  '@/lib/continuite-voix-etat':{continuiteVoix:{flux:0,clips:0,cache:0,erreurs:0}},
  '@/lib/cache-voix-dialogue':{CacheVoixDialogue:Cache},
  '@/lib/passages-khalam':{preparerPassagesKhalam:async()=>['Premier morceau.','Deuxième morceau.','Dernier morceau.'].map(texte=>({texte,langue:'wo'}))},
  '@/lib/langue':{detecterLangue:()=> 'wo'},'next/server':{NextRequest:Request,NextResponse:Response},
  'node:crypto':crypto,'@/lib/codes':{verifierCode:()=>({ok:true,maitre:true})},
  '../route':{POST:async req=>{const b=await req.json();await onGenerate(b.input.text);return Response.json({status:'COMPLETED',output:{voice:'female',audio_base64:'YXVkaW8=',generation_ms:1,sample_rate:24000}});}},
  '@/lib/chatterbox-test-etat':{noterChatterboxTest(){}},
  '@/lib/decoupage-voix-khalam':{},'@/lib/texte-khalam-voix':{},
  '@/lib/cache-accuses-lecon':{CacheAccusesLecon:Cache},'@/lib/lexique-apprentissage':{},
  '@/lib/anticipation-gpu':gpu,
 });
}
async function fixture(onGenerate){
 delete globalThis.biaFileAnticipation;
 const gpu=load('lib/anticipation-gpu.ts');
 const old={key:process.env.CHATTERBOX_TEST_KEY,url:process.env.CHATTERBOX_TEST_URL};
 process.env.CHATTERBOX_TEST_KEY='fixture';process.env.CHATTERBOX_TEST_URL='http://fixture';
 const route=voiceRoute(gpu,onGenerate),abort=new AbortController();
 const request=new Request('http://fixture/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-bia-code':'fixture'},body:JSON.stringify({texte:'Une phrase complète en plusieurs parties.',langue:'wo',voice:'female',continu:true,lecture_fidele:true,brique:true}),signal:abort.signal});
 const response=await route.POST(request);
 const reader=response.body.getReader(),events=[];
 const drain=(async()=>{const decoder=new TextDecoder();let buffer='';for(;;){const v=await reader.read();if(v.done)break;buffer+=decoder.decode(v.value,{stream:true});let n;while((n=buffer.indexOf('\n'))>=0){events.push(JSON.parse(buffer.slice(0,n)));buffer=buffer.slice(n+1);}}})();
 return {gpu,abort,events,drain,restore(){if(old.key===undefined)delete process.env.CHATTERBOX_TEST_KEY;else process.env.CHATTERBOX_TEST_KEY=old.key;if(old.url===undefined)delete process.env.CHATTERBOX_TEST_URL;else process.env.CHATTERBOX_TEST_URL=old.url;}};
}
test('actual continuous voice route lets ASR pass between ordered audio clips without simultaneous GPU work',async()=>{
 const first=deferred(),asrGate=deferred(),order=[];let active=0,max=0;
 const x=await fixture(async texte=>{max=Math.max(max,++active);order.push(texte);if(order.length===1)await first.promise;active--;});
 try{
  await tick();const asr=x.gpu.gpuAnticipation(async()=>{max=Math.max(max,++active);order.push('ASR');await asrGate.promise;active--;},2,{type:'ecoute'});
  await tick();assert.deepEqual(order,['Premier morceau.'],'running audio is not preempted');
  first.resolve();await tick();await tick();
  assert.deepEqual(order,['Premier morceau.','ASR']);
  assert.equal(x.events.filter(e=>e.type==='morceau').length,1,'first clip already reaches the reader while ASR and later clips remain pending');
  asrGate.resolve();await asr;await x.drain;
  assert.deepEqual(order,['Premier morceau.','ASR','Deuxième morceau.','Dernier morceau.']);assert.equal(max,1);
  const clips=x.events.filter(e=>e.type==='morceau');assert.deepEqual(clips.map(e=>e.partie),[0,1,2]);
  assert(clips.every(e=>e.voice==='female'&&e.empreinte===clips[0].empreinte&&e.parties===3));assert.equal(x.events.at(-1).type,'fin');
  const metrics=x.gpu.resumeFileAnticipation();assert.equal(metrics.types.audio.termines,3);assert.equal(metrics.types.ecoute.termines,1);assert.equal(metrics.en_attente,0);
 }finally{first.resolve();asrGate.resolve();x.restore();}
});
test('aborting a continuous brick waiting behind ASR prevents later audio generation',async()=>{
 const first=deferred(),asrGate=deferred(),order=[];
 const x=await fixture(async texte=>{order.push(texte);if(order.length===1)await first.promise;});
 try{
  const asr=x.gpu.gpuAnticipation(async()=>{order.push('ASR');await asrGate.promise;},2,{type:'ecoute'});
  first.resolve();await tick();await tick();x.abort.abort();asrGate.resolve();await asr;
  await tick();assert.deepEqual(order,['Premier morceau.','ASR']);
  await x.drain;assert(!x.events.some(e=>e.type==='fin'),'an aborted stream never claims complete EOS');
 }finally{first.resolve();asrGate.resolve();x.restore();}
});
test('queued cancellation is immediate and never runs obsolete work',async()=>{
 delete globalThis.biaFileAnticipation;const gpu=load('lib/anticipation-gpu.ts'),gate=deferred(),abort=new AbortController();
 const running=gpu.gpuAnticipation(()=>gate.promise,0,{type:'audio'});
 let ran=false;const pending=gpu.gpuAnticipation(async()=>{ran=true;},2,{type:'ecoute',signal:abort.signal});
 const checked=assert.rejects(pending);abort.abort();await checked;assert.equal(ran,false);gate.resolve();await running;await tick();assert.equal(ran,false);
});
