import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import crypto from 'node:crypto';
function load(file,deps={},env={}){const m={exports:{}};const s=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',...Object.keys(env),s)(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(env));return m.exports;}
const dialogue=load('lib/dialogue-devoirs-core.ts');
const core=load('lib/audio-memoire-core.ts',{'node:crypto':crypto,'./dialogue-devoirs-core':dialogue,'./sons-courants-core':{VERSION_SONS_COURANTS:'test-voice'}});
const devoir={id:'d1',date:'2026-10-11',valide:true,langue:'wo',texte:'DEVOIR 1\nWolof : Nanga def ?\nFrançais : Comment vas-tu ?'};
const lecon={texte:'Bonjour.',langue:'fr',prononciation:'Bonjour.',exemple:'',statut:'validé',date_validation:'2026-10-11'};
test('inventory includes exact bilingual lessons and confirmed legacy pairs, excludes drafts and instructions, deduplicates',()=>{
 const d=core.inventorierMemoire([devoir,{...devoir,id:'draft',texte:'DEVOIR 2\nWolof : X\nFrançais : Y',valide:false},{...devoir,id:'rule',texte:'INSTRUCTION\nWolof : X\nFrançais : Y'}],[lecon,{...lecon,texte:'Uncertain',statut:'incertain'}],[{source:'Bonjour.',corrigee:'Nanga def ?',langue:'wo',auteur:'maitre-lecon'},{source:'x',corrigee:'unvalidated',auteur:'visiteur'}]);
 assert.equal(d.phrases.length,3);assert.equal(d.devoirsValides,1);assert(d.phrases.find(p=>p.texte==='Nanga def ?').sources.length===2);
 const newer={...devoir,id:'new',date:'2026-10-12',valide:false};assert.equal(core.inventorierMemoire([devoir,newer],[],[]).phrases.length,0);
});
test('the durable audio identity changes with source text, language or pronunciation, not with an unrelated lesson',()=>{
 const p={texte:'Bonjour.',langue:'fr',sources:['source']},plan=[{texte:'Bonjour.',langue:'fr'}],id=core.idAudioMemoire(p,plan);
 assert.equal(id,core.idAudioMemoire({...p,sources:['another']},plan));assert.notEqual(id,core.idAudioMemoire({...p,texte:'Bonsoir.'},plan));assert.notEqual(id,core.idAudioMemoire({...p,langue:'wo'},plan));assert.notEqual(id,core.idAudioMemoire(p,[{texte:'Bon jour.',langue:'fr'}]));
 const lool={texte:'Dama stressé lool.',langue:'wo',sources:['BIA-EMP-023']};
 assert.notEqual(core.idAudioMemoire(lool,[{texte:lool.texte,langue:'wo'}]),core.idAudioMemoire(lool,[{texte:lool.texte,langue:'wo',prise:{female:914}}]));
});
function fixture(){
 const objects=new Map();let generations=0,lessons=[devoir],fail=false,preparations=0,regles=[];
 const storage={assurerMemoire:async()=>{},lireObjetMemoire:async path=>objects.has(path)?new Response(objects.get(path)):null,ecrireObjetMemoire:async(path,body,_t,mutable)=>{if(objects.has(path)&&!mutable)throw Error('already exists');objects.set(path,typeof body==='string'?body:new Uint8Array(body));},supprimerObjetMemoire:async path=>objects.delete(path),objetsMemoire:async()=>new Map([...objects].filter(([p])=>p.startsWith('sons/')&&objects.has('details/'+p.slice(5,-4)+'.json')).map(([p,b])=>[p.slice(5,-4),b.length]))};
 function server(){const g={},timers=[];
  const api=load('lib/audio-memoire.ts',{'node:crypto':crypto,'./lexique-partage':{indexLexiquePartage:async()=>[]},'./devoirs-apprentissage':{devoirsALire:async()=>({devoirs:lessons})},'./lexique-apprentissage':{lireLecons:async()=>[]},'./prononciation':{reglesPrononciation:async()=>regles},'./lexique':{lexiqueConfig:{actif:true,url:'https://private',cle:'server-only',table:'lexique'}},'./passages-khalam-core':{preparerAvecRegles:t=>{preparations++;return [{texte:t,regles}];}},'./audio-memoire-core':core,'./audio-memoire-stockage':storage,'./sons-courants':{fabriquerSon:async()=>{generations++;if(fail)throw Error('GPU failed');return {audio:{secondes:1},mp3:new Uint8Array(2500).fill(25)};}}},{globalThis:g,fetch:async()=>({ok:true,json:async()=>[]}),setTimeout:f=>{timers.push(f);return {unref(){}};},clearTimeout(){}});
  return {api,pump:async()=>{const f=timers.shift();assert(f);f();await g.biaAudioMemoire.worker;},g};
 }return {server,objects,generations:()=>generations,preparations:()=>preparations,pronunciation:()=>{regles=[{de:"x",vers:"y"}];},change:()=>{lessons=[{...devoir,texte:devoir.texte.replace('Nanga def ?','Maa ngi fi.')}];},fail:()=>{fail=true;}};
}
test('generation persists verified audio, survives restart and never regenerates completed entries',async()=>{
 const f=fixture(),s=f.server();await s.api.lancerAudioMemoire();assert.equal(s.api.resumeAudioMemoire().total,2);await s.pump();assert.equal(f.generations(),1);assert.equal(s.api.resumeAudioMemoire().prets,1);
 const restarted=f.server();await restarted.api.reprendreAudioMemoire();assert.equal(restarted.api.resumeAudioMemoire().prets,1);await restarted.pump();assert.equal(f.generations(),2);assert.equal(restarted.api.resumeAudioMemoire().prets,2);await restarted.pump();assert.equal(restarted.api.resumeAudioMemoire().statut,'termine');assert.equal(f.generations(),2);
 const d=await restarted.api.listeAudioMemoire();assert.equal(d.sons.length,2);assert((await restarted.api.servirAudioMemoire(d.sons[0].id)).ok);
});
test('source corrections remove old audio from both the index and authenticated playback',async()=>{
 const f=fixture(),s=f.server();await s.api.lancerAudioMemoire();await s.pump();const old=(await s.api.listeAudioMemoire()).sons[0].id;f.change();await s.api.catalogueAudioMemoire(true);assert.equal(await s.api.servirAudioMemoire(old),null);assert.equal((await s.api.listeAudioMemoire()).sons.length,0);assert.equal(s.api.resumeAudioMemoire().restants,2);
});
test('failed audio is never marked ready; retries are bounded and durable',async()=>{
 const f=fixture(),s=f.server();f.fail();await s.api.lancerAudioMemoire();for(let n=0;n<3;n++)await s.pump();assert.equal(s.api.resumeAudioMemoire().prets,0);assert.equal(s.api.resumeAudioMemoire().echecs,1);assert.equal(f.generations(),3);assert(f.objects.has('echecs.json'));
});
test('anonymous access cannot read private text or audio or start the GPU',async()=>{
 let calls=0;const route=load('app/api/audio-memoire/route.ts',{'next/server':{NextResponse:{json:(x,o)=>({body:x,...o})}},'@/lib/codes':{verifierCode:()=>({ok:false})},'@/lib/audio-memoire':{lancerAudioMemoire:()=>calls++,listeAudioMemoire:()=>calls++,servirAudioMemoire:()=>calls++}});
 const r={headers:{get:()=>null},url:'https://bia/api/audio-memoire'};assert.equal((await route.GET(r)).status,401);assert.equal((await route.POST(r)).status,401);assert.equal(calls,0);
});

test('validated plain Wolof exercises retain all five Wave lines without adding a translation',()=>{
 const texte='Ndax mën naa fay ak Wave ?\nWaaw, mën nga fay ak Wave.\nYónnee ma numéro Wave bi.\nMa ngii def transfert bi ci Wave.\nNdax transfert Wave bi eggsi na ?';
 const d=core.inventorierMemoire([{...devoir,id:'wave',texte}],[],[]);
 assert.deepEqual(d.phrases.map(p=>p.texte),texte.split('\n'));assert(d.phrases.every(p=>p.langue==='wo'));assert.equal(d.aVerifier.length,0);
});

test('an interrupted or concurrent take does not block preparing other lesson replies',async()=>{
 const f=fixture(),s=f.server();await s.api.lancerAudioMemoire();const first=(await s.api.catalogueAudioMemoire())[0];
 f.objects.set('verrous/'+first.id+'.json',JSON.stringify({owner:'other-worker',debut:Date.now()}));
 await s.pump();assert.equal(f.generations(),0);await s.pump();assert.equal(f.generations(),1);assert.equal(s.api.resumeAudioMemoire().prets,1);
});


test('a current stored recording is attached to chat, reused without synthesis, and removed after correction',async()=>{
 const f=fixture(),s=f.server();await s.api.lancerAudioMemoire();await s.pump();
 const son=await s.api.audioPourReponse('Nanga def ?','wo');assert(son);assert.equal(Buffer.from(son.base64,'base64').length,2500);
 const again=await s.api.audioPourReponse('Nanga def ?','wo');assert.equal(again.id,son.id);assert.equal(f.generations(),1);assert(s.api.resumeAudioMemoire().cache_serveur>0);
 f.change();await s.api.catalogueAudioMemoire(true);assert.equal(await s.api.audioPourReponse('Nanga def ?','wo'),null);
});
test('inventory refresh reuses identical preparation but immediately invalidates changed pronunciation',async()=>{
 const f=fixture(),s=f.server();const first=await s.api.catalogueAudioMemoire(true);const calls=f.preparations();
 const second=await s.api.catalogueAudioMemoire(true);assert.deepEqual(second,first);assert.equal(f.preparations(),calls);assert.equal(s.api.resumeAudioMemoire().preparatifs_reutilises,2);
 f.pronunciation();s.g.biaGenerationPrononciation=1;
 const changed=await s.api.catalogueAudioMemoire();assert.notEqual(changed[0].id,first[0].id);assert.equal(f.preparations(),calls+2);
 const baseline=await s.api.catalogueAudioMemoire(true,true);assert.deepEqual(baseline,changed);assert.equal(f.preparations(),calls+4);
});
