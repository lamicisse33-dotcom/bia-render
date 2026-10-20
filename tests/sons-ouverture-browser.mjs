// Actual greeting/player/wait callbacks with the owner's MP3s in Chromium.
// No account, physical microphone, user-network latency or human listening.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ts from 'typescript';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const page=fs.readFileSync('app/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),callbacks={};
function visit(n){if(ts.isVariableDeclaration(n)&&['speak','jouerEtAnimer','soufflerEnAttendant','taireLeSouffle'].includes(n.name.getText(ast)))callbacks[n.name.getText(ast)]=compile('const run='+n.initializer.arguments[0].getText(ast));ts.forEachChild(n,visit);}visit(ast);
const modules={};for(const name of ['repertoire-textes','base-textes','services-textes','normaliser','langue','salutations-dialogue','sons-courants-core','salutation-locale','identite-core','identite-locale','accuse-demande'])modules[name]=compile(fs.readFileSync('lib/'+name+'.ts','utf8'));
const lot=JSON.parse(fs.readFileSync('public/reponses-courtes-khalam-v2.json','utf8'));
for(const e of lot.sons){assert.equal(e.son.moteur,'khalam-voice');assert.equal(e.son.checkpoint_sha256,e.son.langue==='fr'?'b1237586127ce98e7800a68e49938eb5092846862aabcb6e17b2fda7889a6c75':'8320e6788427029dcaf7aeea8e54124f172dd7cdd12d7fcf658cf616c0c21e9f');}
const identity=lot.sons.find(x=>x.son.cle==='ton-nom'&&x.son.langue==='fr');assert(identity);
const greeting=lot.sons.find(x=>x.son.cle==='salut'&&x.son.langue==='fr');assert(greeting);
const manifest=JSON.parse(fs.readFileSync('public/sons/reflexion-khalam-20261020.json','utf8'));
const takes=manifest.prises.map(p=>{const b=fs.readFileSync('public'+p.fichier);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),p.sha256);return {path:p.fichier,expected_seconds:p.duree_decodee_ms/1000,audio:b.toString('base64')};});
const server=http.createServer((_req,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><title>Sons enregistrés BIA</title>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
 const result=await page.evaluate(async({callbacks,modules,greeting,identity,takes})=>{
  const loaded={};function module(name){if(loaded[name])return loaded[name];const m={exports:{}};new Function('require','module','exports',modules[name])(id=>module(id.replace('./','')),m,m.exports);return loaded[name]=m.exports;}
  const {salutationLocale}=module('salutation-locale');
  const {identiteLocale}=module('identite-locale');
  const {accuseDemandePertinent}=module('accuse-demande');
  const ref=current=>({current}),bytes=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer;
  const ctx=new AudioContext({sampleRate:48000});await ctx.resume();
  let phase='salutation',start=performance.now();const starts=[],stops=[],measures=[];
  const wrapped={get currentTime(){return ctx.currentTime;},destination:ctx.destination,decodeAudioData:b=>ctx.decodeAudioData(b),createBufferSource:()=>{
   const source=ctx.createBufferSource(),realStart=source.start.bind(source),realStop=source.stop.bind(source);
   source.start=(...args)=>{starts.push({phase,ms:performance.now()-start,duration:source.buffer.duration});return realStart(...args);};
   source.stop=(...args)=>{stops.push(phase);return realStop(...args);};return source;
  }};
  const cache=new Map([[greeting.son.adresse,bytes(greeting.audio)],[identity.son.adresse,bytes(identity.audio)],...takes.map(t=>[t.path,bytes(t.audio)])]);
  const env={window,Math,Date,performance,carteOuverteRef:ref(false),numeroDuTourRef:ref(1),personaRef:ref('rara'),codeRef:ref('fixture'),langueRef:ref('fr'),bornesRef:ref({}),sourceRef:ref(null),sourcesRef:ref(new Set()),animationRef:ref(null),segmentEnCoursRef:ref(false),sonDelleRef:ref(0),fluxVoixRef:ref(new Set()),tourRef:ref(null),ditsRef:ref([]),
   estMaitreRef:ref(false),audioAnticipeRef:ref(null),prisesValidees:{api:{lire(){throw Error('unexpected private lookup');}}},
   cacheSons:ref(cache),sonsCourantsRef:ref([greeting.son]),choixVoixBia:()=> 'female',voixChatterboxBia:()=> 'female',essaiChatterboxActif:()=>true,piperWebActif:()=>false,estWolof:()=>false,
   autoriserLaVoix:async actuel=>actuel(),reveillerLeSon:async()=>wrapped,contexte:()=>wrapped,sonPourTexte:()=>undefined,
   setMode(){},setFace(){},stopMouth(){},envoyerLeTour(){},poserBorne(){},couperSon(){},enveloppeDe:()=>({valeurs:[1],pic:1,pas:.05}),formeBouche:()=> 'douce',
   fetch:async(url,options)=>{if(url!=='/api/mesure')throw Error('unexpected network '+url);measures.push(JSON.parse(options.body));return {ok:true};},
   attenteRef:ref(null),stopAttenteRef:ref(false),souffleDattenteRef:ref(null),dernierSouffle:ref(null),souffleDe:()=>({fichiers:takes.map(t=>t.path)}),fichierDe:s=>s.fichiers[0],
  };
  const callback=name=>new Function('env',`with(env){${callbacks[name]};return run;}`)(env);
  env.jouerEtAnimer=callback('jouerEtAnimer');env.taireLeSouffle=callback('taireLeSouffle');
  env.finirAttente=async()=>{env.attenteRef.current=null;env.stopAttenteRef.current=true;env.taireLeSouffle();};
  let first=0;const options={apprend:false,correction:false,persona:'rara',ouverture:true};
  const reply=salutationLocale('Bonjour',[greeting.son],options);if(!reply)throw Error('opening unavailable with default portrait');
  await callback('speak')(reply.reply,undefined,'réponse',false,{langue:'fr',debutSalutation:start,sonCourant:reply.son_courant,premierSon:()=>first++});
  if(first!==1||starts.length!==1)throw Error('greeting did not play exactly once');
  if(salutationLocale('Bonjour',[greeting.son],{...options,ouverture:false})!==null)throw Error('opening repeated during conversation');
  phase='identite';start=performance.now();
  const nom=identiteLocale("Comment tu t'appelles ?",[identity.son],options);if(!nom||accuseDemandePertinent("Comment tu t'appelles ?"))throw Error('identity must bypass waiting words');
  await callback('speak')(nom.reply,undefined,'réponse',false,{langue:'fr',debutIdentite:start,sonCourant:nom.son_courant,premierSon:()=>first++});
  if(first!==2||starts.filter(s=>s.phase==='identite').length!==1)throw Error('identity did not play exactly once');
  for(const take of takes){
   phase='mmm';start=performance.now();const token={};env.attenteRef.current=token;env.stopAttenteRef.current=false;env.fichierDe=()=>take.path;
   await callback('soufflerEnAttendant')(token);
   env.taireLeSouffle();
  }
  const out={identity_start_ms:starts.find(s=>s.phase==='identite').ms,identity_reply:nom.reply,greeting_start_ms:starts[0].ms,greeting_duration:starts[0].duration,mmm:starts.filter(s=>s.phase==='mmm'),stopped:stops.includes('mmm'),opening_repeated:false,network_model_calls:0,measurements:measures.map(m=>({type:m.type,ouverture:m.ouverture,phase:m.phase}))};
  await ctx.close();return out;
 },{callbacks,modules,greeting,identity,takes});
 assert(result.greeting_start_ms<300,JSON.stringify(result));assert(result.identity_start_ms<300,JSON.stringify(result));assert.equal(result.mmm.length,takes.length);for(let i=0;i<takes.length;i++){assert(result.mmm[i].ms>=780&&result.mmm[i].ms<2000);assert(Math.abs(result.mmm[i].duration-takes[i].expected_seconds)<.03);}assert(result.stopped);
 console.log('BIA_SONS_OUVERTURE_BROWSER_VERIFIED '+JSON.stringify({synthetic:true,physical_microphone:false,human_listening:false,...result}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
