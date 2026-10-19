import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';

function load(path, deps, globals={}) {
 const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};
 new Function('require','module','exports',...Object.keys(globals),js)(id=>{assert(id in deps,id);return deps[id]},m,m.exports,...Object.values(globals));
 return m.exports;
}
function fixture() {
 const env={BIA_SECRET:'isolated-test-secret',BIA_CODE_MAITRE:'TESTMASTER',BIA_MAX_QUESTIONS:'2',CHATTERBOX_TEST_KEY:'isolated-gpu-secret',CHATTERBOX_TEST_URL:'https://gpu.invalid'};
 const codes=load('lib/codes.ts',{'node:crypto':crypto,'./nombre-env':{nombreDeLEnvironnement:(v,f)=>Number(v)||f}},{process:{env}});
 function route(path) {
  // Load the complete route. Any unexpected backend operation fails the test.
  const deps={};const source=fs.readFileSync(path,'utf8');
  const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
  for(const n of ast.statements)if(ts.isImportDeclaration(n)) {
   const id=n.moduleSpecifier.text;const names=n.importClause?.namedBindings?.elements||[];
   deps[id]=Object.fromEntries(names.map(x=>[x.propertyName?.text||x.name.text,()=>{throw Error('Unexpected backend operation: '+id+'.'+x.name.text)}]));
  }
  Object.assign(deps,{'node:crypto':crypto,'next/server':{NextRequest:Request,NextResponse:Response},'@/lib/codes':codes});
  for(const id of ['@/lib/cache-voix-dialogue','@/lib/cache-accuses-lecon'])if(id in deps)for(const name of Object.keys(deps[id]))deps[id][name]=class {};
  if(deps['@/lib/langue'])deps['@/lib/langue'].detecterLangue=()=> 'fr';
  if(deps['@/lib/nombres'])deps['@/lib/nombres'].pourLaVoix=x=>x;
  if(deps['@/lib/prononciation'])deps['@/lib/prononciation'].prononcer=x=>x;
  if(deps['@/lib/voix'])deps['@/lib/voix'].decouper=()=>[];
  if(deps['@/lib/morceaux-de-parole'])deps['@/lib/morceaux-de-parole'].cleValide=()=>false;
  return load(path,deps,{process:{env},fetch:()=>{throw Error('Unexpected external request')}});
 }
 return {codes,route};
}
const paths=['app/api/ecouter/route.ts','app/api/voix/route.ts','app/api/chatterbox-test/route.ts','app/api/chatterbox-test/bia/route.ts','app/api/chatterbox-test/bia/stream/route.ts'];
for(const path of paths)test(path+': technical requests preserve all questions and the final answer remains accessible',async()=>{
 const {codes,route}=fixture();const api=route(path),code=codes.creerCode(1);
 const request=c=>new Request('https://bia.test/api',{method:'POST',headers:{'x-bia-code':c,...(path.includes('/ecouter/')?{}:{'content-type':'application/json'})},body:path.includes('/ecouter/')?new FormData():JSON.stringify({})});
 for(let i=0;i<20;i++) {
  const r=await api.POST(request(code));assert.equal(r.status,path.includes('/voix/')?200:400);
  assert(codes.verifierEntree(code).ok,'technical requests must not exhaust entry');
 }
 assert(codes.verifierCode(code,true).ok);
 assert(codes.verifierCode(code,true).ok,'two real questions remain available');
 assert.equal(codes.verifierEntree(code).ok,false,'quota still blocks new conversations');
 assert.notEqual((await api.POST(request(code))).status,401,'the audio/transcription of the last allowed answer remains authorized');
 assert.equal(codes.verifierCode(code,true).ok,false,'a third question is refused');
 for(const c of ['', 'INVALID',codes.creerCode(-2)])assert.equal((await api.POST(request(c))).status,401);
 assert.notEqual((await api.POST(request('TESTMASTER'))).status,401);
});
