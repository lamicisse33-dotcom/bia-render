import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function load(path,imports={}){const m={exports:{}};new Function('require','module','exports',compile(fs.readFileSync(path,'utf8')))(id=>{if(id==='./rapidite-core')return load('lib/rapidite-core.ts');assert(id in imports,id);return imports[id];},m,m.exports);return m.exports;}
const tick=()=>new Promise(r=>setTimeout(r,0));

for(const rate of [44100,48000])for(const name of ['capture','reprise'])test(`${name} worklet emits 100 ms PCM at ${rate} Hz without losing or duplicating samples`,()=>{
 let K;const messages=[];
 vm.runInNewContext(fs.readFileSync(`public/anticipation/${name}.js`,'utf8'),{AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>messages.push(m)};}},sampleRate:rate,Float32Array,registerProcessor:(_n,k)=>K=k});
 const node=new K();
 for(let i=0;i<rate;i+=128)node.process([[new Float32Array(Math.min(128,rate-i)).fill(.25)]]);
 node.port.onmessage({data:name==='capture'?'fin':'apercu'});
 const clips=messages.filter(x=>x.pcm).map(x=>x.pcm);
 assert.equal(clips.length,10);assert(clips.every(x=>x.length===1600));
 assert.equal(clips.reduce((n,x)=>n+x.length,0),16000);assert(clips.every(x=>x.every(v=>v===.25)));
});

const micro=load('lib/micro.ts');
const page=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let body;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='ecouter')body=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,walk);}walk(ast);assert(body);
const make=new Function('env',`with(env){${compile('const run='+body)};return run;}`);
function capture(){
 let now=10000,voix=false,step,stops=0,slice=0;
 const ref=current=>({current}),analyse={frequencyBinCount:256,getByteTimeDomainData:a=>a.fill(voix?150:128),getByteFrequencyData:a=>a.fill(voix?30:0)};
 /* Khalam Rapide (la conversation rapide) est le défaut depuis le 23 octobre
    2026, et `ecouter` sort par là en premier. Ces épreuves-ci mesurent le
    chemin Khalam — l'enregistreur, la frontière des 400 ms, l'exclusivité du
    micro : elles le demandent donc explicitement. Le chemin rapide a ses
    propres épreuves dans tests/gemini-live.test.mjs et
    tests/interface-maitre-live-browser.cjs. */
 const env={utiliserLiveMaitre:()=>false,
  /* L'essai « briques sur la transcription finale » est un opt-in piloté par
     le serveur : ces épreuves-ci mesurent le cycle du micro, pas les briques.
     Son propre comportement est éprouvé dans tests/eligibilite-anticipation. */
  briquesFinalesPermises:()=>false,
  /* Levier 1 du 24 octobre 2026 : la page relaie les deux seuils publiés
     par le serveur. Ces épreuves mesurent le cycle du micro ; elles s'en
     tiennent aux valeurs d'avant, éprouvées ailleurs. */
  reglagesAnticipation:()=>({premier_segment_apres_ms:1500,seuil_signes_anticipation:35}),
 Date:{now:()=>now},Math,Symbol,Uint8Array,conversationRef:ref(true),modeRef:ref('ready'),busyRef:ref(false),ecouterRef:ref(null),ouvertureEcouteRef:ref(null),enregistreurRef:ref(null),nouvelEnregistrement:()=>1,estCetEnregistrement:()=>true,
  micro:async()=>({flux:{},analyse,analysePeriodique:{fftSize:1024,getByteTimeDomainData:a=>a.fill(128)},ctxMicro:{state:'running',sampleRate:48000}}),
  ouvrirEnregistreur:()=>({state:'inactive',start(ms){slice=ms;this.state='recording';},stop(){stops++;this.state='inactive';}}),
  creerFiltreDeclenchement:()=>a=>a,suivreLeBruit:()=>({seuil:()=>8,voir:()=>voix}),seuilRef:ref(8),setInterval:f=>{step=f;return 1;},clearInterval(){},
  ...micro,hauteurDeVoix:()=>150,partVocale:()=>.8,HAUTEUR_MINIMALE:80,focusLocuteurRef:ref(null),coupesTropTotRef:ref(0),dernierSignalParoleRef:ref({quand:0,delai:400}),
  bornesRef:ref({}),tourVide:()=>({}),poserBorne(){},exclusionAnticipation:()=>'',personaRef:ref('bia'),essaiChatterboxActif:()=>true,
  localStorage:{getItem:()=>null},apprend:ref(false),correctionDevoirRef:ref(null),chantierMalDit:ref(false),attendLeNomRef:ref(false),motsRattrapesRef:ref(null),
  codeRef:ref('test'),historyRef:ref([]),resumeRef:ref(''),voixChatterboxBia:()=> 'female',fenetreDuFil:x=>x,brancherAnticipation:async()=>null,
  fetch:async()=>({ok:true}),setMode(){},setFace(){},setEntendParler(){},
 };
 return {run:make(env),at(t,speech){now=t;voix=speech;step();},stops:()=>stops,slice:()=>slice};
}
/* ── 24 OCTOBRE 2026 : LA FRONTIÈRE PASSE DE 400 À 1 200 MS ───────────────
   Lamine revient sur ses 400 ms du 20 octobre : « elle ne doit JAMAIS
   répondre tant que je parle ou que je fais une pause pour réfléchir ». Ces
   deux épreuves gardaient le nombre d'avant ; elles gardent maintenant la
   RÈGLE, et le nombre vient de lib/fin-de-parole.ts. Si quelqu'un redescend
   sous la seconde, la première assertion le dit. */
