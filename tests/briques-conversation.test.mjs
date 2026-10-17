import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(path,req=()=>{throw Error('Unexpected import')}){
 const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(req,m,m.exports);return m.exports;
}
const tick=()=>new Promise(r=>setTimeout(r,0));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const fileApi=load('lib/briques-file.ts');
const brick=n=>({numero:n,texte:'Brique '+n,audio:'AAAA',voice:'female',langue:'fr'});

test('first brick plays before final transcript; appending cannot replace it or overlap playback',async()=>{
 const f=fileApi.creerFileBriques(),release=deferred(),starts=[];let active=0,max=0;
 f.ajouter(brick(0));
 const played=f.lire({signal:new AbortController().signal,taire(){},attente(){assert.fail('no long gap');},mesure(){},jouer:async b=>{starts.push(b.texte);max=Math.max(max,++active);if(b.numero===0)await release.promise;active--;return true;}});
 assert.deepEqual(starts,['Brique 0']);
 f.ajouter({...brick(0),texte:'replacement forbidden'});f.ajouter(brick(1));f.fermer();
 assert.deepEqual(starts,['Brique 0']);release.resolve();assert.equal(await played,'Brique 0 Brique 1');assert.equal(max,1);
});
test('late correction stays in the next brick; no missing index accepted',async()=>{
 const f=fileApi.creerFileBriques();f.ajouter(brick(0));assert.throws(()=>f.ajouter(brick(2)),/manquante/);
 f.ajouter({...brick(1),texte:'Tu précises finalement que le cordonnier était fermé.'});f.fermer();
 const said=await f.lire({signal:new AbortController().signal,jouer:async()=>true,attente(){},taire(){},mesure(){}});
 assert.equal(said,'Brique 0 Tu précises finalement que le cordonnier était fermé.');
});
test('one optional reflection per long gap, stopped before actual reply, never counted as first sound',async()=>{
 const f=fileApi.creerFileBriques(),events=[],gap=deferred();f.ajouter(brick(0));
 const done=f.lire({signal:new AbortController().signal,delai:5,jouer:async b=>{events.push('play'+b.numero);return true;},attente(){events.push('hmm');gap.resolve();},taire(){events.push('stop-hmm');},mesure(){events.push('gap');}});
 await gap.promise;f.ajouter(brick(1));f.fermer();await done;
 assert.equal(events.filter(x=>x==='hmm').length,1);assert(events.indexOf('hmm')>events.indexOf('play0'));
 assert.equal(events[events.indexOf('play1')-1],'stop-hmm');
});
test('interrupting a waiting queue immediately releases it and prevents future bricks',async()=>{
 const f=fileApi.creerFileBriques(),abort=new AbortController(),played=[];f.ajouter(brick(0));
 const done=f.lire({signal:abort.signal,jouer:async b=>{played.push(b.numero);return true;},attente(){assert.fail('cancelled filler');},taire(){},mesure(){}});
 await tick();abort.abort();f.ajouter(brick(1));assert.equal(await done,'Brique 0');assert.deepEqual(played,[0]);
});

