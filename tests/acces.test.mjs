import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(path,deps={},globals={}){
 const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',...Object.keys(globals),js)(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(globals));return m.exports;
}
function fixture(){
 const env={BIA_CODE_MAITRE:'TEST-MASTER-ONLY',BIA_SECRET:'test-signing-key',BIA_MAX_QUESTIONS:'2'};
 const nombre={nombreDeLEnvironnement:(v,f)=>Number(v)||f};
 const codes=load('lib/codes.ts',{'node:crypto':crypto,'./nombre-env':nombre},{process:{env}});
 const deps={'next/server':{NextResponse:Response},'@/lib/codes':codes,'@/lib/nombre-env':nombre};
 return {codes,acces:load('app/api/acces/route.ts',deps),gestion:load('app/api/codes/route.ts',deps,{process:{env}})};
}
const req=code=>new Request('https://app.khalam.app/api/acces',{headers:code?{'x-bia-code':code}:{}});
test('entry rejects missing, invalid, expired and exhausted codes; access checks do not consume questions',async()=>{
 const {codes,acces,gestion}=fixture();
 for(const code of [null,'WRONG',codes.creerCode(-2)])assert.equal((await acces.GET(req(code))).status,401);
 assert.deepEqual(await (await acces.GET(req('TEST-MASTER-ONLY'))).json(),{ok:true,maitre:true});
 const code=codes.creerCode(1);
 for(let i=0;i<5;i++){
  const r=await acces.GET(req(code));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{ok:true,maitre:false});
  assert.equal((await gestion.GET(req(code))).status,401);
 }
 assert(codes.verifierCode(code).ok);assert(codes.verifierCode(code).ok);
 assert(codes.verifierCode(code,false).ok,'last allowed answer must still be able to play its audio');
 assert.equal((await acces.GET(req(code))).status,401);
});
test('only master can create usable codes; foreign origins are rejected',async()=>{
 const {codes,acces,gestion}=fixture();
 const post=(code,origin='https://app.khalam.app')=>gestion.POST(new Request('https://app.khalam.app/api/codes',{method:'POST',headers:{'content-type':'application/json','x-bia-code':code,origin},body:JSON.stringify({heures:24,nom:'Awa'})}));
 assert.equal((await post(codes.creerCode(1))).status,403);
 assert.equal((await post('TEST-MASTER-ONLY','https://foreign.test')).status,403);
 const r=await post('TEST-MASTER-ONLY');assert.equal(r.status,200);const d=await r.json();assert.equal(d.adresse,'app.khalam.app');assert.equal(d.nom,'Awa');
 assert.deepEqual(await (await acces.GET(req(d.code))).json(),{ok:true,maitre:false});
});
test('client requires positive server validation before accepting access',async()=>{
 for(const response of [Response.json({ok:false,erreur:'Code refusé'},{status:401}),Response.json({maitre:true}),Response.json({ok:true},{status:500})]){
  const api=load('lib/acces-client.ts',{}, {fetch:async()=>response});await assert.rejects(api.verifierAcces('test'));
 }
 const api=load('lib/acces-client.ts',{}, {fetch:async(url,init)=>{assert.equal(url,'/api/acces');assert.equal(init.headers['x-bia-code'],'test');return Response.json({ok:true,maitre:false});}});
 assert.deepEqual(await api.verifierAcces('test'),{maitre:false});
});
