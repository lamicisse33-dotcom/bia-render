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
