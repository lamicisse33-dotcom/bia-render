import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(path,deps={},env={}){const m={exports:{}};const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',...Object.keys(env),source)(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(env));return m.exports;}
const core=load('lib/sons-courants-core.ts',{'./repertoire-textes':load('lib/repertoire-textes.ts'),'./base-textes':load('lib/base-textes.ts'),'./services-textes':load('lib/services-textes.ts')});
const lexique={lexiqueConfig:{url:'https://test',cle:'test',actif:true}};
function fixture(){
 const files=new Map();let gpu=0,fail=false,gate;const requests=[];
 const prefix='bia-courant/'+core.VERSION_SONS_COURANTS;
 const initial=core.PHRASES_COURANTES.map(p=>({...p,version:core.VERSION_SONS_COURANTS,adresse:'https://test/storage/v1/object/public/repertoire/'+prefix+'/'+p.langue+'/'+p.cle+'-'+crypto.createHash('sha256').update(p.texte).digest('hex').slice(0,24)+'.mp3',secondes:1,octets:2400}));
 files.set(prefix+'/manifeste.json',new TextEncoder().encode(JSON.stringify({sons:initial})));
 const fetch=async(url,opt={})=>{
  const key=url.split('/repertoire/')[1]?.split('?')[0];
  if(url.endsWith('/list/repertoire')){const b=JSON.parse(opt.body);const names=[...files.keys()].filter(k=>k.startsWith(b.prefix+'/')).map(k=>({name:k.slice(b.prefix.length+1)})).sort((a,b)=>a.name.localeCompare(b.name));return {ok:true,json:async()=>names.slice(b.offset,b.offset+b.limit)};}
  if(opt.method==='POST'){
   if(files.has(key)&&opt.headers['x-upsert']!=='true')return {ok:false,status:409};
   files.set(key,typeof opt.body==='string'?new TextEncoder().encode(opt.body):opt.body);return {ok:true};
  }
  const bytes=files.get(key);return {ok:!!bytes,status:bytes?200:404,json:async()=>JSON.parse(new TextDecoder().decode(bytes)),arrayBuffer:async()=>bytes.buffer};
 };
 const journal=()=>load('lib/corrections-sons-courants.ts',{'node:crypto':crypto,'./sons-courants-etat':{sonsCourantsEtat:{}},'./lexique':lexique,'./sons-courants-core':core},{fetch,process:{env:{}}});
 const corrections=journal();class NextRequest{constructor(url,o){this.o=o;}}
 const api=load('lib/sons-courants.ts',{'node:crypto':crypto,'next/server':{NextRequest},'./lexique':lexique,'./sons-courants-core':core,'./corrections-sons-courants':corrections,'./sons-courants-etat':{sonsCourantsEtat:{}},'./assembler-sons-courants':{assemblerSonsCourants:()=>({wav:new ArrayBuffer(24000),secondes:1})},'./mp3':{versMp3:()=>new Uint8Array(2400).fill(55)},'../app/api/chatterbox-test/bia/route':{POST:async r=>{gpu++;requests.push(JSON.parse(r.o.body));if(gate)await gate;if(fail)throw Error('GPU unavailable');return {ok:true,json:async()=>({audio:Buffer.from('sample').toString('base64'),voice:'female',langue:'wo',partie:0,parties:1,empreinte:'hash',checkpoint_sha256:'8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f'})};}}},{fetch,process:{env:{CHATTERBOX_TEST_KEY:'test-only'}},Buffer});
 return {api,corrections,journal,files,initial,requests,gpu:()=>gpu,fail:()=>{fail=true;},gate:p=>{gate=p;}};
}
test('saved source survives restart; only its language changes and old audio is not current',async()=>{
 const f=fixture(),p=(await f.api.lireCatalogueCourant())[0];
 const saved=await f.api.corrigerSonCourant(p.cle,p.langue,0,'Phrase corrigée.');
 assert.equal(f.gpu(),0);assert.equal(saved.audio,undefined);assert.equal(saved.ancienAudio.adresse,p.audio.adresse);
 assert.equal((await f.journal().lireCorrectionsCourantes()).get(p.cle+'-'+p.langue).texte,'Phrase corrigée.');
 const all=await f.api.lireCatalogueCourant();assert.equal(all.filter(x=>x.revision!==0).length,1);assert.equal((await f.api.lireSonsCourants()).length,41);
 await assert.rejects(f.api.corrigerSonCourant(p.cle,p.langue,0,'Stale'),/changé/);
});
test('concurrent writers across independent server instances cannot overwrite a revision',async()=>{
 const f=fixture(),p=(await f.api.lireCatalogueCourant())[0];
 const out=await Promise.allSettled([f.journal().enregistrerRevisionCourante(p,'A'),f.journal().enregistrerRevisionCourante(p,'B')]);
 assert.equal(out.filter(x=>x.status==='fulfilled').length,1);assert.equal(out.filter(x=>x.status==='rejected').length,1);
 assert.equal([...f.files.keys()].filter(k=>k.includes('/corrections/')).length,1);
});
test('regeneration uses corrected text and a fresh cache key, preserves the other 41 recordings',async()=>{
 const f=fixture(),p=(await f.api.lireCatalogueCourant())[0];
 await f.api.corrigerSonCourant(p.cle,p.langue,0,'Nouveau texte.');
 const a=await f.api.regenererSonCourant(p.cle,p.langue,1);assert.equal(a.audio.texte,'Nouveau texte.');assert.notEqual(a.audio.adresse,p.audio.adresse);
 const b=await f.api.regenererSonCourant(p.cle,p.langue,2);assert.notEqual(a.audio.adresse,b.audio.adresse);assert.equal(b.revision,3);
 assert.equal(f.gpu(),2);assert.notEqual(f.requests[0].nouvelle_prise,f.requests[1].nouvelle_prise);assert.equal(f.requests[0].texte,'Nouveau texte.');
 const all=await f.api.lireSonsCourants();assert.equal(all.length,42);assert.deepEqual(all.slice(1),f.initial.slice(1));
});
test('GPU failure keeps saved text and prior recording, allowing a later retry',async()=>{
 const f=fixture(),p=(await f.api.lireCatalogueCourant())[0];await f.api.corrigerSonCourant(p.cle,p.langue,0,'Saved correction.');f.fail();
 await assert.rejects(f.api.regenererSonCourant(p.cle,p.langue,1));const after=(await f.api.lireCatalogueCourant())[0];assert.equal(after.texte,'Saved correction.');assert.equal(after.revision,1);assert(!after.audio);assert(after.ancienAudio);
});
test('text changed during synthesis rejects stale audio publication',async()=>{
 const f=fixture(),p=(await f.api.lireCatalogueCourant())[0];let release;f.gate(new Promise(r=>{release=r;}));
 const running=f.api.regenererSonCourant(p.cle,p.langue,0);while(f.gpu()===0)await new Promise(r=>setImmediate(r));
 await f.api.corrigerSonCourant(p.cle,p.langue,0,'Latest correction.');release();await assert.rejects(running,/changé/);
 const after=(await f.api.lireCatalogueCourant())[0];assert.equal(after.texte,'Latest correction.');assert(!after.audio);
});
test('edit API rejects anonymous users, ordinary codes, blank texts and unknown phrases before any write',async()=>{
 let master=false,calls=0;const route=load('app/api/sons-courants/route.ts',{'next/server':{NextResponse:{json:(body,o)=>({body,...o})}},'node:crypto':crypto,'@/lib/codes':{verifierCode:()=>({ok:true,maitre:master})},'@/lib/sons-courants':{corrigerSonCourant:()=>{calls++;}},'@/lib/corrections-sons-courants':{ErreurCorrectionSon:class extends Error{}},'@/lib/sons-courants-core':core},{process:{env:{}},Buffer});
 const request=body=>({headers:{get:()=>null},json:async()=>body});
 assert.equal((await route.POST(request({action:'corriger'}))).status,401);master=true;
 const p=core.PHRASES_COURANTES[0];assert.equal((await route.POST(request({...p,action:'corriger',revision:0,texte:' '}))).status,400);
 assert.equal((await route.POST(request({...p,cle:'invented',action:'regenerer',revision:0}))).status,400);assert.equal(calls,0);
});
