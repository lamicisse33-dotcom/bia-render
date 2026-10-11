import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function load(path,deps={},env={}){const m={exports:{}};new Function('require','module','exports',...Object.keys(env),compile(fs.readFileSync(path,'utf8')))(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(env));return m.exports;}
const texts=load('lib/repertoire-textes.ts'),base=load('lib/base-textes.ts'),services=load('lib/services-textes.ts');
const core=load('lib/sons-courants-core.ts',{'./repertoire-textes':texts,'./base-textes':base,'./services-textes':services});
const ready=core.PHRASES_COURANTES.map(p=>({...p,version:core.VERSION_SONS_COURANTS,adresse:'https://example.test/'+p.cle,secondes:1,octets:2000}));
test('all reviewed greetings are bilingual and exact; audio lookup never rewrites the reply',()=>{
 assert.equal(new Set(ready.map(p=>p.cle+p.langue)).size,ready.length);
 for(const e of [...texts.REPERTOIRE,...base.NOUVELLES].filter(e=>services.SALUTATIONS.has(e.cle)))for(const lang of ['fr','wo'])assert(ready.some(p=>p.cle===e.cle&&p.langue===lang&&p.texte===e[lang==='fr'?'francais':'wolof']));
 assert(core.sonPourTexte(ready,"D'accord.",'fr'));assert.equal(core.sonPourTexte(ready,"D'accord. Une autre phrase.",'fr'),undefined);
 assert.equal(core.sonPourTexte(ready,"D'accord.",'wo'),undefined);
 assert.equal(core.sonPourTexte(ready.map(p=>({...p,version:'old'})),"D'accord.",'fr'),undefined);
});
test('neutral acknowledgements rotate through all three and never imply a verification',()=>{
 let last='';const selected=[];for(let i=0;i<4;i++){const p=core.reactionDisponible(ready,'wo',last);assert.equal(p.usage,'reaction');assert.notEqual(p.cle,last);selected.push(p.cle);last=p.cle;}
 assert.equal(new Set(selected).size,3);
 assert.equal(core.reactionDisponible(ready.filter(p=>p.usage==='verification'),'fr',''),undefined);
});
test('fast answers, interruption, and cancellation during decode prevent a late acknowledgement',async()=>{
 let timer,cleared=0,stopped=0,heard=0,finish;let current=true;
 const reaction=load('lib/reaction-courante.ts',{}, {setTimeout:f=>{timer=f;return 1;},clearTimeout:()=>{cleared++;}});
 const make=()=>reaction.programmerReactionCourante({actuel:()=>current,arreter:()=>{stopped++;},jouer:async alive=>{await new Promise(r=>{finish=r;});if(alive())heard++;}});
 let cancel=make();cancel();timer();assert.equal(heard,0);assert.equal(stopped,0);
 cancel=make();timer();cancel();finish();await Promise.resolve();assert.equal(heard,0);assert.equal(stopped,1);
 cancel=make();current=false;timer();assert.equal(heard,0);cancel();assert.equal(cleared,3);
});
test('audio generation is authenticated before any paid request',async()=>{
 let calls=0;const route=load('app/api/sons-courants/route.ts',{'next/server':{NextResponse:{json:(x,o)=>({body:x,...o})}},'node:crypto':crypto,'@/lib/codes':{verifierCode:()=>({ok:false})},'@/lib/sons-courants-core':core,'@/lib/sons-courants':{genererSonsCourants:async()=>{calls++;}}},{process:{env:{CHATTERBOX_TEST_KEY:'test-only'}}});
 const r=await route.POST({headers:{get:()=>null}});assert.equal(r.status,401);assert.equal(calls,0);
});
test('assembled PCM keeps every spoken sample in order and rejects silence or mismatched rates',()=>{
 const assemble=load('lib/assembler-sons-courants.ts',{'./mp3':{lireWav:b=>b}}).assemblerSonsCourants;
 const a={hz:24000,canaux:1,pcm:Int16Array.from([...Array(1000).fill(0),...Array(2400).fill(1200),...Array(1000).fill(0)])};
 const b={...a,pcm:Int16Array.from([...Array(1000).fill(0),...Array(2400).fill(-1800),...Array(1000).fill(0)])};
 const r=assemble([a,b]),samples=new Int16Array(r.wav,44);assert.equal([...samples].filter(x=>x===1200).length,2400);assert.equal([...samples].filter(x=>x===-1800).length,2400);assert(samples.indexOf(1200)<samples.indexOf(-1800));
 assert.throws(()=>assemble([{...a,pcm:new Int16Array(2400)}]),/silencieux/);assert.throws(()=>assemble([a,{...b,hz:16000}]),/format/);
});
test('durable generation reuses verified entries and refuses an unknown store state',async()=>{
 let stored=null,gpu=0,uploads=0,indispo=false;const objects=new Map();const phrases=core.PHRASES_COURANTES.filter(p=>p.cle==='reaction-ok');
 const mp3=new Uint8Array(2400).fill(30),wav=new Uint8Array(24000).fill(12);
 const env={fetch:async(url,opt={})=>{
  if(indispo)return {ok:false,status:503};
  const key=url.split('/repertoire/')[1].split('?')[0];
  if(opt.method==='POST'){uploads++;objects.set(key,opt.body);if(key.endsWith('manifeste.json'))stored=JSON.parse(new TextDecoder().decode(opt.body));return {ok:true};}
  if(key.endsWith('manifeste.json'))return stored?{ok:true,json:async()=>stored}:{ok:false,status:404};
  if(opt.method==='HEAD')return {ok:false,status:404};
  return {ok:objects.has(key),arrayBuffer:async()=>objects.get(key).buffer};
 },process:{env:{CHATTERBOX_TEST_KEY:'test-only'}},Buffer};
 class NextRequest{constructor(url,o){this.url=url;this.o=o;}}
 const api=load('lib/sons-courants.ts',{'node:crypto':crypto,'next/server':{NextRequest},'./lexique':{lexiqueConfig:{url:'https://test',cle:'test',actif:true}},'./sons-courants-core':{...core,PHRASES_COURANTES:phrases},'./sons-courants-etat':{sonsCourantsEtat:{}},'./assembler-sons-courants':{assemblerSonsCourants:()=>({wav:wav.buffer,secondes:1})},'./mp3':{versMp3:()=>mp3},'../app/api/chatterbox-test/bia/route':{POST:async r=>{gpu++;const p=JSON.parse(r.o.body);return {ok:true,json:async()=>({audio:Buffer.from(wav).toString('base64'),voice:'female',partie:0,parties:1,empreinte:'hash',langue:p.langue,checkpoint_sha256:p.langue==='fr'?'b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75':'8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f'})};}}},env);
 let r=await api.genererSonsCourants();assert.equal(r.enregistres,2);assert.equal(r.restants,0);assert.equal(gpu,2);assert.equal(uploads,4);
 r=await api.genererSonsCourants();assert.equal(r.crees,0);assert.equal(r.deja,2);assert.equal(gpu,2);
 indispo=true;await assert.rejects(api.genererSonsCourants(),/manifeste_indisponible/);assert.equal(gpu,2);
});
