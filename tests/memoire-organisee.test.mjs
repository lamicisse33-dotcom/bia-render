import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import ts from 'typescript';
function load(p,deps){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>{assert(n in deps,n);return deps[n]},m,m.exports);return m.exports;}
const fusion=load('lib/memoire-commune-core.ts',{});
const fiches=load('lib/fiches-connaissances-core.ts',{});
const objects=new Map();let writes=0,broken=false;
const deps={'./memoire-commune-core':fusion,'./fiches-connaissances-core':fiches,'node:crypto':crypto,'./audio-memoire-stockage':{assurerMemoire:async()=>{},objetsMemoire:async()=>new Map([['a'.repeat(64),5000]]),ecrireObjetMemoire:async(p,s)=>{writes++;objects.set(p,s)},lireObjetMemoire:async p=>objects.has(p)?Response.json(broken?{}:JSON.parse(objects.get(p))):null},'./lexique':{lexiqueConfig:{table:'test'},lectureLexique:()=>({motif:''}),toutes:async()=>[{source:'bonjour',corrigee:'salaam',application:'bia'},{source:'bonjour',corrigee:'old',application:'bia'}]},'./lexique-apprentissage':{lireLecons:async()=>[{texte:'xale',langue:'wo',statut:'validé'},{texte:'draft',langue:'wo',statut:'incertain'}]},'./devoirs-apprentissage':{devoirsALire:async()=>({devoirs:[{id:'current',texte:'Xale bi.'},{id:'old',texte:'Old'}]})},'./dialogue-devoirs-core':{indexerDevoirs:()=>[{id:'current'}],normaliserDialogue:s=>s.toLowerCase()},'./lexique-partage':{lireLexiquePartage:async()=>[{source:'enfant',corrigee:'xale',langue_source:'fr'}]},'./biba-corrections':{lireCorrectionsBiba:async()=>[{id:'biba:1',reponse_wo:'Maa ngi fi.'}]},'./fiches-connaissances':{inventaireFiches:async()=>[{id:'khalam',origine:'data/khalam.md',texte:'Khalam'}]},'./lecons':{listerLecons:async()=>[],preparerLesLecons:async()=>{},ceQuiCloche:()=>[]},'./instructions-apprentissage':{contexteInstructions:async()=>''}};
const service=load('lib/memoire-organisee.ts',deps);
test('durable catalogue preserves origins, exact text, eligibility, latest corrections and audio references',async()=>{
 const b=await service.organiserMemoire();assert.equal(b.relecture_exacte,true);assert.equal(writes,1);const c=await service.lireCatalogueMemoire();assert.equal(c.elements.filter(e=>e.famille==='corrections').length,1);assert.equal(c.elements.find(e=>e.id==='devoirs:old').actif,false);assert.equal(c.elements.filter(e=>e.famille==='prononciations'&&e.actif).length,1);assert.match(c.elements.find(e=>e.famille==='fiches').texte,/Khalam/);assert.match(c.elements.find(e=>e.famille==='audios').source,/sons/);
});
test('bad reread never confirms complete organization and retry remains possible',async()=>{broken=true;await assert.rejects(service.organiserMemoire(),/non confirmée/);assert.equal(service.resumeMemoireOrganisee().statut,'organisation_non_confirmee');broken=false;assert.equal((await service.organiserMemoire()).relecture_exacte,true)});
test('anonymous access cannot search or reorganize private memory',async()=>{let calls=0;const api=load('app/api/apprentissage/memoire/route.ts',{'@/lib/codes':{verifierCode:()=>({ok:false})},'@/lib/memoire-organisee':{organiserMemoire:()=>{calls++},lireCatalogueMemoire:()=>{calls++}}});for(const fn of [api.GET,api.POST])assert.equal((await fn(new Request('https://test/api'))).status,401);assert.equal(calls,0)});

test('identical translations merge across directions with both sources retained; drafts stay excluded',()=>{const entries=[{id:'a',famille:'lexique_partage',source:'a',actif:true,texte:JSON.stringify({source:'enfant',corrigee:'xale',langue_source:'fr'})},{id:'b',famille:'lexique_partage',source:'b',actif:true,texte:JSON.stringify({source:'xale',corrigee:'enfant',langue_source:'wo'})},{id:'c',famille:'fiches',source:'c',actif:false,texte:'draft'}];const result=fusion.fusionnerMemoire(entries);assert.equal(result.length,1);assert.equal(result[0].origine,'a | b');assert.match(result[0].texte,/Français : enfant/)});
test('conversation queries the common index without another Supabase read',async()=>{const context=await service.contexteMemoireCommune('Khalam',[]);assert.match(context,/MÉMOIRE COMMUNE/);assert.match(context,/Khalam/);assert.equal(service.resumeMemoireOrganisee().dernier_acces.lecture,'index commun en mémoire')});


