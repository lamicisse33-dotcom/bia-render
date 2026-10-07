import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
const compile = (source,module=ts.ModuleKind.CommonJS) => ts.transpileModule(source,{compilerOptions:{module,target:ts.ScriptTarget.ES2022}}).outputText;
const key='test-voice-key';
const checkpoint='c1a0245aeca8a3b94a7986f83cf6a84033900ed8fce5788750fba479ffba0507';
class NextRequest extends Request {}
const NextResponse={json:(data,init)=>new Response(JSON.stringify(data),init)};
function route(fetch, child=false) {
  const errors=[],counts=[];
  const module={exports:{}};
  const modules={'next/server':{NextRequest,NextResponse},'node:crypto':crypto,
    '@/lib/codes':{verifierCode:()=>({ok:false})},'../route':{POST:fetch},
    '@/lib/chatterbox-test-etat':{noterChatterboxTest:(voice,result)=>counts.push({voice,...result})}};
  new Function('require','module','exports','process','fetch','console',compile(fs.readFileSync(child?'app/api/chatterbox-test/bia/route.ts':'app/api/chatterbox-test/route.ts','utf8')))(id=>modules[id],module,module.exports,{env:{CHATTERBOX_TEST_URL:'https://gpu.test',CHATTERBOX_TEST_KEY:key}},fetch,{error:(...x)=>errors.push(x)});
  return {...module.exports,errors,counts};
}
const request=(body={input:{text:'Bonjour',voice:'female'}})=>new NextRequest('https://bia.test/api/chatterbox-test',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':key},body:JSON.stringify(body)});
test('a saturated GPU remains a retryable 429 instead of an unexplained 502',async()=>{
  const api=route(async()=>new Response('',{status:429}));
  const r=await api.POST(request());assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'2');
  assert.equal((await r.json()).code,'GPU_OCCUPE');assert.equal(api.errors.length,1);
});
test('invalid audio and network failures have distinct sanitized diagnostics',async()=>{
  const bad=route(async()=>NextResponse.json({status:'COMPLETED',output:{checkpoint_sha256:'wrong'}}));
  assert.equal((await (await bad.POST(request())).json()).code,'AUDIO_INVALIDE');
  const late=route(async()=>{throw new DOMException('timeout','TimeoutError');});
  assert.equal((await (await late.POST(request())).json()).code,'DELAI_DEPASSE');
});
test('valid completed audio still reaches the client',async()=>{
  const api=route(async()=>NextResponse.json({status:'COMPLETED',output:{audio_base64:'UklGRg==',checkpoint_sha256:checkpoint,generation_ms:1500,duration_seconds:2,voice:'female'}}));
  const r=await api.POST(request());assert.equal(r.status,200);assert.equal((await r.json()).output.voice,'female');
});
test('segmented BIA route preserves backoff and records the specific failure',async()=>{
  const api=route(async()=>NextResponse.json({error:'occupé',code:'GPU_OCCUPE'},{status:429}),true);
  const r=await api.POST(request({texte:'Bonjour',voice:'female',partie:0}));
  assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'2');assert.equal((await r.json()).code,'GPU_OCCUPE');
  assert.deepEqual(api.counts,[{voice:'female',ok:false,code:'GPU_OCCUPE',status:429}]);
});
const page=ts.createSourceFile('page.tsx',fs.readFileSync('app/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let speak,demander;
function walk(node){if(ts.isVariableDeclaration(node)&&node.name.getText(page)==='speak')speak=node.initializer.arguments[0];ts.forEachChild(node,walk);}
walk(page);
function inner(node){if(ts.isVariableDeclaration(node)&&node.name.getText(page)==='demander')demander=node.initializer.getText(page);ts.forEachChild(node,inner);}
inner(speak);
const make=new Function('env',`with(env){${compile('const demander = '+demander+';',ts.ModuleKind.ESNext)}return demander;}`);
function envFor(responses){
  let current=true;const waits=[],calls=[];
  const env={actuel:()=>current,routeVoix:'/voice',codeRef:{current:'test'},answer:'Bonjour',ou:'réponse',langueDite:'fr',voixChoisie:'female',suite:false,voixAudioPrompt:()=>'',
    fetch:async()=>{calls.push(1);return responses.shift();},setTimeout:(fn,ms)=>{waits.push(ms);fn();}};
  return {env,waits,calls,cancel:()=>{current=false;}};
}
test('client waits for GPU backoff and recovers the same audio segment',async()=>{
  const x=envFor([new Response('',{status:429,headers:{'retry-after':'2'}}),NextResponse.json({audio:'ok',parties:1})]);
  const d=await make(x.env)(0);assert.equal(d.audio,'ok');assert.deepEqual(x.waits,[2000]);assert.equal(x.calls.length,2);
});
test('interruption cancels further retries of an obsolete voice segment',async()=>{
  const x=envFor([new Response('',{status:429})]);
  x.env.setTimeout=fn=>{x.cancel();fn();};
  await assert.rejects(make(x.env)(0),/tour interrompu/);assert.equal(x.calls.length,1);
});
