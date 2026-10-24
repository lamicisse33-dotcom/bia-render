import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
test('microphone resampling preserves the stream across worklet boundaries at 44.1 and 48 kHz',()=>{
 for(const rate of [44100,48000]){
  const module={exports:{}};new Function('module','exports',compile('lib/gemini-live-client.ts')+'\nmodule.exports.worklet=WORKLET;')(module,module.exports);
  function run(block){
   let Capture;const chunks=[];
   class Processor{port={postMessage:v=>chunks.push(new Uint8Array(v.raw))};}
   vm.runInNewContext(module.exports.worklet,{AudioWorkletProcessor:Processor,sampleRate:rate,registerProcessor:(_,c)=>Capture=c,ArrayBuffer,DataView,Math});
   const capture=new Capture(),audio=new Float32Array(rate+1024);
   for(let i=0;i<audio.length;i++)audio[i]=0.4*Math.sin(2*Math.PI*440*i/rate);
   for(let i=0;i<audio.length;i+=block)capture.process([[audio.subarray(i,i+block)]]);
   return Buffer.concat(chunks.map(v=>Buffer.from(v)));
  }
  const small=run(128),large=run(4096);assert.equal(small.length,large.length);assert(small.length>=32000);assert.equal(small.length%1280,0);
  for(let i=0;i<small.length;i+=2)assert(Math.abs(small.readInt16LE(i)-large.readInt16LE(i))<=1);
 }
});
test('session authentication precedes Google and returns only a constrained ephemeral token',async()=>{
 const module={exports:{}},oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldGoogle=process.env.GOOGLE_API_KEY;
 const dependencies={
  '@/lib/gemini-live-diagnostic':{resumeGeminiLive:()=>({statut:'non_lance'})},
  'next/server':{NextResponse:{json:(d,o)=>Response.json(d,o)}},
  '@/lib/codes':{verifierCode:code=>code==='MASTER'?{ok:true,maitre:true}:code==='VISITOR'?{ok:true,maitre:false}:{ok:false}},
  '@/lib/instructions-apprentissage':{contexteInstructions:async()=>'Consignes apprises'},
  '@/lib/gemini-live-prompt':{BIA_LIVE_CONSIGNES_BASE:'Identité de Bia',BIA_LIVE_LANGUES:'FR_WO_UNIQUEMENT'},
  /* La mémoire part désormais DÈS l'ouverture de session (24 octobre 2026) :
     le décor rend des sources réelles mais inertes. */
  '@/lib/souvenirs':{derniersSouvenirs:async()=>[{qui:'personne',texte:'Un échange gardé.',quand:'2026-10-23T00:00:00Z'}],consigneDesSouvenirs:()=>'SOUVENIRS\n- Un échange gardé.'},
  '@/lib/lexique':{motsCorriges:async()=>[{faux:'ancien',juste:'corrigé',fois:1}],toutes:async()=>[{source:'comment vas-tu',corrigee:'Maa ngi fi rekk.'}]},
  '@/lib/devoirs-apprentissage':{contexteDevoirsComplet:async()=>({texte:'LEÇONS CONSERVÉES PAR LE MAÎTRE\nDevoir appris ligne une',devoirs:3,signes:60})},
  '@/lib/khalam':{savoirKhalam:async()=>'KHALAM apprend le wolof à Dakar.'},
  '@/lib/produits':{savoirProduits:async()=>'DD SKIN — soins de la peau.'},
  '@/lib/vitrine':{catalogue:async()=>'Une vitrine.'},
  '@/lib/fiches-connaissances':{fichesPourConversation:async()=>'Une fiche de connaissance.'},
  '@/lib/memoire-reglages':{liveHistoriqueTours:()=>40,liveCompressionJetons:()=>60000,liveCompressionCible:()=>30000,
   liveDevoirsSignes:()=>40000,liveFichesSignes:()=>12000,liveLexiqueCorrections:()=>300},
  '@/lib/lectures-supabase':{ouvrirLecture:()=>'releve',noterLectureSource(){},fermerLecture(){}}
 };
 const calls=[];globalThis.fetch=async(url,init)=>{calls.push({url,init});return Response.json({name:'auth_tokens/ephemeral-test'});};
 process.env.GEMINI_API_KEY='FAKE-SERVER-KEY';delete process.env.GOOGLE_API_KEY;
 try{
  new Function('module','exports','require',compile('app/api/gemini-live/session/route.ts'))(module,module.exports,n=>dependencies[n]||require(n));
  const request=code=>({headers:new Headers({'x-bia-code':code,origin:'https://app.khalam.app'}),nextUrl:{origin:'https://app.khalam.app'}});
  assert.equal((await module.exports.POST(request('INVALID'))).status,401);assert.equal(calls.length,0);
  const foreign=request('MASTER');foreign.headers.set('origin','https://evil.example');
  assert.equal((await module.exports.POST(foreign)).status,403);assert.equal(calls.length,0);
  /* Khalam Rapide est la connexion par défaut de tout le monde depuis le 23
     octobre 2026. Un visiteur obtient donc sa session — mais jamais les
     consignes pédagogiques privées du maître. Le lexique corrigé, lui, est la
     façon de parler de BIA et part pour tous. */
  assert.equal((await module.exports.POST(request('VISITOR'))).status,200);
  const consigneVisiteur=JSON.parse(calls[0].init.body).bidiGenerateContentSetup.systemInstruction.parts[0].text;
  assert(!consigneVisiteur.includes('Consignes apprises'));
  assert(consigneVisiteur.includes('corrigé'));
  assert(consigneVisiteur.includes('Identité de Bia'));
  calls.length=0;
  const proxy=request('MASTER');proxy.nextUrl.origin='http://localhost:10000';
  assert.equal((await module.exports.POST(proxy)).status,200);
  const response=await module.exports.POST(request('MASTER'));assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.token,'auth_tokens/ephemeral-test');assert(!JSON.stringify(data).includes('FAKE-SERVER-KEY'));
  const body=JSON.parse(calls[0].init.body);assert.equal(body.uses,1);assert.equal(calls[0].init.headers['x-goog-api-key'],'FAKE-SERVER-KEY');
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.includes('Consignes apprises'));
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.includes('corrigé'));
  /* ── CE QUI MANQUAIT À L'OUVERTURE, ET QUI EXPLIQUE « PLUS DE MÉMOIRE » ──
     Avant le 24 octobre 2026, souvenirs, corrections exactes et devoirs
     n'arrivaient QUE si le modèle appelait l'outil de lui-même. */
  const consigne=body.bidiGenerateContentSetup.systemInstruction.parts[0].text;
  assert(consigne.includes('Un échange gardé.'),'les souvenirs partent dès l’ouverture');
  assert(consigne.includes('Maa ngi fi rekk.'),'les formulations validées aussi');
  assert(consigne.includes('Devoir appris ligne une'),'et les devoirs appris');
  /* ── L'ACCÈS TOTAL, 24 octobre 2026 ──────────────────────────────────────
     « Je lui ai parlé de DD SKIN, elle dit qu'elle ne le connaît pas ; je lui
     ai parlé de KHALAM, elle ne connaît pas grand-chose. » Ce moteur ne
     chargeait NI KHALAM, NI les produits, NI la vitrine, NI les fiches — et
     demandait les devoirs avec une question vide, qui les filtrait tous. */
  assert(consigne.includes('KHALAM apprend le wolof'),'ce qu’elle sait de KHALAM doit partir');
  assert(consigne.includes('DD SKIN'),'la fiche produits doit partir');
  assert(consigne.includes('Une fiche de connaissance.'),'les fiches de connaissances aussi');
  assert(consigne.includes('Une vitrine.'),'et ce qu’elle peut montrer');
  /* La fiche produits ne part JAMAIS sans sa barrière : AGENTS.md est net,
     une assistante qui vend quelque chose n’est plus une assistante. */
  const avantProduits=consigne.slice(0,consigne.indexOf('DD SKIN'));
  assert(/N.EST PAS TON SUJET/.test(avantProduits),'la règle doit précéder la marque');
  assert(/que si on t.interroge sur les produits/i.test(avantProduits),'et dire quand elle a le droit d’en parler');
  /* Et on publie ce qui est VRAIMENT parti, pour ne pas l’espérer. */
  assert.equal(data.connaissances.devoirs_nombre,3);
  assert(data.connaissances.khalam>0&&data.connaissances.produits>0&&data.connaissances.fiches>0,JSON.stringify(data.connaissances));
  assert(data.consigne_signes>consigne.length/2,'la taille de la consigne est publiée');
  assert.equal(body.bidiGenerateContentSetup.contextWindowCompression.triggerTokens,'60000','Google compressait dès 18 000 jetons : compresser, c’est résumer');
  /* ── LA CARTE ÉTAIT INATTEIGNABLE (24 octobre 2026) ──────────────────────
     Khalam Rapide n'avait QU'UN outil, et sa consigne interdisait les
     commandes d'écran. Depuis qu'il est le moteur par défaut, plus personne
     ne pouvait obtenir une carte sans basculer à la main. */
  const outils=body.bidiGenerateContentSetup.tools[0].functionDeclarations.map(f=>f.name);
  assert(outils.includes('montrer_le_chemin'),'l’outil carte doit être déclaré : '+outils.join(', '));
  assert(outils.includes('chercher_connaissances'),'et la mémoire reste');
  assert(consigne.includes('montrer_le_chemin'),'la consigne doit dire par où passer pour une carte');
  assert(/SAUF la carte/.test(consigne),'l’interdiction des gestes d’écran garde son exception');
  assert.equal(body.bidiGenerateContentSetup.contextWindowCompression.slidingWindow.targetTokens,'30000');
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.startsWith('FR_WO_UNIQUEMENT'));
  assert(body.bidiGenerateContentSetup.systemInstruction.parts[0].text.endsWith('FR_WO_UNIQUEMENT'));assert.deepEqual(body.bidiGenerateContentSetup.generationConfig.responseModalities,['AUDIO']);
  assert(Date.parse(body.expireTime)-Date.now()<=600000);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldGoogle===undefined)delete process.env.GOOGLE_API_KEY;else process.env.GOOGLE_API_KEY=oldGoogle;}
});