test('an invalidated RAM index reloads current lessons and corrections without storage writes',async()=>{
 const previous=globalThis.biaRevisionMemoire;globalThis.biaRevisionMemoire=2;let reads=0,writeAttempts=0;
 const catalogue={version:1,elements:[
  {id:'fiches:stable',famille:'fiches',source:'fiche',actif:true,texte:JSON.stringify({titre:'Khalam',texte:'Information Khalam conservée.'})},
  {id:'corrections:old',famille:'corrections',source:'old',actif:true,texte:JSON.stringify({source:'voiture',corrigee:'ancienne correction'})},
  {id:'devoirs:current',famille:'devoirs',source:'old',actif:true,texte:'Ancienne formulation du devoir.'},
 ]};
 const refreshed={...deps,
  './audio-memoire-stockage':{lireObjetMemoire:async()=>{reads++;return Response.json(catalogue);},assurerMemoire:async()=>{writeAttempts++;assert.fail('no storage mutation');},ecrireObjetMemoire:async()=>{writeAttempts++;assert.fail('no storage mutation');}},
  './fiches-connaissances-core':{indexerFiches:docs=>docs,selectionnerFiches:docs=>({passages:docs,texte:docs.map(d=>d.texte).join(' ')})},
  './lexique':{lexiqueConfig:{table:'test'},lectureLexique:()=>({motif:''}),toutes:async()=>[{source:'voiture',corrigee:'Correction exacte récente.',application:'bia'}]},
  './devoirs-apprentissage':{devoirsALire:async()=>({devoirs:[{id:'current',texte:'Nouvelle formulation validée.'},{id:'old',texte:'Version inactive à ne pas lire.'}]})},
 };
 try{
  const api=load('lib/memoire-organisee.ts',refreshed);
  const [a,b]=await Promise.all([api.contexteMemoireCommune('voiture',[]),api.contexteMemoireCommune('devoir',[])]);
  for(const text of [a,b]){assert.match(text,/Correction exacte récente/);assert.match(text,/Nouvelle formulation validée/);assert.match(text,/Information Khalam conservée/);assert.doesNotMatch(text,/ancienne correction|Ancienne formulation|Version inactive/);}
  assert.equal(reads,1,'concurrent requests share a single reload');assert.equal(writeAttempts,0);
  await api.contexteMemoireCommune('voiture',[]);assert.equal(reads,1,'ordinary turns stay in RAM');
  assert.equal(api.resumeMemoireOrganisee().index_lecture_seule.statut,'disponible');
 }finally{if(previous===undefined)delete globalThis.biaRevisionMemoire;else globalThis.biaRevisionMemoire=previous;}
});
test('a correction arriving during reload is never certified as current; the next read can retry',async()=>{
 const previous=globalThis.biaRevisionMemoire;globalThis.biaRevisionMemoire=2;let changed=false;
 try{
  const api=load('lib/memoire-organisee.ts',{...deps,'./audio-memoire-stockage':{lireObjetMemoire:async()=>Response.json({version:1,elements:[]})},'./lexique':{...deps['./lexique'],toutes:async()=>{if(!changed){changed=true;globalThis.biaRevisionMemoire++;}return [{source:'voiture',corrigee:'Correction actuelle.',application:'bia'}];}}});
  await assert.rejects(api.contexteMemoireCommune('voiture',[]),/actualisation/);
  assert.match(await api.contexteMemoireCommune('voiture',[]),/Correction actuelle/);
 }finally{if(previous===undefined)delete globalThis.biaRevisionMemoire;else globalThis.biaRevisionMemoire=previous;}
});
test('an incomplete correction read cannot silently serve the stale catalogue',async()=>{
 const previous=globalThis.biaRevisionMemoire;globalThis.biaRevisionMemoire=2;
 try{
  const api=load('lib/memoire-organisee.ts',{...deps,'./audio-memoire-stockage':{lireObjetMemoire:async()=>Response.json({version:1,elements:[]})},'./lexique':{...deps['./lexique'],lectureLexique:()=>({motif:'indisponible'})}});
  await assert.rejects(api.contexteMemoireCommune('voiture',[]),/complète du lexique/);
 }finally{if(previous===undefined)delete globalThis.biaRevisionMemoire;else globalThis.biaRevisionMemoire=previous;}
});
