import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(fetch){const m={exports:{}};new Function('module','exports','fetch','globalThis','process',compile(fs.readFileSync('lib/cerveau-anthropic.ts','utf8')))(m,m.exports,fetch,{}, {env:{}});return m.exports;}
test('Sonnet 5.5 uses the supported fast settings and preserves tools, messages and output ceiling',async()=>{
 let call;const api=load(async(url,init)=>{call={url,init,body:JSON.parse(init.body)};return Response.json({content:[{type:'text',text:'Réponse'}]});});
 const r=await api.fetchAnthropic('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':'test-only'},body:JSON.stringify({model:api.MODELE_SONNET,max_tokens:256,temperature:0,thinking:{type:'disabled'},tools:[{name:'lookup'}],system:'Do not rewrite.',messages:[{role:'user',content:'Nanga def?'}]})},Date.now()+2500);
 assert.equal(r.status,200);assert.deepEqual(call.body.thinking,{type:'between_tools'});assert.deepEqual(call.body.output_config,{effort:'low'});assert.equal(call.body.temperature,undefined);assert.equal(call.body.max_tokens,256);assert.equal(call.body.tools[0].name,'lookup');assert.equal(call.body.messages[0].content,'Nanga def?');assert.equal(api.contenuAnthropic(await r.json()),'Réponse');
});
test('all compact context survives native conversion and a live stream remains readable',async()=>{
 const api=load(async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: first\n\n'));}}),{headers:{'content-type':'text/event-stream'}}));
 const native=api.messagesAnthropic([{role:'system',content:'Personnalité'},{role:'system',content:'Leçon exacte'},{role:'user',content:'Non.'},{role:'system',content:'Réponds en wolof'}]);
 assert.deepEqual(native.system.map(x=>x.text),['Personnalité','Leçon exacte','Réponds en wolof']);assert.deepEqual(native.messages,[{role:'user',content:'Non.'}]);
 const r=await api.fetchAnthropic('https://api.anthropic.com/v1/messages',{body:JSON.stringify({model:api.MODELE_SONNET,...native,stream:true})});
 const reader=r.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'data: first\n\n');await reader.cancel();
});
test('rejected credentials and billing errors stay explicit',async()=>{
 for(const status of [400,401,402]){
 const api=load(async()=>Response.json({error:{message:'rejected'}},{status}));
 const r=await api.fetchAnthropic('https://api.anthropic.com/v1/messages',{body:JSON.stringify({model:api.MODELE_SONNET})});
 assert.equal(r.status,status);assert.equal(api.resumeAnthropic().erreurs,1);
 }
});