test('Live code normalization matches normal Bia before creating HTTP headers',()=>{
 const module={exports:{}};
 new Function('module','exports',compile('lib/gemini-live-client.ts'))(module,module.exports);
 const client=new module.exports.BiaGeminiLive('  ma\u00a0st-er\u200b  ',{});
 assert.equal(client.code,'MASTER');
 assert.equal(new Headers({'x-bia-code':client.code}).get('x-bia-code'),'MASTER');
});

test('les deux moteurs partagent UN SEUL socle, pas deux copies',()=>{
 /* ── IL Y AVAIT DEUX TEXTES, TENUS ÉGAUX À LA MAIN ──────────────────────

    Cette épreuve comparait `BIA_LIVE_SYSTEM` au littéral `system` de
    app/api/chat/route.ts : deux copies, et l'épreuve servait de scotch. Une
    copie tenue par une épreuve reste une copie — corriger le caractère d'un
    côté laissait l'autre inchangé.

    Lamine, le 24 octobre 2026 : « Une seule source de consigne partagée par
    les deux moteurs (pas de BIA_LIVE_SYSTEM séparé qui dérive). » On ne
    compare donc plus deux textes : on vérifie qu'il n'y en a QU'UN. */
 const route=fs.readFileSync('app/api/chat/route.ts','utf8');
 assert(/const system = SOCLE_BIA;/.test(route),'Khalam doit importer le socle, pas le redéclarer');
 assert(!/const system = `/.test(route),'aucun socle en dur dans la route');
 const live=fs.readFileSync('lib/gemini-live-prompt.ts','utf8');
 assert(/BIA_LIVE_SYSTEM = SOCLE_BIA;/.test(live),'Khalam Rapide doit importer le même socle');
 assert(!/BIA_LIVE_SYSTEM = `/.test(live),'aucune copie du socle');

 /* Et le caractère demandé y est, à un seul endroit. */
 const caractere=fs.readFileSync('lib/conversation-groq.ts','utf8');
 assert(/export const CARACTERE_BIA/.test(caractere),'un seul bloc de caractère');
 assert(/MEILLEURE AMIE/.test(caractere),'« meilleure amie »');
 assert(/accompagne tout le monde/.test(caractere),'« une compagnie qui accompagne tout le monde »');
 assert(/sans te vexer, sans te justifier/.test(caractere),'« accepte la correction sans se vexer »');
 const socle=fs.readFileSync('lib/socle-bia.ts','utf8');
 assert(/CARACTERE_BIA/.test(socle),'le socle porte le caractère partagé');
 assert(!/^TON CARACTÈRE$/m.test(socle),'et ne le redit pas une seconde fois');
});