const SILENCE=micro.SILENCE_QUI_FERME;
test('l’enregistreur démarre à 100 ms et ne ferme qu’après le silence exigé, pas une ronde avant',async()=>{
 /* 25 octobre : le seuil de base est 600 ms, la protection fait le reste. */
 assert.equal(SILENCE,600,'le silence de base du mandat');
 const c=capture();await c.run();assert.equal(c.slice(),100);
 for(let t=10000;t<=10300;t+=60)c.at(t,true);
 c.at(10300+SILENCE-1,false);assert.equal(c.stops(),0);
 c.at(10300+SILENCE,false);assert.equal(c.stops(),1);
});
/* 25 octobre, mandat vitesse : le seuil de base passe à 600 ms, et ce qui
   protège les hésitants est la PROTECTION qui grandit avec les coupures déjà
   subies. Une personne jamais coupée ferme donc à 600 ms ; celle qu'on a
   coupée deux fois ferme à 1 200. C'est ça, l'arbitrage du mandat. */
test('qui a déjà été coupé reçoit un silence plus long',async()=>{
 const c=capture();await c.run();c.at(10000,true);c.at(10300,true);
 c.at(10300+SILENCE-1,false);assert.equal(c.stops(),0);
 c.at(10300+SILENCE,false);assert.equal(c.stops(),1);
 /* Et la règle elle-même : deux coupures subies valent 600 ms de plus. */
 assert.equal(micro.silenceQuiSuffit(2500,0),SILENCE);
 assert.equal(micro.silenceQuiSuffit(2500,2),SILENCE+600);
});
test('two minutes of 100 ms uploads remain ordered, complete and bounded',async()=>{
 delete globalThis.biaDepotsParole;
 const p=load('lib/morceaux-de-parole.ts'),key='test-100ms-two-minutes';
 for(let i=0;i<1201;i++)assert.equal(p.poserMorceau(key,i,new Uint8Array([i%251]),'audio/webm','audio.webm').ok,true);
 assert.equal(p.annoncerLaFin(key,1201).ok,true);
 const complete=p.recoudre(key);assert(complete.ok);
 const audio=new Uint8Array(await complete.son.blob.arrayBuffer());
 assert.equal(audio.length,1201);assert(audio.every((v,i)=>v===i%251));
 assert.equal(p.poserMorceau(key,1600,new Uint8Array(1),'audio/webm','audio.webm').ok,false);
});

