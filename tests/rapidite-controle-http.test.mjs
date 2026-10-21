import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
for(const joint of [false,true])test(`the full-chain control accepts complete answers without text deltas, attached audio=${joint}`,async()=>{
 delete globalThis.biaRapiditeControle;
 const previous=process.env.BIA_CODE_MAITRE;process.env.BIA_CODE_MAITRE='synthetic-test-only';
 let syntheses=0,ecoutes=0,conversations=0;
 const deps={
  'next/server':{NextRequest:Request},
  '../app/api/ecouter/route':{POST:async req=>{assert.equal((await req.formData()).get('diagnostic'),'1');ecoutes++;return Response.json({texte:'Pourquoi le ciel est bleu ?'});}},
  '../app/api/chat/route':{POST:async req=>{const b=await req.json();assert.equal(b.apprentissageTest,true);assert.equal(b.message,'Pourquoi le ciel est bleu ?');conversations++;return new Response('event: fin\ndata: '+JSON.stringify({statut:200,corps:{reply:'Une réponse complète.',langue:'fr',...(joint?{audio_memorise:{base64:Buffer.alloc(100).toString('base64')}}:{})}})+'\n\n',{headers:{'content-type':'text/event-stream'}});}},
  '../app/api/chatterbox-test/bia/route':{POST:async()=>{syntheses++;return Response.json({audio:Buffer.alloc(100).toString('base64'),parties:1,fabrication_ms:1});}},
  './diffusion':{teteDeLaReponse:s=>s.includes('.')?s:''},
 };
 const m={exports:{}},js=ts.transpileModule(fs.readFileSync('lib/rapidite-controle-http.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 try{
  new Function('require','module','exports',js)(id=>{assert(id in deps,id);return deps[id];},m,m.exports);
  await m.exports.verifierChaineRapidite();await m.exports.verifierChaineRapidite();
  const r=m.exports.resumeControleRapidite();assert.equal(r.statut,'termine');assert.equal(r.cas.length,6);assert(r.cas.every(c=>c.ok&&c.audio_recu&&c.reponse_complete_sans_deltas));
  assert.equal(ecoutes,6);assert.equal(conversations,6);assert.equal(syntheses,joint?1:7);assert.equal(r.lecture_navigateur_mesuree,false);
 }finally{if(previous===undefined)delete process.env.BIA_CODE_MAITRE;else process.env.BIA_CODE_MAITRE=previous;}
});
