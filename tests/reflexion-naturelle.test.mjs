import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
const page=fs.readFileSync('app/page.tsx','utf8');
const ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name,env){
  let arrow;
  function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)arrow=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,visit);}
  visit(ast);assert(arrow);
  return new Function('env',`with(env){${ts.transpileModule('const run='+arrow,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText};return run;}`)(env);
}
const ref=current=>({current});
const policyModule={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/reflexion-courte.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(policyModule,policyModule.exports);
const {REFLEXION_COURTE,choisirReflexionCourte}=policyModule.exports;

test('the actual preloader warms both converted takes with the default portrait and never synthesizes',async()=>{
 let setup;
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes("etape:'reflexion_prechargee'"))setup=n.arguments[0].getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(setup);
 const cache=new Map(),calls=[],measures=[];
 const env={code:'test',choixVoix:'female',personaRef:ref('rara'),piperWebActif:()=>false,voixChatterboxBia:()=> 'female',souffleDe:()=>({fichiers:['/take1.mp3','/take2.mp3']}),cacheSons:ref(cache),fetch:async(url,options)=>{calls.push(url);if(url==='/api/mesure'){measures.push(JSON.parse(options.body));return {ok:true};}return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2400)};}};
 const run=new Function('env',`with(env){return ${ts.transpileModule('const f='+setup,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/^const f = /,'').replace(/;\s*$/,'')};}`)(env);
 const cleanup=run();await new Promise(r=>setTimeout(r,0));assert.equal(cache.size,2);assert.deepEqual(calls,['/take1.mp3','/take2.mp3','/api/mesure']);assert.equal(measures[0].charges,2);assert.equal(measures[0].echecs,0);cleanup();
});
function fixture(){
  const timers=[],heard=[],measures=[],token={};
  const source={connect(){},start(){heard.push('mmm');},stop(){heard.push('stop');}};
  const gain={gain:{value:1},connect(){}};
  const env={REFLEXION_COURTE,choisirReflexionCourte,rythmeReflexionRef:ref({courtes:2,derniere:null}),piperWebActif:()=>false,personaRef:ref('bia'),voixChatterboxBia:()=> 'female',carteOuverteRef:ref(false),souffleDe:()=>({fichiers:['take']}),setTimeout:(f,ms)=>timers.push({f,ms}),attenteRef:ref(token),stopAttenteRef:ref(false),sourceRef:ref(null),souffleDattenteRef:ref(null),dernierSouffle:ref(null),fichierDe:()=> 'take',cacheSons:ref(new Map([['take',new ArrayBuffer(8)]])),autoriserLaVoix:async current=>current(),reveillerLeSon:async()=>({decodeAudioData:async()=>({duration:1.93}),createBufferSource:()=>source,createGain:()=>gain}),fetch:async(_url,init)=>{measures.push(JSON.parse(init.body));return {};}};
  return {env,timers,heard,measures,token,source,gain,start:(duree=2400)=>callback('soufflerEnAttendant',env)(token,duree)};
}
test('a short turn gets one natural sound only after an actual 1200 ms wait; the reply stops it synchronously',async()=>{
  const f=fixture(),p=f.start();assert.deepEqual(f.heard,[]);assert.equal(f.timers[0].ms,1200);
  f.timers[0].f();await p;assert.deepEqual(f.heard,['mmm']);assert.equal(f.measures[0].phase,'initiale');assert.equal(f.measures[0].duree_ms,1930);assert.equal(f.gain.gain.value,.35);assert.equal(f.measures[0].volume,.35);
  callback('taireLeSouffle',f.env)();assert.deepEqual(f.heard,['mmm','stop']);assert.equal(f.env.souffleDattenteRef.current,null);
});
test('a prepared reply, cancellation, or new turn during the timer prevents any filler',async()=>{
  for(const change of [e=>e.attenteRef.current=null,e=>e.sourceRef.current={},e=>e.stopAttenteRef.current=true,e=>e.attenteRef.current={}]){
    const f=fixture(),p=f.start();change(f.env);f.timers[0].f();await p;assert.deepEqual(f.heard,[]);assert.deepEqual(f.measures,[]);
  }
});
test('a reply arriving during fetch or decode prevents a late mmm',async()=>{
  for(const stage of ['fetch','decode']){
    const f=fixture();let finish;
    const pending=new Promise(r=>finish=r);
    if(stage==='fetch'){f.env.cacheSons.current.clear();f.env.fetch=async()=>{await pending;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};}
    else f.env.reveillerLeSon=async()=>({decodeAudioData:async()=>{await pending;return {duration:1.93};},createBufferSource:()=>f.source});
    const p=f.start();f.timers[0].f();await Promise.resolve();await Promise.resolve();f.env.attenteRef.current=null;finish();await p;assert.deepEqual(f.heard,[]);
  }
});
test('the default portrait uses the owner takes; the live speech gate, other voices and map remain respected',async()=>{
  const rara=fixture();rara.env.personaRef.current='rara';const rp=rara.start();rara.timers[0].f();await rp;assert.deepEqual(rara.heard,['mmm']);
  const f=fixture();f.env.autoriserLaVoix=async()=>false;const p=f.start();f.timers[0].f();await p;assert.deepEqual(f.heard,[]);
  for(const change of [e=>e.voixChatterboxBia=()=> 'male',e=>e.carteOuverteRef.current=true,e=>e.piperWebActif=()=>true]){
    const x=fixture();change(x.env);await x.start();assert.equal(x.timers.length,0);assert.deepEqual(x.heard,[]);
  }
});
test('a reflection emotion never adds a mandatory prelude before a ready reply',async()=>{
  await callback('jouerSouffle',{})('reflexion');
});
test('published short and long takes match the exact owner cuts and verified Khalam conversion',()=>{
  const manifest=JSON.parse(fs.readFileSync('public/sons/reflexion-khalam-20261020.json','utf8'));
  assert.equal(manifest.prises.length,2);
  for(const p of manifest.prises){assert([1200,1500].includes(p.duree_decoupee_ms));assert(p.duree_decodee_ms>=1200&&p.duree_decodee_ms<=1600);const bytes=fs.readFileSync('public'+p.fichier);assert.equal(bytes.length,p.octets);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),p.sha256);}
});

