import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const page=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let body;
function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='ecouter')body=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,walk);}walk(ast);assert(body);
const make=new Function('env',`with(env){${compile('const run='+body)};return run;}`);
const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
const tick=()=>new Promise(r=>setTimeout(r,0));
function environment(){
 let id=0,starts=0,stops=0;const intervals=new Map(),errors=[],recorders=[];
 const ref=current=>({current});
 /* Khalam Rapide (la conversation rapide) est le défaut depuis le 23 octobre
    2026, et `ecouter` sort par là en premier. Ces épreuves-ci mesurent le
    chemin Khalam — l'enregistreur, la frontière des 400 ms, l'exclusivité du
    micro : elles le demandent donc explicitement. Le chemin rapide a ses
    propres épreuves dans tests/gemini-live.test.mjs et
    tests/interface-maitre-live-browser.cjs. */
 const env={utiliserLiveMaitre:()=>false,conversationRef:ref(false),modeRef:ref('ready'),busyRef:ref(false),ecouterRef:ref(null),ouvertureEcouteRef:ref(null),enregistreurRef:ref(null),nouvelEnregistrement:()=>++id,estCetEnregistrement:n=>n===id,
  micro:async()=>({flux:{},analyse:{frequencyBinCount:256},analysePeriodique:{fftSize:1024},ctxMicro:{state:'running'}}),
  ouvrirEnregistreur:()=>{const r={state:'inactive',start(){starts++;this.state='recording';},stop(){stops++;this.state='inactive';}};recorders.push(r);return r;},
  creerFiltreDeclenchement:()=>()=>false,suivreLeBruit:()=>({seuil:()=>8}),seuilRef:ref(8),
  setInterval:f=>{const n=intervals.size+1;intervals.set(n,f);return n;},clearInterval:n=>intervals.delete(n),TOUR_DE_VEILLE:60,
  bornesRef:ref({}),tourVide:()=>({}),exclusionAnticipation:()=>'',personaRef:ref('rara'),essaiChatterboxActif:()=>true,
  localStorage:{getItem:()=>null},apprend:ref(false),correctionDevoirRef:ref(null),chantierMalDit:ref(false),attendLeNomRef:ref(false),motsRattrapesRef:ref(null),
  codeRef:ref('test'),historyRef:ref([]),resumeRef:ref(''),voixChatterboxBia:()=> 'female',fenetreDuFil:x=>x,
  brancherAnticipation:async()=>null,fetch:async()=>({ok:true}),setMode:m=>{if(m==='error')errors.push(m);},setFace(){}};
 return {env,intervals,recorders,errors,advance:()=>id++,id:()=>id,starts:()=>starts,stops:()=>stops};
}
test('actual opening is exclusive while getUserMedia is pending; stale failure does not overwrite the new mode',{timeout:2000},async()=>{
 const x=environment(),micro=deferred();x.env.micro=()=>micro.promise;const run=make(x.env);
 const first=run();await run();assert.equal(x.id(),1);assert.equal(x.starts(),0);
 x.advance();micro.reject(Error('old permission'));await first;assert.equal(x.errors.length,0);assert.equal(x.env.ouvertureEcouteRef.current,null);
});
test('actual stale worklet setup cleans its timer and cannot stop a later recorder',{timeout:2000},async()=>{
 const x=environment(),worklet=deferred();let cancelled=0;x.env.brancherAnticipation=()=>worklet.promise;const run=make(x.env);
 const pending=run();await tick();assert.equal(x.intervals.size,1);const oldTick=[...x.intervals.values()][0];
 await run();assert.equal(x.id(),1,'second opening may not invalidate the first');
 x.advance();const replacement={state:'recording',stop(){assert.fail('old timer stopped new recorder');}};x.env.enregistreurRef.current=replacement;
 oldTick();assert.equal(x.intervals.size,0);worklet.resolve({annuler:async()=>{cancelled++;}});await pending;
 assert(cancelled>0);assert.equal(x.intervals.size,0);assert.equal(x.env.enregistreurRef.current,replacement);assert.equal(x.starts(),0);
});
test('actual successful opening starts only once and leaves one watchdog; a stale watchdog retires itself',{timeout:2000},async()=>{
 const x=environment(),run=make(x.env);await run();assert.equal(x.starts(),1);assert.equal(x.intervals.size,1);
 await run();assert.equal(x.starts(),1);
 x.advance();[...x.intervals.values()][0]();assert.equal(x.intervals.size,0);assert.equal(x.stops(),0);
});

 test('close/reopen during pending permission schedules a fresh capture after the stale one releases',{timeout:2000},async()=>{
 const x=environment(),permission=deferred();let retry=0;x.env.micro=()=>permission.promise;x.env.ecouterRef.current=()=>{retry++;};
 const pending=make(x.env)();x.advance();x.env.conversationRef.current=true;permission.reject(Error('cancelled opening'));await pending;await tick();
 assert.equal(retry,1);assert.equal(x.env.ouvertureEcouteRef.current,null);assert.equal(x.errors.length,0);
 });

test('a direct microphone opening cannot invalidate a live response between its audio bricks',async()=>{
 const x=environment();x.env.busyRef.current=true;await make(x.env)();
 assert.equal(x.id(),0);assert.equal(x.starts(),0);assert.equal(x.intervals.size,0);
});
