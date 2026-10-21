import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function charger(fetch,env={},instructions=async()=>'Instructions privées apprises. '.repeat(150)){
 const modules=new Map(),world={},verifications=[];
 function get(name){
  if(modules.has(name))return modules.get(name).exports;
  if(name==='instructions-apprentissage')return {contexteInstructions:instructions};
  if(name==='codes')return {verifierCode:(code,consommer)=>{verifications.push({code,consommer});return {ok:code==='maitre'||code==='invite',maitre:code==='maitre'};}};
  const m={exports:{}};modules.set(name,m);
  const path=name==='route'?'app/api/essai-cerveaux/route.ts':'lib/'+name+'.ts';
  const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports','fetch','globalThis','process',code)(n=>get(n.replace(/^\.\//,'').replace(/^@\/lib\//,'')),m,m.exports,fetch,world,{env});
  return m.exports;
 }
 return {api:get('essai-gpt'),core:get('essai-gpt-core'),route:get('route'),verifications};
}
function flux(events,tail=true){
 const bytes=new TextEncoder().encode(events.map(d=>'event: '+d.type+'\r\ndata: '+JSON.stringify(d)+'\r\n\r\n').join(''));
 return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i++)c.enqueue(bytes.slice(i,i+1));if(tail)c.close();}}));
}
function reponse(provider,texte='Ñu ngi fi, jërëjëf.'){return provider==='openai'?flux([
 {type:'response.output_text.delta',delta:texte.slice(0,5)},
 {type:'response.output_text.delta',delta:texte.slice(5)},
 {type:'response.completed',response:{status:'completed',usage:{input_tokens_details:{cached_tokens:1250},output_tokens:12}}},
]):flux([
 {type:'message_start',message:{usage:{cache_read_input_tokens:1500}}},
 {type:'content_block_start',content_block:{type:'text',text:texte.slice(0,5)}},
 {type:'content_block_delta',delta:{type:'text_delta',text:texte.slice(5)}},
 {type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:10}},
 {type:'message_stop'},
]);}
const env={OPENAI_API_KEY:'test-openai',ANTHROPIC_API_KEY:'test-anthropic',BIA_LLM_PROVIDER:'anthropic'};

