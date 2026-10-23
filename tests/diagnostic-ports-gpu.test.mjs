import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(){const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/diagnostic-ports-gpu.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);return m.exports;}
test('distinguishes the HTTPS gateway port from the pod port',()=>{
 const api=load();assert.deepEqual(api.portsAdresseGpu('https://example-8000.proxy.runpod.net'),{port_public:443,port_pod:8000});
 assert.deepEqual(api.portsAdresseGpu('http://127.0.0.1:8080'),{port_public:8080,port_pod:8080});
 assert.throws(()=>api.portsAdresseGpu('file:///etc/passwd'));
});
test('probes both configured health routes once without a key and separates gateway errors from accessible HTTP',async()=>{
 delete globalThis.biaPortsGpu;const api=load(),oldFetch=globalThis.fetch,oldEar=process.env.WOLOF_LOCAL_URL,oldVoice=process.env.CHATTERBOX_TEST_URL,calls=[];
 process.env.WOLOF_LOCAL_URL='https://example-8000.proxy.runpod.net';process.env.CHATTERBOX_TEST_URL='https://example-8001.proxy.runpod.net';
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response('{}',{status:url.includes('8000')?502:200});};
 try{
  await Promise.all([api.verifierPortsGpu(),api.verifierPortsGpu()]);assert.equal(calls.length,2);assert(calls.some(c=>c.url.endsWith('8000.proxy.runpod.net/asr/health')));assert(calls.some(c=>c.url.endsWith('8001.proxy.runpod.net/health')));assert(calls.every(c=>!c.options.headers&&c.url.endsWith('/health')));
  const d=api.resumePortsGpu();assert.equal(d.statut,'termine');assert.equal(d.cas.find(c=>c.role==='oreille').verdict,'passerelle_sans_service');assert.equal(d.cas.find(c=>c.role==='voix').verdict,'sante_http_accessible');assert(!JSON.stringify(d).includes('example-'));
 }finally{globalThis.fetch=oldFetch;if(oldEar===undefined)delete process.env.WOLOF_LOCAL_URL;else process.env.WOLOF_LOCAL_URL=oldEar;if(oldVoice===undefined)delete process.env.CHATTERBOX_TEST_URL;else process.env.CHATTERBOX_TEST_URL=oldVoice;}
});