test('reflection telemetry keeps measured waits separate from first response latency',()=>{
  const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/briques-etat.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(id=>id==='./seuils-anticipation'?{premierSegmentMs:()=>1000,attenteEnvoiMs:()=>800,signesAnticipation:()=>20,teteCourteSignes:()=>20,phraseLongueSignes:()=>70}:policyModule.exports,m,m.exports);
  const before=m.exports.resumeBriques().lectures;
  m.exports.noterBriques({etape:'reflexion',phase:'initiale',ms:837,duree_ms:1930});
  const after=m.exports.resumeBriques();assert.equal(after.lectures,before);assert.equal(after.derniere_reflexion.attente_ms,837);assert.equal(after.derniere_reflexion.duree_ms,1930);
});

test('long, unknown, non-selected and recently served turns never start a timer or audio',async()=>{
  for(const duree of [0,-1,NaN,Infinity,5001,15000,120000]){const f=fixture();await f.start(duree);assert.equal(f.timers.length,0);assert.deepEqual(f.heard,[]);}
  const f=fixture();f.env.rythmeReflexionRef.current={courtes:0,derniere:null};
  await f.start();await f.start();assert.equal(f.timers.length,0);
  const p=f.start();f.timers[0].f();await p;assert.deepEqual(f.heard,['mmm']);
  const recent=fixture();recent.env.rythmeReflexionRef.current.derniere=Date.now();await recent.start();assert.equal(recent.timers.length,0);
});
test('one in three eligible short turns at most, with 45 seconds since actual playback',()=>{
  const e={courtes:0,derniere:null};
  assert.deepEqual(Array.from({length:9},()=>choisirReflexionCourte(e,5000,100000)),[false,false,true,false,false,true,false,false,true]);
  e.derniere=100000;e.courtes=2;assert.equal(choisirReflexionCourte(e,5000,144999),false);
  e.courtes=2;assert.equal(choisirReflexionCourte(e,5000,145000),true);
});
test('the actual streaming waiting callback stays silent between bricks',()=>{
 let found;
 function visit(n){if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='attente'&&n.initializer.getText(ast).includes('No MMM between streamed bricks'))found=n.initializer.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(found);
 const env={attendBrique:false};new Function('env',`with(env){(${found})();}`)(env);assert.equal(env.attendBrique,true);
});