test('UTF-8 and CRLF split at every byte survive both actual provider protocols',async()=>{
 const {core}=charger();
 for(const p of ['openai','anthropic']){
  const morceaux=[],r=await core.lireFluxEssai(reponse(p),p,t=>morceaux.push(t));
  assert.equal(r.texte,'Ñu ngi fi, jërëjëf.');assert.equal(morceaux.length,2);assert(r.usage.output_tokens>0);
 }
});
test('network EOF, refused, truncated and empty model answers cannot pass as fast successes',async()=>{
 const {core}=charger();
 const invalides=[
  ['openai',[{type:'response.output_text.delta',delta:'Un début.'}]],
  ['openai',[{type:'response.output_text.delta',delta:'Un début.'},{type:'response.incomplete',response:{usage:{}}}]],
  ['openai',[{type:'response.failed',response:{error:{message:'secret fournisseur'}}}]],
  ['openai',[{type:'response.completed',response:{status:'completed'}}]],
  ['anthropic',[{type:'content_block_delta',delta:{type:'text_delta',text:'Un début.'}},{type:'message_delta',delta:{stop_reason:'max_tokens'}},{type:'message_stop'}]],
  ['anthropic',[{type:'error',error:{message:'secret fournisseur'}}]],
 ];
 for(const [p,events] of invalides)await assert.rejects(core.lireFluxEssai(flux(events),p,()=>{}),/flux_(incomplet|refuse)/);
});
test('exact controls cover only the known correction and corrected budget; no invented Wolof quality score',()=>{
 const {core}=charger();
 assert.equal(core.controleEssai('correction','Kan moo la ko bëgg may ?'),true);
 assert.equal(core.controleEssai('correction','Kan moo la ko bëgg a may ?'),false);
 assert.equal(core.controleEssai('correction','Oui papa. Kan moo la ko bëgg may ?'),false);
 for(const n of ['3000','3 000 francs','3\u202f000 FCFA'])assert.equal(core.controleEssai('montant',n),true);
 assert.equal(core.controleEssai('montant','15 000'),false);
 assert.equal(core.controleEssai('fatigue','Une mauvaise réponse'),null);
 assert.equal(core.medianeEssai([900,100,200,400]),300);assert.equal(core.medianeEssai([]),null);
});
test('missing credentials and a different production provider consume zero model calls',async()=>{
 for(const e of [{},{ANTHROPIC_API_KEY:'x'},{...env,BIA_LLM_PROVIDER:'cerebras'}]){
  let appels=0;const {api}=charger(async()=>{appels++;},e);await api.lancerEssaiGPT();
  assert.equal(appels,0);assert.equal(api.resumeEssaiGPT().statut,'configuration_manquante');assert.equal(api.resumeEssaiGPT().lancements_restants,2);
 }
});
test('comparison shares one job, rotates 36 fixed calls and uses the same private context without leaking it publicly',async()=>{
 const appels=[];
 const {api,core}=charger(async(url,init)=>{
  const b=JSON.parse(init.body),p=url.includes('openai')?'openai':'anthropic';appels.push({url,init,b,p});
  const q=(p==='openai'?b.input:b.messages).at(-1).content;
  const texte=q.includes('correction exacte')?'Kan moo la ko bëgg may ?':q.includes('budget actuel')?'3 000':'Ñu ngi fi, jërëjëf.';
  return reponse(p,texte);
 },env);
 const a=api.lancerEssaiGPT('low'),b=api.lancerEssaiGPT('medium');assert.equal(a,b);await a;
 assert.equal(appels.length,36);
 const r=api.resumeEssaiGPT(true),publicR=api.resumeEssaiGPT();assert.equal(r.statut,'termine');assert.equal(r.effort,'low');
 assert(r.bilans.every(x=>x.reussites===12&&x.controles_reussis===4));
 assert.equal(r.mesures.length,36);assert.equal(publicR.mesures,undefined);assert.equal(publicR.cas,undefined);
 assert(!JSON.stringify(publicR).includes('Instructions privées'));assert(!JSON.stringify(publicR).includes('test-openai'));
 for(const x of appels){
  const question=(x.p==='openai'?x.b.input:x.b.messages).at(-1).content;assert(core.CAS_GPT.some(c=>c.question===question));
  assert.equal(x.init.method,'POST');assert(x.init.signal instanceof AbortSignal);
  if(x.p==='openai'){assert.equal(x.b.store,false);assert.equal(x.b.stream,true);assert.equal(x.b.reasoning.effort,'low');assert.equal(x.b.max_output_tokens,1536);assert(['gpt-6-astra','gpt-5.6-sol'].includes(x.b.model));}
  else {assert.equal(x.b.model,'claude-sonnet-5-5');assert.equal(x.b.output_config.effort,'low');assert.equal(x.b.max_tokens,256);}
 }
 const instruction=appels.find(x=>x.p==='anthropic').b.system.map(x=>x.text).join('\n\n');
 assert(appels.filter(x=>x.p==='openai').every(x=>x.b.instructions===instruction));
 assert.deepEqual(appels.slice(0,6).map(x=>x.b.model),['gpt-6-astra','gpt-5.6-sol','claude-sonnet-5-5','gpt-5.6-sol','claude-sonnet-5-5','gpt-6-astra']);
 await api.lancerEssaiGPT('medium');assert.equal(appels.length,72);assert.equal(api.resumeEssaiGPT().effort,'medium');
 assert(appels.slice(36).filter(x=>x.p==='openai').every(x=>x.b.reasoning.effort==='medium'));
 await api.lancerEssaiGPT();assert.equal(appels.length,72);assert.equal(api.resumeEssaiGPT().lancements_restants,0);
});
test('provider refusal is tried once, sanitized and excluded from medians',async()=>{
 const appels=[];const {api}=charger(async(url,init)=>{appels.push(url);return url.includes('openai')?Response.json({error:{message:'secret fournisseur'}},{status:401}):reponse('anthropic');},env);
 await api.lancerEssaiGPT();const r=api.resumeEssaiGPT();assert.equal(r.statut,'termine_avec_echecs');assert.equal(appels.length,14);
 assert.equal(r.bilans[0].premier_texte_ms,null);assert.deepEqual(r.bilans[0].erreurs,['HTTP_401']);assert(!JSON.stringify(api.resumeEssaiGPT(true)).includes('secret fournisseur'));
});
test('failed context read and owner stop prevent further calls',async()=>{
 let appels=0;const inaccessible=charger(async()=>{appels++;},env,async()=>{throw Error('private database detail');});
 await inaccessible.api.lancerEssaiGPT();assert.equal(appels,0);assert.equal(inaccessible.api.resumeEssaiGPT().erreur,'lecture_contexte_indisponible');
 let entree;const attente=new Promise(r=>{entree=r;});
 const {api}=charger(async(_url,init)=>{appels++;entree();await new Promise((_,rej)=>init.signal.addEventListener('abort',()=>rej(init.signal.reason),{once:true}));},env);
 const p=api.lancerEssaiGPT();await attente;api.annulerEssaiGPT();await p;
 assert.equal(appels,1);assert.equal(api.resumeEssaiGPT().statut,'annule');
});
test('route requires master access without consuming quota; refuses arbitrary prompts, models and long bodies',async()=>{
 let appels=0;const {route,verifications}=charger(async()=>{appels++;},{});
 for(const code of ['', 'invite'])for(const methode of ['GET','POST']){
  const r=await route[methode](new Request('https://bia.test/api/essai-cerveaux',{method:methode,headers:{'x-bia-code':code},...(methode==='POST'?{body:'{"action":"lancer"}'}:{})}));assert.equal(r.status,401);
 }
 assert.equal((await route.GET(new Request('https://bia.test',{headers:{'x-bia-code':'maitre'}}))).status,200);
 for(const b of ['bad','null','[]','{"action":"lancer","prompt":"privé"}','{"action":"lancer","model":"arbitraire"}','{"action":"lancer","effort":"high"}','x'.repeat(257)]){
  const r=await route.POST(new Request('https://bia.test',{method:'POST',headers:{'x-bia-code':'maitre'},body:b}));assert([400,413].includes(r.status));
 }
 const r=await route.POST(new Request('https://bia.test',{method:'POST',headers:{'x-bia-code':'maitre'},body:'{"action":"lancer","effort":"low"}'}));assert.equal(r.status,200);assert.equal((await r.json()).statut,'configuration_manquante');
 assert.equal(appels,0);assert(verifications.every(x=>x.consommer===false));
});
