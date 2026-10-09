import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
async function load(path){const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));}
const {reveiller}=await load('lib/reveil-du-son.ts');
test('running audio needs no wake; interrupted audio awaits resume',async()=>{
 let calls=0;const ctx={state:'running',async resume(){calls++;this.state='running';}};
 assert.equal(await reveiller(ctx),true);assert.equal(calls,0);
 ctx.state='interrupted';assert.equal(await reveiller(ctx),true);assert.equal(calls,1);
});
test('Safari resume pending forever cannot block the response forever',async()=>{
 const start=Date.now();let calls=0;
 assert.equal(await reveiller({state:'suspended',resume(){calls++;return new Promise(()=>{});}},async()=>{}),false);
 assert.equal(calls,3);assert(Date.now()-start<1500);
});
function lexicon(){
 const exports={};let pending=[],calls=0;
 const js=ts.transpileModule(fs.readFileSync('lib/lexique-apprentissage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const context={exports,AbortSignal,Date,Promise,Set,JSON,Error,fetch(){calls++;return new Promise((resolve,reject)=>pending.push({resolve:rows=>resolve({ok:true,json:async()=>rows}),reject}));},require(name){
  if(name==='./lexique')return {lexiqueConfig:{actif:true,url:'https://example.invalid',table:'lexique',cle:'test'},ajouterCorrection:async()=>{}};
  if(name==='./prononciation')return {reglesPrononciation:async()=>[]};
  if(name==='./lexique-apprentissage-core')return {APP_LECONS:'test',dernieresLecons:rows=>rows,appliquerRegles:t=>t};
  throw Error(name);
 }};
 vm.runInNewContext(js,context);return {api:exports,next:()=>pending.shift(),calls:()=>calls};
}
test('all concurrent voice chunks share one fresh Supabase read',async()=>{
 const x=lexicon();const a=x.api.lireLecons(),b=x.api.lireLecons();assert.equal(a,b);assert.equal(x.calls(),1);
 x.next().resolve([]);await a;await x.api.lireLecons();assert.equal(x.calls(),1);
 const c=x.api.lireLecons(true),d=x.api.lireLecons(true);assert.equal(c,d);assert.equal(x.calls(),2);x.next().resolve([]);await c;
});
test('a lesson saved during a pending read invalidates that old snapshot',async()=>{
 const x=lexicon();const old=x.api.lireLecons();const oldRequest=x.next();
 await x.api.garderLecon({texte:'nouveau',langue:'wo'});
 const current=x.api.lireLecons();x.next().resolve([{texte:'nouveau'}]);await current;
 oldRequest.resolve([{texte:'ancien'}]);await old;
 assert.equal((await x.api.lireLecons())[0].texte,'nouveau');assert.equal(x.calls(),2);
});
test('failed Supabase read is not cached and can be retried',async()=>{
 const x=lexicon();const first=x.api.lireLecons();x.next().reject(Error('offline'));await assert.rejects(first);
 const retry=x.api.lireLecons();x.next().resolve([]);await retry;assert.equal(x.calls(),2);
});
