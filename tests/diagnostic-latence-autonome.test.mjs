import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

for(const appris of [false,true])test(`real-chain replay uses ASR output and concurrent voice without exporting text; learned finalization=${appris}`,async()=>{
 delete globalThis.biaDiagnosticLatence;
 const previous=process.env.BIA_CODE_MAITRE,original=globalThis.fetch;
 process.env.BIA_CODE_MAITRE='synthetic-test-only';
 let ecoutes=0,conversations=0,voix=0,liberer;
 const entree=Buffer.alloc(120).toString('base64');
 globalThis.fetch=async(url,req)=>{
  assert.equal(req.headers['x-bia-code'],'synthetic-test-only');
  if(url.endsWith('/api/ecouter')){
   assert.equal(req.body.get('diagnostic'),'1');ecoutes++;
   return Response.json({texte:'transcription réelle du contrôle',chronometrage:{total_ms:10}});
  }
  const b=JSON.parse(req.body);
  if(url.endsWith('/api/chat')){
   assert.equal(b.message,'transcription réelle du contrôle');assert.equal(b.apprentissageTest,true);assert.equal(b.parole,true);
   assert.equal(req.headers['x-bia-diagnostic-latence'],'calcul');
   const cas=conversations++;assert.equal(b.history.length,cas===2||cas===3?2:0);
   const encodeur=new TextEncoder();
   return new Response(new ReadableStream({async start(c){
    c.enqueue(encodeur.encode('event: texte\ndata: '+JSON.stringify({morceau:'Une phrase complète.'})+'\n\n'));
    await new Promise(resolve=>{liberer=resolve;});
    c.enqueue(encodeur.encode('event: fin\ndata: '+JSON.stringify({statut:200,corps:{reply:'Une phrase complète.',source:'contrôle'},chronometrage:{preparation_ms:10}})+'\n\n'));c.close();
   }}),{headers:{'content-type':'text/event-stream'}});
  }
  if(b.lecture_fidele)return new Response([0,1].map(partie=>JSON.stringify({type:'morceau',partie,parties:2,voice:'female',empreinte:'controle',audio:entree})).join('\n')+'\n'+JSON.stringify({type:'fin'})+'\n');
  voix++;assert.equal(b.texte,'Une phrase complète.');liberer();
  return new Response(JSON.stringify({type:'morceau',partie:0,parties:1,audio:entree,audio_en_cache:false,temps_gpu:{attente_ms:0}})+'\n'+JSON.stringify({type:'fin'})+'\n');
 };
 const m={exports:{}},js=ts.transpileModule(fs.readFileSync('lib/diagnostic-latence-autonome.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 try{
  const audio={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/briques-audio.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(audio,audio.exports);
  const deps={'./diffusion':{teteDeLaReponse:s=>s.includes('.')?s:''},'./langue':{detecterLangue:()=> 'wo'},'./briques-audio':audio.exports,'./dialogue-devoirs':{dialoguerAvecDevoirs:async(q,_h,o)=>{assert.equal(q,'transcription réelle du contrôle');assert.equal(o.diagnostic,true);assert.equal(o.cacheSeulement,true);return appris?{reply:'Phrase privée apprise.',langue:'wo',lecon_id:'source',replique_id:'2'}:null;}},'./devoirs-apprentissage':{devoirsALire:async()=>({devoirs:[{id:'source'}]})},'./correction-devoir-core':{origineReplique:(d,id,l)=>{assert.equal(d.id,'source');assert.equal(id,'2');assert.equal(l,'wo');return {debut:12};}},'./audio-memoire':{audioPourReponse:async(t,l)=>{assert.equal(t,'Phrase privée apprise.');assert.equal(l,'wo');return {base64:entree};}},'./assembler-sons-courants':{assemblerSonsCourants:(clips,maximum)=>{assert.equal(clips.length,2);assert.equal(maximum,30);return {wav:Buffer.concat(clips.map(b=>Buffer.from(b)))};}}};
  new Function('require','module','exports',js)(id=>{assert(id in deps,id);return deps[id];},m,m.exports);
  await m.exports.verifierLatenceAutonome();await m.exports.verifierLatenceAutonome();
  const rapport=m.exports.resumeDiagnosticLatence();
  assert.equal(rapport.statut,'termine');assert.equal(ecoutes,6);assert.equal(conversations,6);assert.equal(voix,6);
  assert(rapport.preparation_audio.every(c=>c.parties===2));
  assert.equal(rapport.reponses_apprises.length,2);assert(rapport.reponses_apprises.every(c=>appris?c.ok&&c.audio_disponible&&c.provenance_disponible:!c.disponible));
  assert(!JSON.stringify(rapport).includes('Phrase privée apprise.'));
  assert(rapport.cas.every(c=>c.ok&&c.conversation.preparation_ms===10&&c.voix_cache===false));
  assert.equal(rapport.lecture_navigateur_mesuree,false);assert.equal(rapport.microphone_mesure,false);
  assert(!JSON.stringify(rapport).includes('transcription réelle'));assert(!JSON.stringify(rapport).includes('Une phrase complète.'));assert(!JSON.stringify(rapport).includes('synthetic-test-only'));
 }finally{globalThis.fetch=original;if(previous===undefined)delete process.env.BIA_CODE_MAITRE;else process.env.BIA_CODE_MAITRE=previous;}
});
