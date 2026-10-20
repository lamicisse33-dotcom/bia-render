import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
async function load(p){return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))}
const micro=await load('lib/micro.ts'),diff=await load('lib/diffusion.ts');
test('owner-selected endpoint is exactly 400 ms for greetings, stories and recorded early cuts',()=>{for(const duration of [0,300,700,2500,7000,120000])for(const cuts of [0,2,100])assert.equal(micro.silenceQuiSuffit(duration,cuts),400)});
test('a short complete useful sentence can start before the next sentence without speaking partial text or commands',()=>{assert.equal(diff.teteDeLaReponse('Tu peux essayer.'),'Tu peux essayer.');assert.equal(diff.teteDeLaReponse('Tu peux essayer'), '');assert.equal(diff.teteDeLaReponse('[[carte:Dakar]] Tu peux essayer.'),'');assert.equal(diff.resteADire('Tu peux essayer. Ensuite, appelle-la.','Tu peux essayer.'),'Ensuite, appelle-la.')});

