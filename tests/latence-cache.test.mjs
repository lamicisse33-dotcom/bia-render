import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(fetch,env={}){
 const modules=new Map(),world={};
 function get(name){
  if(modules.has(name))return modules.get(name).exports;
  if(name==='instructions-apprentissage')return {contexteInstructions:async()=>('Conserve exactement les corrections de papa.\n').repeat(150)};
  const m={exports:{}};modules.set(name,m);
  const code=ts.transpileModule(fs.readFileSync('lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports','fetch','globalThis','process',code)(n=>get(n.replace('./','')),m,m.exports,fetch,world,{env});return m.exports;
 }
 return {api:get('latence-cache-anthropic'),conversation:get('conversation-groq'),native:get('cerveau-anthropic')};
}
test('warm-up uses byte-identical production prefixes for both identities and excludes changing data',()=>{
 const {api,conversation,native}=load();
 for(const maitre of [false,true]){
  const instructions='Texte wolof appris : Ñu ngi fi, jërëjëf.\n'.repeat(200);
  const p=api.prefixeContexte(maitre,instructions);
  const ordinary=native.messagesAnthropic(conversation.messagesConversation({question:'Question privée',history:[{role:'user',content:'Historique privé'}],maitre,instructions,rapide:true,fiches:'Fiche privée'}));
  assert.deepEqual(p,ordinary.system.slice(0,maitre?2:1));
  assert(!JSON.stringify(p).includes('privé'));assert(p.every(b=>b.cache_control.ttl==='1h'));
 }
});
test('cold-start warming is shared, bounded to two calls, zero-output and does not cache the dummy user',async()=>{
 const calls=[];const {api}=load(async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json({usage:{cache_creation:{ephemeral_1h_input_tokens:2000},output_tokens:0}});},{BIA_LLM_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'test-only'});
 await Promise.all([api.prechaufferContexteAnthropic(),api.prechaufferContexteAnthropic()]);
 assert.equal(calls.length,2);
 for(const b of calls){assert.equal(b.max_tokens,0);assert.equal(b.stream,undefined);assert.equal(b.model,'claude-sonnet-5-5');assert.equal(b.messages[0].cache_control,undefined);assert.equal(b.thinking.type,'between_tools');assert(b.system.every(x=>x.cache_control.ttl==='1h'));}
 assert.equal(api.resumeLatenceCache().prechauffage.length,2);
});
test('another provider is never warmed and a refused warm-up cannot break chat',async()=>{
 let calls=0;const foreign=load(async()=>{calls++;},{BIA_LLM_PROVIDER:'cerebras',ANTHROPIC_API_KEY:'test-only'});
 await foreign.api.prechaufferContexteAnthropic();assert.equal(calls,0);
 const refused=load(async()=>Response.json({error:{message:'private rejected detail'}},{status:400}),{ANTHROPIC_API_KEY:'test-only'});
 await refused.api.prechaufferContexteAnthropic();assert.equal(refused.api.resumeLatenceCache().prechauffage[0].statut,400);
 assert(!JSON.stringify(refused.api.resumeLatenceCache()).includes('private rejected'));
});
test('real streaming diagnostic checks cache reads and complete events without exporting generated text',async()=>{
 const calls=[];const {api}=load(async(url,init)=>{
  const body=JSON.parse(init.body);calls.push(body);
  if(!body.stream)return Response.json({usage:{output_tokens:0}});
  const cached=body.system.some(x=>x.cache_control);
  const events=[{type:'message_start',message:{usage:{cache_read_input_tokens:cached?2000:0}}},{type:'content_block_delta',delta:{type:'text_delta',text:'private synthetic output'}},{type:'message_delta',usage:{output_tokens:10}},{type:'message_stop'}];
  const bytes=new TextEncoder().encode(events.map(d=>'data: '+JSON.stringify(d)+'\r\n\r\n').join(''));
  return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}));
 },{ANTHROPIC_API_KEY:'test-only'});
 await api.verifierLatenceCache();await api.verifierLatenceCache();
 const report=api.resumeLatenceCache();assert.equal(calls.length,6);assert.equal(report.comparaison.statut,'termine');
 assert.deepEqual(report.comparaison.cas.map(c=>c.mode),['sans_cache','cache_1h','cache_1h','sans_cache']);
 assert(!JSON.stringify(report).includes('private'));assert.equal(report.comparaison.lecture_navigateur_mesuree,false);
});
