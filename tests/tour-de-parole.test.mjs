import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const load = async path => import('data:text/javascript;base64,' + Buffer.from(compile(fs.readFileSync(path, 'utf8'))).toString('base64'));
const {creerDetectionInterruption, attendreSonTour} = await load('lib/tour-de-parole.ts');
const {silenceQuiSuffit} = await load('lib/micro.ts');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };

test('a short breath does not finish a sentence; repeated early cuts extend the pause', () => {
  for (const duration of [700, 2500, 7000]) {
    assert(silenceQuiSuffit(duration) >= 1000);
    assert(silenceQuiSuffit(duration, 2) > silenceQuiSuffit(duration));
    assert(silenceQuiSuffit(duration, 100) <= 2500);
  }
});
test('speech containing consonants and two 120 ms gaps still interrupts', () => {
  const detect = creerDetectionInterruption();
  const samples = [[1,1],[1,0],[0,0],[0,0],[1,1],[1,0],[0,0],[0,0],[1,1]];
  assert(samples.some(([a,v]) => detect(!!a,!!v,60)));
});
test('isolated knocks, sustained non-vocal noise and old speech do not interrupt', () => {
  const detect = creerDetectionInterruption();
  assert.equal(detect(true,true,60),false);
  for(let i=0;i<12;i++) assert.equal(detect(false,false,60),false);
  for(let i=0;i<20;i++) assert.equal(detect(true,false,60),false);
});
test('a prepared reply waits for the speaker and is discarded when the turn changes', async () => {
  const gate = deferred(); let current = true, finished = false;
  let p = {attendre:gate.promise};
  const ready = attendreSonTour(() => current, () => p).then(x => {finished=true;return x;});
  await Promise.resolve(); assert.equal(finished,false);
  current=false; p=null; gate.resolve();
  assert.equal(await ready,false);
});
test('resuming speech behind a second gate cannot release the answer', async () => {
  const a=deferred(), b=deferred(); let p={attendre:a.promise}, finished=false;
  const ready=attendreSonTour(()=>true,()=>p).then(x=>{finished=true;return x;});
  p={attendre:b.promise}; a.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(finished,false);
  p=null; b.resolve(); assert.equal(await ready,true);
});

// Execute the actual playback callback with delayed network/audio dependencies.
const page=fs.readFileSync('app/page.tsx','utf8');
const ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let arrow;
function find(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='speak') arrow=node.initializer.arguments[0].getText(ast);
  ts.forEachChild(node,find);
}
find(ast); assert(arrow);
const makeSpeak=new Function('env',`with(env){${compile('const speak = '+arrow+';')}return speak;}`);
function environment(fetchPromise) {
  let played=0, decoded=0, processed=0;
  const env={
    carteOuverteRef:{current:false},numeroDuTourRef:{current:1},porteRef:{current:null},
    personaRef:{current:'female'},codeRef:{current:'test'},bornesRef:{current:{}},langueRef:{current:'fr'},
    estWolof:()=>false,voixLocaleBiaDisponible:()=>true,noterRouteVoixBia:()=>{},essaiChatterboxActif:()=>true,
    routeVoixBia:()=>'/tts',voixChatterboxBia:()=> 'female',voixAudioPrompt:()=>'',
    fetch:()=>fetchPromise,attendreSonTour,noterAttente:()=>{},poserBorne:()=>{},finirAttente:async()=>{},
    window:{speechSynthesis:{cancel(){}}},couperSon:()=>{},tourRef:{current:null},
    ralentir:()=>{processed++;return {};},sansSilence:(_ctx,brut)=>brut,
    contexte:()=>({decodeAudioData:async()=>{decoded++;return {};},createBufferSource:()=>{played++;throw Error('unexpected playback');}}),
    octetsDeBase64:()=>new ArrayBuffer(1),segmentEnCoursRef:{current:false},setMode:()=>{},animationRef:{current:null},
    requestAnimationFrame:()=>1,pause:async()=>{},setFace:()=>{},setPanne:()=>{},stopMouth:()=>{},
    sourcesRef:{current:new Set()},ditsRef:{current:[]}
  };
  return {env,played:()=>played,decoded:()=>decoded,processed:()=>processed};
}
test('interrupting during TTS download discards the actual late audio response', async () => {
  const audio=deferred();const {env,played,decoded}=environment(audio.promise);
  const pending=makeSpeak(env)('Bonjour');
  env.numeroDuTourRef.current++;
  audio.resolve({ok:true,json:async()=>({audio:'AA==',parties:1})});
  await pending;assert.equal(played(),0);assert.equal(decoded(),0);
});
test('interrupting during audio decoding cannot schedule a single sound',async()=>{
  const decoded=deferred(),entered=deferred();
  const {env,played,processed}=environment(Promise.resolve({ok:true,json:async()=>({audio:'AA==',parties:1})}));
  env.contexte=()=>({decodeAudioData:()=>{entered.resolve();return decoded.promise;},createBufferSource:()=>{throw Error('stale source');},currentTime:0});
  const pending=makeSpeak(env)('Bonjour');await entered.promise;
  env.numeroDuTourRef.current++;env.tourRef.current=null;decoded.resolve({});
  await pending;assert.equal(played(),0);assert.equal(processed(),0);
});
