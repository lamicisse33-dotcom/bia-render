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
test('the actual preloader warms both original takes with the default portrait and never synthesizes',async()=>{
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
  const env={piperWebActif:()=>false,personaRef:ref('bia'),voixChatterboxBia:()=> 'female',carteOuverteRef:ref(false),souffleDe:()=>({fichiers:['take']}),setTimeout:(f,ms)=>timers.push({f,ms}),attenteRef:ref(token),stopAttenteRef:ref(false),sourceRef:ref(null),souffleDattenteRef:ref(null),dernierSouffle:ref(null),fichierDe:()=> 'take',cacheSons:ref(new Map([['take',new ArrayBuffer(8)]])),autoriserLaVoix:async current=>current(),reveillerLeSon:async()=>({decodeAudioData:async()=>({duration:1.93}),createBufferSource:()=>source}),fetch:async(_url,init)=>{measures.push(JSON.parse(init.body));return {};}};
  return {env,timers,heard,measures,token,source,start:()=>callback('soufflerEnAttendant',env)(token)};
}
test('a short turn gets one natural sound only after an actual 800 ms wait; the reply stops it synchronously',async()=>{
  const f=fixture(),p=f.start();assert.deepEqual(f.heard,[]);assert.equal(f.timers[0].ms,800);
  f.timers[0].f();await p;assert.deepEqual(f.heard,['mmm']);assert.equal(f.measures[0].phase,'initiale');assert.equal(f.measures[0].duree_ms,1930);
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
test('published takes match the measured cuts; the short rejected sounds are excluded',()=>{
  const manifest=JSON.parse(fs.readFileSync('public/sons/reflexion-20261019.json','utf8'));
  assert.equal(manifest.prises.length,2);
  for(const p of manifest.prises){assert(p.duree_decoupee_ms>=1500&&p.duree_decoupee_ms<=2000);const bytes=fs.readFileSync('public'+p.fichier);assert.equal(bytes.length,p.octets);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),p.sha256);}
});

test('reflection telemetry keeps measured waits separate from first response latency',()=>{
  const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/briques-etat.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports);
  const before=m.exports.resumeBriques().lectures;
  m.exports.noterBriques({etape:'reflexion',phase:'initiale',ms:837,duree_ms:1930});
  const after=m.exports.resumeBriques();assert.equal(after.lectures,before);assert.equal(after.derniere_reflexion.attente_ms,837);assert.equal(after.derniere_reflexion.duree_ms,1930);
});
