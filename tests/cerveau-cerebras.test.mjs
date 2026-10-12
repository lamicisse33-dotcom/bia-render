import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
const compile=p=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
let source=ts.transpileModule(fs.readFileSync('lib/cerveau-cerebras.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
source=source.replace('"./reprise-modele"',JSON.stringify(compile('lib/reprise-modele.ts')));
const {appelerCerebras}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('Cerebras sends authenticated context and supported reasoning without Groq-only parameters or fallback',async()=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify({error:'busy'}),{status:429,headers:{'Retry-After':'120'}})};
 try{
 const messages=[{role:'system',content:'Résumé : Awa refuse un emprunt.'},{role:'user',content:'Pourquoi ?'}];
 const r=await appelerCerebras('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer synthetic-test-key'},body:JSON.stringify({model:'gpt-oss-120b',messages,reasoning_effort:'medium',max_completion_tokens:2048,include_reasoning:false,service_tier:'on_demand'})},Date.now()+1000,false);
 assert.equal(r.status,429);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.cerebras.ai/v1/chat/completions');
 assert.equal(calls[0].init.headers.Authorization,'Bearer synthetic-test-key');
 const body=JSON.parse(calls[0].init.body);
 assert.deepEqual(body.messages,messages);assert.equal(body.reasoning_effort,'medium');assert.equal(body.reasoning_format,'hidden');assert.equal(body.max_completion_tokens,2048);
 assert.equal(body.include_reasoning,undefined);assert.equal(body.service_tier,undefined);assert.equal(body.model,'gpt-oss-120b');
 }finally{globalThis.fetch=original;}
});

test('billing refusal switches credentials once and shares the circuit with subsequent lesson selections',async()=>{
 const original=globalThis.fetch,previous=process.env.GROQ_API_KEY;process.env.GROQ_API_KEY='groq-test-only';
 const calls=[];
 globalThis.fetch=async(url,init)=>{
  calls.push({url,headers:new Headers(init.headers),body:JSON.parse(init.body)});
  return url.includes('cerebras')?new Response('{"error":"payment required"}',{status:402}):new Response(JSON.stringify({model:'openai/gpt-oss-120b',choices:[{message:{content:'{"statut":"selection","id":"0:1"}'}}]}));
 };
 try{
  const init={method:'POST',headers:{Authorization:'Bearer cerebras-test-only'},body:JSON.stringify({model:'gpt-oss-120b',stream:false,messages:[{role:'user',content:'Choose exact lesson ID'}],reasoning_format:'hidden',max_completion_tokens:1536})};
  const r=await appelerCerebras('',init,Date.now()+2500);
  assert.equal(r.status,200);assert.equal(r.headers.get('x-bia-provider'),'groq');
  assert.equal((await r.json()).choices[0].message.content,'{"statut":"selection","id":"0:1"}');
  await appelerCerebras('',init,Date.now()+2500);
  assert.equal(calls.length,3);assert.match(calls[0].url,/cerebras/);
  for(const c of calls.slice(1)){assert.match(c.url,/groq/);assert.equal(c.headers.get('authorization'),'Bearer groq-test-only');assert.equal(c.body.reasoning_format,undefined);assert.equal(c.body.max_completion_tokens,1536);assert.equal(c.body.model,'openai/gpt-oss-120b');}
 }finally{globalThis.fetch=original;if(previous===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=previous;}
});

test('without configured backup billing failure stays explicit and never fabricates a reply',async()=>{
 const original=globalThis.fetch,previous=process.env.GROQ_API_KEY;delete process.env.GROQ_API_KEY;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('payment required',{status:402});};
 try{const r=await appelerCerebras('',{body:'{}'},Date.now()+2500);assert.equal(r.status,402);assert.equal(await r.text(),'payment required');assert.equal(calls,1);}
 finally{globalThis.fetch=original;if(previous!==undefined)process.env.GROQ_API_KEY=previous;}
});

test('backup forwards the first streaming event without waiting for completion',async()=>{
 const original=globalThis.fetch,previous=process.env.GROQ_API_KEY;process.env.GROQ_API_KEY='groq-test-only';
 globalThis.fetch=async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: first\n\n'));}}),{headers:{'content-type':'text/event-stream'}});
 try{
  const r=await Promise.race([appelerCerebras('',{body:JSON.stringify({model:'gpt-oss-120b',stream:true})},Date.now()+2500),new Promise((_,reject)=>setTimeout(()=>reject(Error('stream buffered')),100))]);
  assert.equal(r.headers.get('x-bia-provider'),'groq');const reader=r.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'data: first\n\n');await reader.cancel();
 }finally{globalThis.fetch=original;if(previous===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=previous;}
});
