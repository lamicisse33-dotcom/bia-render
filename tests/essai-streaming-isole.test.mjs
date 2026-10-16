import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const transpile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
// Keep the real WAV validator; strip unrelated diagnostic imports/code.
const wavSource=fs.readFileSync('lib/essai-transport-voix.ts','utf8');
const wav=wavSource.slice(wavSource.indexOf('function pcmWav'),wavSource.indexOf('const normal='));
const moduleSource=fs.readFileSync('lib/essai-streaming-isole.ts','utf8').replace("import {reunirWav} from './essai-transport-voix';",wav.replace('export function reunirWav','function reunirWav'));
const source=transpile(moduleSource);
function makeWav(){const b=Buffer.alloc(48);b.write('RIFF');b.writeUInt32LE(40,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(4,40);return b.toString('base64');}
test('same input, alternating order, sequential requests, no ASR, and complete validated stream',async()=>{
 delete globalThis.biaStreamingIsole;process.env.CHATTERBOX_TEST_URL='https://example.test';process.env.CHATTERBOX_TEST_KEY='test';const original=globalThis.fetch;let calls=[],active=0,maxActive=0;
 globalThis.fetch=async(url,opts)=>{active++;maxActive=Math.max(active,maxActive);const body=JSON.parse(opts.body);calls.push({url,input:body.input});await Promise.resolve();active--;
 const sha=body.input.language==='fr'?'b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75':'8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f';
 if(url.endsWith('/stream'))return new Response([{type:'meta',checkpoint_sha256:sha,voice:'female',sample_rate:24000},{type:'audio',sequence:0,offset_samples:0,samples:2,audio_base64:makeWav()},{type:'end',packets:1,samples:2,generation_ms:1}].map(x=>JSON.stringify(x)+'\n').join(''));
 return Response.json({status:'COMPLETED',output:{checkpoint_sha256:sha,voice:'female',audio_base64:makeWav(),generation_ms:1}});};
 try{const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));await m.verifierStreamingIsole();await m.verifierStreamingIsole();assert.equal(calls.length,6);assert.equal(maxActive,1);for(let i=0;i<6;i+=2)assert.deepEqual(calls[i].input,calls[i+1].input);assert.deepEqual(calls.map(c=>c.url.split('/').at(-1)),['tts','stream','stream','tts','tts','stream']);assert(m.resumeStreamingIsole().serveur.cas.every(c=>c.pcm_identique));assert.equal(m.noterEssaiStreaming({mode:'stream',langue:'wo',premier_audio_ms:NaN}),false);
 }finally{globalThis.fetch=original;}
});
test('missing terminal packet is recorded as failure, never marked integral',async()=>{
 delete globalThis.biaStreamingIsole;const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('');
 try{const m=await import('data:text/javascript;base64,'+Buffer.from(source+'\n// missing tail case').toString('base64'));await m.verifierStreamingIsole();assert(m.resumeStreamingIsole().serveur.cas.every(c=>c.passes.every(p=>p.erreur&&!p.integrite)));}finally{globalThis.fetch=original;}
});
