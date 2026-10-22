import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const load=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(load('lib/comparaison-transcription-audio.ts')).toString('base64'));
test('alignment reports omitted ending and substitutions without exposing recognized-only words',()=>{
 const a=m.comparerTranscriptionAudio('Mu dem ci kër ga.','Mu dem');assert.equal(a.suppressions,3);assert.deepEqual(a.mots_reference_non_retrouves,['ci','ker','ga']);assert.equal(a.validation_humaine,false);
 const b=m.comparerTranscriptionAudio('Mu dem ci kër ga.','Mu private ci kër ga.');assert.equal(b.substitutions,1);assert.deepEqual(b.mots_reference_non_retrouves,['dem']);assert(!JSON.stringify(b).includes('private'));
});
test('punctuation/diacritics are spelling normalization, never human approval; excessive input is rejected',()=>{
 const r=m.comparerTranscriptionAudio('Jënd soble, ak tamaate.','Jend soble ak tamaate');assert.equal(r.identique_normalise,true);assert.equal(r.validation_humaine,false);assert.throws(()=>m.comparerTranscriptionAudio('a','x '.repeat(401)),/trop_longue/);
});
test('retained audio endpoint authenticates before reading takes and default status cannot expose them',async()=>{
 const source=load('app/api/essai-streaming/route.ts').replace("import { verifierCode } from '@/lib/codes';",'const verifierCode=globalThis.__codesStreaming;').replace("import { noterEssaiStreaming, resumeStreamingIsole, prisesStreamingIsole } from '@/lib/essai-streaming-isole';",'const {noterEssaiStreaming,resumeStreamingIsole,prisesStreamingIsole}=globalThis.__streamingTest;');
 let reads=0;globalThis.__codesStreaming=code=>({ok:['owner','guest'].includes(code),maitre:code==='owner'});globalThis.__streamingTest={noterEssaiStreaming:()=>true,resumeStreamingIsole:()=>({serveur:{statut:'termine'}}),prisesStreamingIsole:()=>{reads++;return {prises:[{audio:'retained-wave'}]};}};
 try{
  const route=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  for(const code of ['','guest'])assert.equal((await route.GET(new Request('https://example.test/api/essai-streaming?prises=1',{headers:{'x-bia-code':code}}))).status,401);assert.equal(reads,0);
  const ordinary=await route.GET(new Request('https://example.test/api/essai-streaming',{headers:{'x-bia-code':'owner'}}));assert(!JSON.stringify(await ordinary.json()).includes('retained-wave'));assert.equal(reads,0);
  const privateResponse=await route.GET(new Request('https://example.test/api/essai-streaming?prises=1',{headers:{'x-bia-code':'owner'}}));assert.equal(privateResponse.headers.get('cache-control'),'no-store');assert.equal((await privateResponse.json()).prises[0].audio,'retained-wave');assert.equal(reads,1);
 }finally{delete globalThis.__codesStreaming;delete globalThis.__streamingTest;}
});
