import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import crypto from 'node:crypto';
const fr='b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75',wo='8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f';
function setup(sha){let input;const m={exports:{}},deps={'@/lib/texte-khalam-voix':{sansGuillemetsFrancais:t=>t},'@/lib/langue':{detecterLangue:()=> 'wo'},'next/server':{NextResponse:{json:Response.json}},'node:crypto':crypto,'@/lib/codes':{verifierCode:()=>({ok:true})}};new Function('require','module','exports','process','fetch',ts.transpileModule(fs.readFileSync('app/api/chatterbox-test/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n];},m,m.exports,{env:{CHATTERBOX_TEST_URL:'https://gpu.invalid',CHATTERBOX_TEST_KEY:'test'}},async(_,r)=>{input=JSON.parse(r.body).input;return Response.json({status:'COMPLETED',output:{checkpoint_sha256:sha,audio_base64:'audio',generation_ms:1,duration_seconds:1,voice:'female'}});});return {input:()=>input,call:(language,extra={})=>m.exports.POST(new Request('https://bia.invalid',{method:'POST',body:JSON.stringify({input:{text:'Xale',language,voice:'female',...extra}})}))};}
test('the actual model checkpoint must match the requested language, not merely be an allowed model',async()=>{
 for(const language of ['wo','fr']){const right=setup(language==='wo'?wo:fr),wrong=setup(language==='wo'?fr:wo);assert.equal((await right.call(language)).status,200);assert.equal(right.input().language,language);const r=await wrong.call(language);assert.equal(r.status,502);assert.equal((await r.json()).code,'LANGUE_VOIX_INCORRECTE');}
});

test('GPU receives the requested take seed and rejects invalid seeds before synthesis',async()=>{
 const sha='8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f';
 const a=setup(sha);assert.equal((await a.call('wo',{seed:1234})).status,200);assert.equal(a.input().seed,1234);
 const b=setup(sha);assert.equal((await b.call('wo',{seed:-1})).status,400);assert.equal(b.input(),undefined);
});


test('GPU is never called to pronounce a punctuation-only input',async()=>{
 for(const text of ['?', ' ! ', '…']){
  const s=setup(wo);assert.equal((await s.call('wo',{text})).status,400);assert.equal(s.input(),undefined);
 }
});