test('Latin alphabet guard preserves Wolof and French and refuses foreign scripts',()=>{
 const module={exports:{}};new Function('module','exports',compile('lib/gemini-live-client.ts'))(module,module.exports);
 for(const text of ['Bonjour papa !','Ñëwal, gëmmeen tuwuma.','Ŋ, ñ, é, ë, à, ç, œ, 15 000 F CFA 😊','Bia et Google'])assert(module.exports.alphabetLiveAutorise(text),text);
 for(const text of ['مرحبا','Привет','你好','नमस्ते','Bonjour مرحبا'])assert.equal(module.exports.alphabetLiveAutorise(text),false,text);
 // Latin words can belong to many languages; do not pretend this is language detection.
 assert(module.exports.alphabetLiveAutorise('Google'));
});

test('a foreign-script transcript stops queued playback before the same packet can play',async()=>{
 const module={exports:{}};new Function('module','exports',compile('lib/gemini-live-client.ts'))(module,module.exports);
 const old={fetch:globalThis.fetch,WebSocket:globalThis.WebSocket,localStorage:globalThis.localStorage};
 let socket,played=0,stopped=0;const errors=[];
 class Socket{
  static OPEN=1;readyState=1;
  constructor(){socket=this;queueMicrotask(()=>this.onopen());}
  send(raw){if(JSON.parse(raw).setup)queueMicrotask(()=>this.onmessage({data:JSON.stringify({setupComplete:{}})}));}
  close(){}
 }
 try{
  globalThis.WebSocket=Socket;globalThis.localStorage={setItem(){}};
  globalThis.fetch=async()=>Response.json({token:'auth_tokens/synthetic',setup:{model:'synthetic'}});
  const client=new module.exports.BiaGeminiLive('TEST',{etat(){},transcription(){},parle(){},latence(){},erreur:e=>errors.push(e)});
  client.stoppe=false;client.jouer=()=>played++;client.arreter=()=>stopped++;
  await client.connecter();
  await socket.onmessage({data:JSON.stringify({serverContent:{outputTranscription:{text:'مرحبا'},modelTurn:{parts:[{inlineData:{data:'AAAA',mimeType:'audio/pcm;rate=24000'}}]}}})});
  assert.equal(played,0);assert.equal(stopped,1);assert.equal(errors.length,1);assert(errors[0].includes('français et wolof uniquement'));
 }finally{globalThis.fetch=old.fetch;globalThis.WebSocket=old.WebSocket;if(old.localStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=old.localStorage;}
});

test('Live reads all lesson and lexicon pages, exact corrections and master instructions without writes',async()=>{
 const module={exports:{}};let reads=0;
 const deps={
  'next/server':{NextResponse:{json:(d,o)=>Response.json(d,o)}},
  '@/lib/codes':{verifierCode:code=>({ok:code==='MASTER'||code==='VISITOR',maitre:code==='MASTER'})},
  '@/lib/devoirs-apprentissage':{contexteDevoirs:async()=>{reads++;return 'Répliques du devoir';},devoirsALire:async()=>{reads++;return {devoirs:[{id:'lesson',texte:'Texte exact du devoir'.repeat(500),valide:true,langue:'wo'},{id:'brouillon',texte:'Devoir en cours de relecture',valide:false,langue:'wo'}],incomplets:1};}},
  '@/lib/dialogue-devoirs':{contexteMaitrises:async()=>{reads++;return 'Lexique partagé';}},
  '@/lib/instructions-apprentissage':{contexteInstructions:async()=>{reads++;return 'Consigne exacte du maître';}},
  '@/lib/outil-connaissances-etat':{noterOutilConnaissances(){}},
  '@/lib/lexique':{lexiqueConfig:{actif:true},lectureLexique:()=>({motif:''}),toutes:async()=>{reads++;return Array.from({length:12},(_,i)=>({source:'source'+i,corrigee:'corrigée'+i}));},correctionExacte:async()=>({source:'question',corrigee:'Réponse validée'}),exemplesPour:async()=>[{source:'question',corrigee:'Réponse validée'}],motsCorriges:async()=>[{faux:'ancien',juste:'corrigé'}]}
 };
 new Function('module','exports','require',compile('app/api/gemini-live/connaissances/route.ts'))(module,module.exports,n=>deps[n]);
 const request=(body,code='MASTER')=>({headers:new Headers({'x-bia-code':code}),json:async()=>body});
 assert.equal((await module.exports.POST(request({question:'enfants'},'INVALID'))).status,401);assert.equal(reads,0);
 /* ── LA FRONTIÈRE, MAINTENANT QUE TOUT LE MONDE PASSE PAR LÀ ────────────
    Khalam Rapide est ouverte à tous depuis le 23 octobre 2026. Un visiteur
    lit les devoirs validés et le lexique — c'est ce qu'enseigne BIA — mais
    jamais les consignes pédagogiques de Lamine, ses maîtrises, ni un devoir
    encore en relecture. */
 const visiteur=await (await module.exports.POST(request({question:'enfants'},'VISITOR'))).json();
 assert.equal(visiteur.contexte.instructions,'');
 assert.equal(visiteur.contexte.maitrises,'');
 assert.equal(visiteur.acces.instructions_chargees,false);
 assert.equal(visiteur.contexte.correction_exacte.corrigee,'Réponse validée');
 const catalogueVisiteur=await (await module.exports.POST(request({action:'lister_devoirs'},'VISITOR'))).json();
 assert.equal(catalogueVisiteur.total,1);
 assert.equal((await module.exports.POST(request({action:'lire_devoir',devoir_id:'brouillon'},'VISITOR'))).status,404);
 assert.equal((await module.exports.POST(request({action:'lire_devoir',devoir_id:'brouillon'}))).status,200);
 const recherche=await (await module.exports.POST(request({question:'enfants'}))).json();
 assert.equal(recherche.contexte.correction_exacte.corrigee,'Réponse validée');assert.equal(recherche.contexte.instructions,'Consigne exacte du maître');assert.equal(recherche.acces.lexique_entrees,12);
 const catalogue=await (await module.exports.POST(request({action:'lister_devoirs'}))).json();assert.equal(catalogue.total,2);
 const lecture=await (await module.exports.POST(request({action:'lire_devoir',devoir_id:'lesson',offset:8000}))).json();assert.equal(lecture.devoir.texte,'Texte exact du devoir'.repeat(500).slice(8000));
 const page1=await (await module.exports.POST(request({action:'lister_lexique'}))).json(),page2=await (await module.exports.POST(request({action:'lister_lexique',offset:10}))).json();
 assert.equal(page1.lexique.length,10);assert.equal(page1.suivant,10);assert.equal(page2.lexique.length,2);assert.equal(page2.suivant,null);
 assert.equal((await module.exports.POST(request({action:'lire_devoir',devoir_id:'absent'}))).status,404);
 assert.equal((await module.exports.POST(request({action:'supprimer'}))).status,400);
 assert.equal((await module.exports.POST(request({action:'lister_lexique',offset:-1}))).status,400);
});

/* ── UNE MESURE PAR TOUR, ET PAS UNE PAR MORCEAU ──────────────────────────

   Lu sur /api/etat le 23 octobre 2026 à 22:28:26 : neuf « mesures » en
   393 ms, de 31 à 2 324 ms, pour UNE seule réponse — et une médiane juste
   par hasard. `premiere` était ré-armé par n'importe quelle trame au-dessus
   du seuil de bruit, donc par la voix de BIA que le micro entend par le
   haut-parleur ; chaque morceau suivant mesurait alors la profondeur de la
   file de lecture, pas une attente.

   Cette épreuve rejoue la séquence exacte : une parole, une réponse en trois
   morceaux avec de l'écho entre les morceaux, puis un second tour. On exige
   DEUX mesures numérotées, pas neuf. Les deux horloges — celle du navigateur
   et celle de l'AudioContext — avancent ensemble, comme dans la vraie vie :
   c'est ce qui rend l'avance de planification mesurable. */
test('one measurement per turn: playback echo cannot re-arm it, and turns are numbered',()=>{
 const module={exports:{}};
 new Function('module','exports',compile('lib/gemini-live-client.ts'))(module,module.exports);
 const mesures=[];
 const client=new module.exports.BiaGeminiLive('TEST',{etat(){},transcription(){},parle(){},latence:(ms,tour)=>mesures.push({ms,...tour}),erreur(){}});

 let maintenant=0,horloge=0;
 const avancer=ms=>{maintenant+=ms;horloge+=ms/1000;};
 const encours=[];
 const ctx={get currentTime(){return horloge;},
  createBuffer:(_c,n,rate)=>({duration:n/rate,getChannelData:()=>new Float32Array(n)}),
  createBufferSource:()=>{const n={buffer:null,onended:null,connect(){},disconnect(){},start(){}};encours.push(n);return n;},
  destination:{},close:async()=>{}};
 client.output=ctx;client.stoppe=false;client.ready=true;client.send=()=>{};
 const perf=performance.now;performance.now=()=>maintenant;
 const morceau=Buffer.alloc(2400).toString('base64');   // 1200 échantillons à 24 kHz = 50 ms
 /* Le même gestionnaire que le worklet réel : seule la décision d'armement
    est rejouée, et c'est exactement la ligne qui était fautive. */
 const trame=rms=>{
  if(client.stoppe||client.muted||!client.ready)return;
  if(rms>0.018){client.finParole=maintenant;if(!client.elleParle()){client.finParoleMesure=client.finParole;client.mesurePrete=true;}}
 };
 const parole=()=>trame(0.4),silence=()=>trame(0.001);
 const finirLesSons=()=>{for(const n of encours.splice(0)) n.onended?.();};
 const jouer=()=>client.jouer(morceau,'audio/pcm;rate=24000');
 try{
  /* AUCUNE parole : rien ne s'arme, rien ne se mesure. Avant ce correctif,
     `premiere` valait vrai dès la construction et le tout premier morceau
     après la connexion partait comme une fausse mesure. */
  jouer();
  assert.equal(mesures.length,0,'un morceau sans parole préalable ne se mesure pas');
  finirLesSons();avancer(400);

  /* TOUR 1 : il parle, elle répond en trois morceaux, et l'écho de sa voix
     revient dans le micro entre les morceaux. */
  parole();avancer(100);silence();avancer(900);
  jouer();
  assert.equal(mesures.length,1,'le premier morceau de sa réponse mesure');
  assert.equal(mesures[0].ms,1015,'1000 ms d’attente + 15 ms d’avance de planification');
  assert.equal(mesures[0].tour,1);
  for(let i=0;i<2;i++){avancer(40);parole();jouer();}
  assert.equal(mesures.length,1,'l’écho pendant la lecture ne ré-arme pas la mesure');

  /* La lecture finit ; les 300 ms de marge couvrent la queue d'écho. */
  finirLesSons();avancer(100);parole();
  assert.equal(client.mesurePrete,false,'la queue d’écho ne ré-arme pas non plus');

  /* TOUR 2 : il reparle vraiment, après la marge. */
  avancer(400);parole();avancer(50);silence();avancer(750);
  jouer();
  assert.equal(mesures.length,2,'un nouveau tour se mesure');
  assert.equal(mesures[1].tour,2);
  assert.equal(mesures[1].ms,815);
  assert.equal(mesures[0].session,mesures[1].session);
  assert(/^[a-z0-9]{4,40}$/.test(mesures[0].session),mesures[0].session);

  /* Et un arrêt ferme la mesure en cours. */
  parole();client.arreter();
  assert.equal(client.mesurePrete,false,'arrêter ferme la mesure en cours');
 }finally{performance.now=perf;}
});
