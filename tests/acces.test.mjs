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

test('chat rejects absent and invalid codes before cached replies or streaming',async()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8');
 const ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);
 const post=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='POST');
 const js=ts.transpileModule(post.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const {codes}=fixture();let answers=0;
 const api=new Function('verifierCode','NextResponse','DIFFUSER_LE_MODELE','repondre','garderCeTour',js+'; return POST;')(codes.verifierCode,Response,true,async()=>{answers++;return {corps:{reply:'Bonjour'}};},()=>{});
 for(const diffuse of [false,true])for(const code of ['', 'INVALID']){
  const r=await api(new Request('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':code},body:JSON.stringify({message:'Bonjour',diffuse})}));
  assert.equal(r.status,401);assert.equal((await r.json()).source,'code');
 }
 assert.equal(answers,0);
});

test('remembered user and master access is restored only after server validation, without another submission',async()=>{
 for(const maitre of [false,true]){
  let calls=0,removed=0;const saved='SAVEDCODE';
  const api=load('lib/acces-client.ts',{}, {fetch:async(url,init)=>{calls++;assert.equal(url,'/api/acces');assert.equal(init.headers['x-bia-code'],saved);return Response.json({ok:true,maitre});}});
  const storage={getItem:key=>{assert.equal(key,'bia-code');return saved;},removeItem:()=>removed++};
  assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'valide',code:saved,maitre});
  assert.equal(calls,1);assert.equal(removed,0);
 }
});

test('missing or unreadable storage asks for a code without making an access request',async()=>{
 let calls=0;const api=load('lib/acces-client.ts',{}, {fetch:async()=>{calls++;throw Error('unexpected')}});
 for(const storage of [{getItem:()=>null,removeItem(){}},{getItem:()=>{throw Error('blocked')},removeItem(){}}])assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'absent'});
 assert.equal(calls,0);
});

test('expired, invalid and exhausted saved codes reopen entry and remove the rejected code',async()=>{
 for(const message of ['Ce code a expiré.','Code refusé. Vérifie ton code.','Ce code a atteint sa limite d’utilisation.']){
  let stored='REJECTED';const api=load('lib/acces-client.ts',{}, {fetch:async()=>Response.json({ok:false,erreur:message},{status:401})});
  const storage={getItem:()=>stored,removeItem:()=>stored=null};
  assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'refuse',message});assert.equal(stored,null);
 }
});

test('network failures and server outages preserve the saved code, and retry restores access',async()=>{
 for(const failure of [()=>{throw Error('offline')},()=>Response.json({erreur:'temporary'},{status:503}),()=>Response.json({maitre:true}),()=>new Response('invalid json')]){
  let retry=false,removed=0;const api=load('lib/acces-client.ts',{}, {fetch:async()=>retry?Response.json({ok:true,maitre:true}):failure()});
  const storage={getItem:()=> 'SAVEDMASTER',removeItem:()=>removed++};
  assert.equal((await api.restaurerAccesMemorise(storage)).etat,'indisponible');assert.equal(removed,0);
  retry=true;assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'valide',code:'SAVEDMASTER',maitre:true});
 }
});

test('a late rejection cannot erase a different code saved in the meantime',async()=>{
 let finish;let stored='OLD';const pending=new Promise(r=>finish=r);
 const api=load('lib/acces-client.ts',{}, {fetch:()=>pending});
 const restore=api.restaurerAccesMemorise({getItem:()=>stored,removeItem:()=>stored=null});
 stored='NEW';finish(Response.json({ok:false,erreur:'Expiré'},{status:401}));
 assert.equal((await restore).etat,'refuse');assert.equal(stored,'NEW');
});

test('the page restores master and user state together and ignores stale restoration completions',async()=>{
 const source=fs.readFileSync('app/page.tsx','utf8');const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let init;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='retablirAcces')init=n.initializer.arguments[0];ts.forEachChild(n,visit)}visit(ast);assert(init);
 const js=ts.transpileModule('const restore='+init.getText(ast)+';', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const maitre of [false,true]){
  const events=[],ref={current:0},master={current:false};let resolve;
  const dependencies={restaurationAccesRef:ref,estMaitreRef:master,restaurerAccesMemorise:()=>new Promise(r=>resolve=r),setRestaurationAcces:x=>events.push(['status',x]),setEstMaitre:x=>events.push(['master',x]),setCode:x=>events.push(['code',x]),setCodeErreur:x=>events.push(['error',x])};
  const restore=new Function(...Object.keys(dependencies),js+'return restore;')(...Object.values(dependencies));
  const pending=restore();assert.deepEqual(events,[['status','verification']]);resolve({etat:'valide',code:'SAVED',maitre});await pending;
  assert.equal(master.current,maitre);assert(events.some(x=>x[0]==='code'&&x[1]==='SAVED'));assert.deepEqual(events.at(-1),['status','terminee']);
  events.length=0;const stale=restore();ref.current++;resolve({etat:'valide',code:'STALE',maitre});await stale;assert.deepEqual(events,[['status','verification']]);
 }
});