function server(){
 delete globalThis.biaBriques;const models=[],syntheses=[],state={},saved=[];let quota=0;
 const core=load('lib/anticipation-core.ts',()=>crypto);
 const api=load('lib/briques-reponse.ts',id=>{
  if(id==='node:crypto')return crypto;if(id==='next/server')return {NextRequest:Request};
  if(id==='./codes')return {verifierCode:(code,compter)=>{if(compter)quota++;return {ok:true,maitre:true};}};
  if(id==='./souvenirs')return {garder:async d=>saved.push(d)};
  if(id==='./anticipation-core')return core;
  if(id==='./briques-etat')return {etatBriques:state};
  if(id==='./anticipation-gpu')return {gpuAnticipation:async f=>f()};
  if(id==='./cerveau-anthropic')return {MODELE_SONNET:'test',messagesAnthropic:messages=>({messages}),contenuAnthropic:d=>d.text,fetchAnthropic:async(u,init)=>{
   const request=JSON.parse(init.body),context=JSON.parse(request.messages.at(-1).content);models.push(context);
   return Response.json({text:JSON.stringify({eligible:true,reply:context.fin_de_parole?'Tu as finalement payé trois mille francs.':'Tu as profité de ta sortie pour faire réparer tes chaussures.',traite:context.texte_integral})});
  }};
  if(id==='./conversation-groq')return {messagesConversation:o=>[{role:'system',content:JSON.stringify(o)}]};
  if(id==='./memoire-organisee')return {contexteMemoireCommune:async()=>''};if(id==='./instructions-apprentissage')return {contexteInstructions:async()=>''};
  if(id==='./langue')return {detecterLangue:()=> 'fr'};if(id==='./assembler-sons-courants')return {assemblerSonsCourants:()=>({wav:new ArrayBuffer(1200)})};
  if(id.includes('chatterbox-test'))return {POST:async req=>{const body=await req.json();syntheses.push(body);return Response.json({audio:Buffer.alloc(1200).toString('base64'),partie:0,parties:1,empreinte:'stable',voice:'female'});}};
  throw Error(id);
 });return {...api,models,syntheses,saved,quota:()=>quota};
}
const question='En allant au marché je suis passé chez le cordonnier pour refaire mes chaussures.';
const body={texte:question,tour:'test-briques-123',history:[{role:'bia',text:'Bonjour papa.'}],resume:'',voice:'female',persona:'bia'};
test('server keeps locked audio, appends late corrections, charges once and persists only delivered speech',async()=>{
 const s=server(),signal=new AbortController().signal;
 const first=await s.preparerBrique(body,'owner',true,signal);assert(first.brique);const locked=JSON.stringify(first.brique);assert.equal(s.quota(),0);
 const final=question+' Finalement, le cordonnier était fermé. Au marché le chargeur est passé de quinze mille à trois mille francs.';
 const next=await s.preparerBrique({id:first.id,texte:final,final:true},'owner',true,signal);
 assert(next.termine);assert.equal(next.brique.numero,1);assert.equal(JSON.stringify(first.brique),locked);
 assert.equal(s.models[1].briques_verrouillees[0],first.brique.texte);assert.equal(s.syntheses.length,2);assert.equal(s.quota(),1);assert.equal(s.saved.length,0);
 await s.preparerBrique({id:first.id,action:'livree',nombre:2},'owner',true,signal);
 await s.preparerBrique({id:first.id,action:'livree',nombre:2},'owner',true,signal);
 assert.equal(s.saved.length,1);assert.equal(s.saved[0].dit,final);assert.equal(s.saved[0].repondu,first.brique.texte+' '+next.brique.texte);
});
test('a different account cannot read, append or deliver another conversation; actions keep ordinary routing',async()=>{
 const s=server(),signal=new AbortController().signal,first=await s.preparerBrique(body,'owner',true,signal);
 await assert.rejects(s.preparerBrique({id:first.id,texte:question,final:true},'other',true,signal),/inconnue/);
 const end=await s.preparerBrique({id:first.id,texte:question+' Mémorise ma nouvelle adresse.',final:true},'owner',true,signal);
 assert(end.normal);assert.equal(s.syntheses.length,1);assert.equal(s.quota(),0);
});
test('sequential conversations are not disabled after four completed turns',async()=>{
 const s=server(),signal=new AbortController().signal;
 for(let i=0;i<6;i++){
  const first=await s.preparerBrique({...body,tour:'test-briques-'+i},'owner',true,signal);assert(first?.brique);
  await s.preparerBrique({id:first.id,texte:question,final:true},'owner',true,signal);
 }
 assert.equal(s.quota(),6);
});
test('client consumes queued audio while final generation is still pending',async()=>{
 const original=globalThis.fetch,finalRequest=deferred(),started=[];let calls=0;
 globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);calls++;if(b.final){await finalRequest.promise;return Response.json({preparation:{id:'session',brique:brick(1),termine:true}});}return Response.json({preparation:{id:'session',brique:brick(0)}});};
 try{
  const api=load('lib/briques-client.ts',()=>fileApi),p=api.creerProducteurBriques({...body,code:'owner',actuel:()=>true});
  p.progresser(question);await tick();p.arreterEcoute();
  const reading=p.commencer({signal:new AbortController().signal,jouer:async b=>{started.push(b.numero);return true;},attente(){},taire(){},mesure(){}});assert(reading);assert.deepEqual(started,[0]);
  const finishing=p.terminer(question+' Je suis ensuite allé au marché.');await tick();assert.equal(calls,2);assert.deepEqual(started,[0]);
  finalRequest.resolve();await finishing;const r=await reading.fin;assert.equal(r.reponse,'Brique 0 Brique 1');assert.equal(r.normal,false);
 }finally{globalThis.fetch=original;}
});
