import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(fetch){const m={exports:{}};new Function('module','exports','fetch','globalThis','process',compile(fs.readFileSync('lib/cerveau-anthropic.ts','utf8')))(m,m.exports,fetch,{}, {env:{}});return m.exports;}
test('Sonnet 5.5 uses the supported fast settings and preserves tools, messages and output ceiling',async()=>{
 let call;const api=load(async(url,init)=>{call={url,init,body:JSON.parse(init.body)};return Response.json({content:[{type:'text',text:'Réponse'}]});});
 const r=await api.fetchAnthropic('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':'test-only'},body:JSON.stringify({model:api.MODELE_SONNET,max_tokens:256,temperature:0,thinking:{type:'disabled'},tools:[{name:'lookup'}],system:'Do not rewrite.',messages:[{role:'user',content:'Nanga def?'}]})},Date.now()+2500);
 assert.equal(r.status,200);assert.deepEqual(call.body.thinking,{type:'between_tools'});assert.deepEqual(call.body.output_config,{effort:'low'});assert.equal(call.body.temperature,undefined);assert.equal(call.body.max_tokens,256);assert.equal(call.body.tools[0].name,'lookup');assert.equal(call.body.messages[0].content,'Nanga def?');assert.equal(api.contenuAnthropic(await r.json()),'Réponse');
});
test('all compact context survives native conversion and a live stream remains readable',async()=>{
 const api=load(async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: first\n\n'));}}),{headers:{'content-type':'text/event-stream'}}));
 const native=api.messagesAnthropic([{role:'system',content:'Personnalité'},{role:'system',content:'Leçon exacte'},{role:'user',content:'Non.'},{role:'system',content:'Réponds en wolof'}]);
 assert.deepEqual(native.system.map(x=>x.text),['Personnalité','Leçon exacte','Réponds en wolof']);assert.deepEqual(native.messages,[{role:'user',content:'Non.'}]);
 const r=await api.fetchAnthropic('https://api.anthropic.com/v1/messages',{body:JSON.stringify({model:api.MODELE_SONNET,...native,stream:true})});
 const reader=r.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'data: first\n\n');await reader.cancel();
});
test('rejected credentials and billing errors stay explicit',async()=>{
 for(const status of [400,401,402]){
 const api=load(async()=>Response.json({error:{message:'rejected'}},{status}));
 const r=await api.fetchAnthropic('https://api.anthropic.com/v1/messages',{body:JSON.stringify({model:api.MODELE_SONNET})});
 assert.equal(r.status,status);assert.equal(api.resumeAnthropic().erreurs,1);
 }
});


test('local timeouts are distinguished from an actual provider 503 and survive later success',async()=>{
 let n=0;const api=load(async()=>{if(n++===0)throw new DOMException('slow','TimeoutError');return Response.json({content:[]});});
 const init={body:JSON.stringify({model:api.MODELE_SONNET})};
 const r=await api.fetchAnthropic('https://test',init);
 assert.equal(r.status,504);assert.equal(r.headers.get('x-bia-erreur'),'delai_depasse');
 await api.fetchAnthropic('https://test',init);
 assert.equal(api.resumeAnthropic().dernier_statut,200);assert.equal(api.resumeAnthropic().derniere_erreur.motif,'delai_depasse');
 const provider=load(async()=>new Response('',{status:503}));
 assert.equal((await provider.fetchAnthropic('https://test',init)).status,503);
 assert.equal(provider.resumeAnthropic().derniere_erreur.motif,'fournisseur_HTTP_503');
});
test('the caller cancellation signal is preserved',async()=>{
 const controller=new AbortController();controller.abort();
 const api=load(async(url,init)=>{assert.equal(init.signal.aborted,true);throw init.signal.reason;});
 const r=await api.fetchAnthropic('https://test',{signal:controller.signal,body:'{}'});
 assert.equal(r.headers.get('x-bia-erreur'),'annule');
});
test('stable pedagogical instructions get a second cache breakpoint before changing retrieved data',()=>{
 const api=load(async()=>Response.json({}));
 const native=api.messagesAnthropic([
  {role:'system',content:'personnalité '.repeat(300)},
  {role:'system',content:'INSTRUCTIONS PÉDAGOGIQUES DU MAÎTRE AUTHENTIFIÉ\n'+'règles '.repeat(500)},
  {role:'system',content:'options variables '.repeat(300)},
  {role:'user',content:'Ma question'},
 ]);
 assert(native.system[0].cache_control);assert(native.system[1].cache_control);
 assert.equal(native.system[2].cache_control,undefined);
});
test('pedagogical reads share a cache but a saved instruction requires fresh durable read-back',async()=>{
 const crypto=await import('node:crypto');let calls=0,writes=0,rows=[];
 const js=ts.transpileModule(fs.readFileSync('lib/instructions-apprentissage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 const deps={'node:crypto':crypto,'./lexique':{lexiqueConfig:{actif:true,url:'https://test.invalid',table:'lexique',cle:'test-only'},ajouterCorrection:async r=>{writes++;rows=[{source:r.source,corrigee:r.corrigee},...rows];}},'./lexique-apprentissage-core':{APP_LECONS:'test'}};
 new Function('require','module','exports','fetch',js)(n=>deps[n],module,module.exports,async()=>{calls++;return Response.json(rows);});
 const api=module.exports;
 await Promise.all([api.contexteInstructions(),api.contexteInstructions()]);assert.equal(calls,1);
 await api.garderInstruction('Conserve mes corrections exactes.');assert.equal(writes,1);assert.equal(calls,3);
 assert((await api.contexteInstructions()).includes('Conserve mes corrections exactes.'));assert.equal(calls,3);
});


test('stable tool text gets a cache breakpoint before changing lesson options without altering any text',()=>{
 const api=load(async()=>Response.json({}));
 const data=[{role:'system',content:'personnalité '.repeat(300)},{role:'system',content:'INSTRUCTIONS PÉDAGOGIQUES DU MAÎTRE AUTHENTIFIÉ\n'+'règles '.repeat(500)},{role:'system',content:"Les commandes d'écran se placent en fin de réponse.\n"+'règle outil '.repeat(400)},{role:'system',content:'Choix du devoir changeant '.repeat(200)},{role:'user',content:'Ma question'}];
 const avant=api.messagesAnthropic(data,false),apres=api.messagesAnthropic(data);
 assert.deepEqual(apres.system.map(b=>b.text),avant.system.map(b=>b.text));assert.deepEqual(apres.messages,avant.messages);
 assert.equal(avant.system[2].cache_control,undefined);assert(apres.system[2].cache_control);assert.equal(apres.system[3].cache_control,undefined);
 assert.equal(apres.system.filter(b=>b.cache_control).length,3);
 assert(apres.system.filter(b=>b.cache_control).every(b=>b.cache_control.ttl==='1h'));
});


test('Haiku uses low effort, no assistant prefill or unsupported sampling while preserving schemas and exact text',()=>{
 const api=load(async()=>Response.json({}));
 const messages=[{role:'user',content:'Kan moo la ko bëgg may ?'}],format={type:'json_schema',schema:{type:'object'}};
 const body=api.corpsAnthropic({model:api.MODELE_HAIKU,messages,max_tokens:3000,temperature:0,top_p:.1,thinking:{type:'enabled'},output_config:{format}});
 assert.equal(body.temperature,undefined);assert.equal(body.top_p,undefined);assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.output_config.effort,'low');assert.equal(body.output_config.format,format);assert.equal(body.messages,messages);assert.equal(body.max_tokens,3000);
});
