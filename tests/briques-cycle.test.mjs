import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const page=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function effect(marker){let body;function walk(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes(marker))body=n.arguments[0].getText(ast);ts.forEachChild(n,walk);}walk(ast);assert(body);return new Function('env',`with(env){${ts.transpileModule('const run='+body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText};return run;}`);}
const guard=effect('const filet = setTimeout'),auto=effect('}, 180)');
function environment(mode='thinking'){
 const timers=[],modes=[];let opens=0;const ref=current=>({current});
 const env={conversation:true,mode,conversationRef:ref(true),modeRef:ref(mode),busyRef:ref(true),attenteRef:ref(null),voixDuTelephoneRef:ref(false),fluxVoixRef:ref(new Set()),sourceRef:ref(null),sourcesRef:ref(new Set()),
  setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},setMode:m=>{modes.push(m);env.modeRef.current=m;},setFace(){},enregistreEncore:()=>false,ecouterRef:ref(()=>{opens++;})};
 return {env,timers,modes,opens:()=>opens};
}
test('actual thinking watchdog keeps a chain alive between bricks after the waiting token is cleared',()=>{
 const x=environment();guard(x.env)();assert.equal(x.timers.length,1);x.timers[0]();
 assert.deepEqual(x.modes,[],'a running response must not be marked ready after 2.5 seconds');
});
test('automatic microphone opening rechecks the live phase and busy state when its timer fires',()=>{
 for(const [mode,busy] of [['thinking',false],['speaking',false],['ready',true]]){
  const x=environment('ready');x.env.busyRef.current=false;auto(x.env)();assert.equal(x.timers.length,1);
  x.env.modeRef.current=mode;x.env.busyRef.current=busy;x.timers[0]();assert.equal(x.opens(),0,`${mode}, busy=${busy}`);
 }
});
test('an actual orphan thinking state recovers, and a truly idle microphone still opens',()=>{
 const x=environment();x.env.busyRef.current=false;guard(x.env)();x.timers[0]();assert.deepEqual(x.modes,['ready']);
 const y=environment('ready');y.env.busyRef.current=false;auto(y.env)();y.timers[0]();assert.equal(y.opens(),1);
});

test('the long watchdog cancels abandoned work instead of only marking it ready, without touching a newer turn',()=>{
 const long=effect('const secours = setTimeout');
 for(const newer of [false,true]){
  const x=environment();x.env.numeroDuTourRef={current:7};let cancelled=0;
  x.env.taireRef={current:()=>{cancelled++;x.env.busyRef.current=false;x.env.setMode('ready');}};
  long(x.env)();if(newer)x.env.numeroDuTourRef.current++;
  x.timers[0]();assert.equal(cancelled,newer?0:1);assert.equal(x.env.busyRef.current,newer);
 }
});
function load(path,req=()=>{throw Error('unexpected import');}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(id=>id==='./rapidite-core'?load('lib/rapidite-core.ts'):id==='./rapidite-etat'?load('lib/rapidite-etat.ts'):req(id),m,m.exports);return m.exports;}
const tick=()=>new Promise(r=>setTimeout(r,0));
test('a first brick, a fabrication gap beyond the watchdog and the next brick remain a single microphone-free chain',async()=>{
 const original=globalThis.fetch,x=environment();let release;const continuation=new Promise(r=>release=r),spoken=[];
 const brick=n=>({numero:n,texte:'Une phrase complète '+n,audio:'AAAA',langue:'fr',voice:'female'});
 globalThis.fetch=async(_url,init)=>{const b=JSON.parse(init.body);if(b.final){await continuation;return Response.json({preparation:{id:'session',brique:brick(1),termine:true}});}return Response.json({preparation:{id:'session',brique:brick(0)}});};
 try{
  const p=load('lib/briques-client.ts',()=>load('lib/briques-file.ts')).creerProducteurBriques({code:'test',tour:'test-cycle-123',history:[],resume:'',voice:'female',persona:'rara',actuel:()=>true});
  const texte='Je suis passé chez le cordonnier pour réparer mes chaussures.';p.progresser(texte);await tick();p.arreterEcoute();
  const reading=p.commencer({signal:new AbortController().signal,jouer:async b=>{spoken.push(b.numero);return true;},attente(){},taire(){},mesure(){}});
  const end=p.terminer(texte+' Puis je suis passé chez le coiffeur.');await tick();assert.deepEqual(spoken,[0]);
  guard(x.env)();x.timers[0]();assert.equal(x.env.modeRef.current,'thinking');assert.deepEqual(x.modes,[]);assert.equal(x.opens(),0);
  release();await end;assert.equal((await reading.fin).normal,false);assert.deepEqual(spoken,[0,1]);
 }finally{globalThis.fetch=original;}
});
test('cycle telemetry preserves turn, completion and cancellation reasons without conversation content',()=>{
 delete globalThis.biaBriquesEtat;const api=load('lib/briques-etat.ts',id=>id==='./seuils-anticipation'?{premierSegmentMs:()=>1000,attenteEnvoiMs:()=>800,patienceBriqueMs:()=>1200,segmentMs:()=>1500,signesAnticipation:()=>20,teteCourteSignes:()=>20,phraseLongueSignes:()=>70}:load('lib/reflexion-courte.ts'));
 for(const etape of ['depart','debut_brique','fin_brique','transcrit','fin_preparation','fin_chaine','annulation'])api.noterBriques({tour:'test-cycle-123',etape,ms:100,pretes:1,en_cours:1,capture_actuelle:0,tour_actuel:1,texte:'private'});
 const c=api.resumeBriques().cycle;assert.equal(c.derniers.length,7);assert.equal(c.comptes.fin_chaine,1);assert.equal(c.derniers.at(-1).capture_actuelle,0);assert.equal(c.derniers.at(-1).tour_actuel,1);assert(c.derniers.every(x=>!('texte'in x)));
});