const fileApi=load('lib/briques-file.ts');
const question='Je souhaite une réponse complète avec deux morceaux audio.';
const line=d=>new TextEncoder().encode(JSON.stringify(d)+'\n');
function streamClient(){
 let controller,requests=0;
 const stream=new ReadableStream({start(c){controller=c;}});
 const previous=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(init.body);assert.equal(body.flux,true);requests++;
  if(requests===1)return new Response(stream,{headers:{'content-type':'application/x-ndjson'}});
  return Response.json({preparation:{id:'session',termine:true}});
 };
 const api=load('lib/briques-client.ts',{'./briques-file':fileApi});
 const p=api.creerProducteurBriques({code:'test',tour:'test-stream-400',history:[],resume:'',voice:'female',persona:'bia',actuel:()=>true});
 p.progresser(question);
 return {p,controller,restore(){globalThis.fetch=previous;},requests:()=>requests};
}
const header={type:'brique',brique:{numero:0,texte:'Voici ma réponse complète.',voice:'female',langue:'fr'}};
const chunk=(i,hash='same')=>({type:'morceau',audio:Buffer.from('audio'+i).toString('base64'),partie:i,parties:2,empreinte:hash,voice:'female'});
const options=jouer=>({signal:new AbortController().signal,jouer,taire(){},attente(){},mesure(){}});
test('first audio is consumed while later synthesis and the HTTP response are still pending',async()=>{
 const x=streamClient(),heard=[];
 try{
  x.controller.enqueue(line(header));x.controller.enqueue(line(chunk(0)));await tick();
  x.p.arreterEcoute();const reading=x.p.commencer(options(async b=>{for await(const audio of b.flux)heard.push(Buffer.from(audio,'base64').toString());return true;}));
  assert(reading);await tick();assert.deepEqual(heard,['audio0']);
  x.controller.enqueue(line(chunk(1)));x.controller.enqueue(line({type:'resultat',preparation:{id:'session',termine:false,continuer:false}}));x.controller.close();
  await tick();await x.p.terminer(question);await reading.fin;
  assert.deepEqual(heard,['audio0','audio1']);assert.equal(x.requests(),2);
 }finally{x.restore();}
});
test('a broken streamed utterance raises an error without replaying it through ordinary fallback',async()=>{
 const x=streamClient(),heard=[];
 try{
  x.controller.enqueue(line(header));x.controller.enqueue(line(chunk(0)));await tick();
  x.p.arreterEcoute();const reading=x.p.commencer(options(async b=>{for await(const audio of b.flux)heard.push(audio);return true;}));
  await tick();assert.equal(heard.length,1);
  x.controller.enqueue(line(chunk(1,'wrong-fingerprint')));x.controller.close();
  await assert.rejects(reading.fin,/incomplet/);assert.equal(x.requests(),1);
 }finally{x.restore();}
});
test('cancelling a streamed utterance releases a reader waiting for its next clip',async()=>{
 const flux=fileApi.creerFluxBrique(),f=fileApi.creerFileBriques(),abort=new AbortController();
 f.ajouter({...header.brique,audio:'',flux});flux.pousser('first');
 const done=f.lire({...options(async b=>{for await(const _ of b.flux){}return true;}),signal:abort.signal});
 await tick();abort.abort();f.annuler();await assert.rejects(done,/annulée/);
});
test('server validates voice, order and fingerprint before forwarding each early clip; EOS is still required',async()=>{
 const {lireAudioBrique}=load('lib/briques-audio.ts'),forwarded=[];let controller;
 const stream=new ReadableStream({start(c){controller=c;}});
 const done=lireAudioBrique(new Response(stream),'female',new AbortController().signal,d=>forwarded.push(d.partie));
 controller.enqueue(line(chunk(0)));await tick();assert.deepEqual(forwarded,[0]);
 controller.enqueue(line(chunk(1)));controller.close();await assert.rejects(done,/incomplet/);
});
