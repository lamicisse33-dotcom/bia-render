import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';
function load(path,deps={},globals={}){
 const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',...Object.keys(globals),js)(n=>{assert(n in deps,n);return deps[n];},m,m.exports,...Object.values(globals));return m.exports;
}
function fixture(){
 const env={BIA_CODE_MAITRE:'TEST-MASTER-ONLY',BIA_SECRET:'test-signing-key',BIA_MAX_QUESTIONS:'2'};
 const nombre={nombreDeLEnvironnement:(v,f)=>Number(v)||f};
 const codes=load('lib/codes.ts',{'node:crypto':crypto,'./nombre-env':nombre},{process:{env}});
 /* ── LA LIAISON AU NUMÉRO, REMPLACÉE PAR UN BOUCHON ───────────────
    Elle a ses propres épreuves (tests/acces-numero.test.mjs), avec son
    rangement en mémoire. Ici on éprouve LA PORTE : que le code soit encore
    jugé comme avant, et qu'un numéro manquant la ferme. */
 const lien={verifierNumero:async(_code,numero,maitre)=>numero&&String(numero).trim()
   ?{ok:true,lie:maitre?'maitre':'deja'}
   :{ok:false,message:'Saisis ton numéro de téléphone.'},
  noterEssaiRate:()=>{},tropDEssais:()=>false,resumeAccesNumero:()=>({}),
  /* La liaison à la création : son contenu est éprouvé dans
     acces-numero.test.mjs. Ici on éprouve que la ROUTE l'exige et refuse
     de rendre un code quand elle échoue. */
  creerLien:async(_c,n)=>String(n||'').trim()?{ok:true}:{ok:false,message:'Saisis ton numéro de téléphone.'},
  delierCode:async()=>true,relierCode:async()=>({ok:true})};
 const numeros={empreinteCode:c=>'empreinte-'+c,empreinteNumero:n=>'empreinte-'+n,
  normaliserNumero:n=>{const t=String(n||'').trim();if(!t)return null;
   const c=t.replace(/\D/g,'');if(!c||/[a-z]/i.test(t.replace(/^\+/,'')))return null;
   if(t.startsWith('+'))return '+'+c;
   if(c.length===9&&c.startsWith('7'))return '+221'+c;
   return null;},
  MESSAGES_NUMERO:{absent:'Saisis ton numéro de téléphone.',invalide:'Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.',autre:'Ce code est déjà utilisé avec un autre numéro.',essais:'Trop d’essais. Attends quelques minutes avant de réessayer.'}};
 const deps={'next/server':{NextResponse:Response},'@/lib/codes':codes,'@/lib/nombre-env':nombre,
  '@/lib/acces-lien':lien,'@/lib/acces-numero':numeros};
 return {codes,acces:load('app/api/acces/route.ts',deps),gestion:load('app/api/codes/route.ts',deps,{process:{env}})};
}
/* Le numéro voyage par un en-tête, JAMAIS par l'adresse. */
const req=(code,numero='+221771234567')=>new Request('https://app.khalam.app/api/acces',
 {headers:{...(code?{'x-bia-code':code}:{}),...(numero?{'x-bia-numero':numero}:{})}});
test('entry rejects missing, invalid, expired and exhausted codes; access checks do not consume questions',async()=>{
 const {codes,acces,gestion}=fixture();
 for(const code of [null,'WRONG',codes.creerCode(-2)])assert.equal((await acces.GET(req(code))).status,401);
 assert.deepEqual(await (await acces.GET(req('TEST-MASTER-ONLY'))).json(),{ok:true,maitre:true,lie:'maitre'});
 /* ── LES DEUX SONT OBLIGATOIRES ───────────────────────────────
    Lamine, 28 octobre 2026. Un bon code SANS numéro n'ouvre plus rien, et
    c'est le SERVEUR qui le dit — pas seulement la page. */
 const sansNumero=await acces.GET(req('TEST-MASTER-ONLY',''));
 assert.equal(sansNumero.status,401);
 assert.equal((await sansNumero.json()).erreur,'Saisis ton numéro de téléphone.');
 const code=codes.creerCode(1);
 for(let i=0;i<5;i++){
  const r=await acces.GET(req(code));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{ok:true,maitre:false,lie:'deja'});
  assert.equal((await gestion.GET(req(code))).status,401);
 }
 assert(codes.verifierCode(code).ok);assert(codes.verifierCode(code).ok);
 assert(codes.verifierCode(code,false).ok,'last allowed answer must still be able to play its audio');
 assert.equal((await acces.GET(req(code))).status,401);
});
test('only master can create usable codes; foreign origins are rejected',async()=>{
 const {codes,acces,gestion}=fixture();
 const post=(code,origin='https://app.khalam.app')=>gestion.POST(new Request('https://app.khalam.app/api/codes',{method:'POST',headers:{'content-type':'application/json','x-bia-code':code,origin},body:JSON.stringify({heures:24,nom:'Awa',numero:'+221771234567'})}));
 assert.equal((await post(codes.creerCode(1))).status,403);
 assert.equal((await post('TEST-MASTER-ONLY','https://foreign.test')).status,403);
 const r=await post('TEST-MASTER-ONLY');assert.equal(r.status,200);const d=await r.json();assert.equal(d.adresse,'app.khalam.app');assert.equal(d.nom,'Awa');
 assert.deepEqual(await (await acces.GET(req(d.code))).json(),{ok:true,maitre:false,lie:'deja'});
});
/* ── LE GÉNÉRATEUR EXIGE LE NUMÉRO ────────────────────────────

   Lamine, 28 octobre 2026 au soir. Un code ne doit plus naître anonyme. */
test('créer un code sans numéro est refusé, et aucun code n’est rendu',async()=>{
 const {gestion}=fixture();
 const envoyer=corps=>gestion.POST(new Request('https://app.khalam.app/api/codes',
  {method:'POST',headers:{'content-type':'application/json','x-bia-code':'TEST-MASTER-ONLY'},body:JSON.stringify(corps)}));
 for(const [corps,attendu] of [[{heures:24},'Saisis ton numéro de téléphone.'],
                               [{heures:24,numero:'   '},'Saisis ton numéro de téléphone.'],
                               [{heures:24,numero:'bonjour'},'Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.']]){
  const r=await envoyer(corps);
  assert.equal(r.status,400,JSON.stringify(corps));
  const d=await r.json();
  assert.equal(d.erreur,attendu);
  assert.equal(d.code,undefined,'aucun code ne doit sortir d’une demande refusée');
 }
 /* Avec un numéro, le code sort — et la route dit sur quel numéro il marche. */
 const bon=await envoyer({heures:24,numero:'77 123 45 67'});
 assert.equal(bon.status,200);
 const d=await bon.json();
 assert.equal(d.numero,'+221771234567');
 assert.equal(typeof d.code,'string');
 assert.equal(d.code.length,16,'un code neuf fait seize signes : '+d.code);
});

/* ── LES DEUX LONGUEURS ────────────────────────────────────

   « Les codes déjà distribués gardent leur fonctionnement : personne n'est
   bloqué. » Un code de dix signes doit donc encore ouvrir la porte, et un
   code de seize aussi. */
test('un ancien code de dix signes reste valable, et le neuf en fait seize',async()=>{
 const {codes}=fixture();
 const neuf=codes.creerCode(1);
 assert.equal(neuf.length,16);
 assert.equal(codes.LONGUEUR_CODE,16);
 assert.equal(codes.verifierCode(neuf,false).ok,true,'le code neuf doit être accepté');
 /* L'ancien format : quatre signes d'expiration, deux de hasard, quatre de
    signature. On le REFABRIQUE ici, à la main, avec le même secret que la
    fixture — c'est la seule façon de prouver qu'un code distribué avant ce
    soir ouvre encore la porte. */
 const ALPHABET='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
 const ORIGINE=Date.UTC(2026,0,1)/60000;
 const encode=(v,n)=>{let o='';for(let i=0;i<n;i++){o=ALPHABET[v%32]+o;v=Math.floor(v/32);}return o;};
 const sig=(corps,n)=>[...crypto.createHmac('sha256','test-signing-key').update(corps).digest().subarray(0,n)].map(o=>ALPHABET[o%32]).join('');
 const corps=encode(Math.floor(Date.now()/60000)-ORIGINE+60,4)+'AB';
 const ancien=corps+sig(corps,4);
 assert.equal(ancien.length,10);
 assert.equal(codes.verifierCode(ancien,false).ok,true,'un code de dix signes doit encore marcher : '+ancien);
 /* Et un ancien code dont la signature est fausse reste refusé. */
 assert.equal(codes.verifierCode(corps+'2222',false).ok,false);
 /* Et une longueur inconnue est refusée, quoi qu'il arrive. */
 for(const faux of [neuf.slice(0,12),neuf+'AB','ABC'])
  assert.equal(codes.verifierCode(faux,false).ok,false,'accepté à tort : '+faux);
});

test('client requires positive server validation before accepting access',async()=>{
 for(const response of [Response.json({ok:false,erreur:'Code refusé'},{status:401}),Response.json({maitre:true}),Response.json({ok:true},{status:500})]){
  const api=load('lib/acces-client.ts',{}, {fetch:async()=>response});await assert.rejects(api.verifierAcces('test'));
 }
 const api=load('lib/acces-client.ts',{}, {fetch:async(url,init)=>{assert.equal(url,'/api/acces');assert.equal(init.headers['x-bia-code'],'test');return Response.json({ok:true,maitre:false});}});
 assert.deepEqual(await api.verifierAcces('test'),{maitre:false});
});

test('chat rejects absent and invalid codes before cached replies or streaming',async()=>{
 const source=fs.readFileSync('app/api/chat/route.ts','utf8');
 const ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);
 const post=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='POST');
 const js=ts.transpileModule(post.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const {codes}=fixture();let answers=0;
 const api=new Function('verifierCode','NextResponse','DIFFUSER_LE_MODELE','repondre','garderCeTour',js+'; return POST;')(codes.verifierCode,Response,true,async()=>{answers++;return {corps:{reply:'Bonjour'}};},()=>{});
 for(const diffuse of [false,true])for(const code of ['', 'INVALID']){
  const r=await api(new Request('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':code},body:JSON.stringify({message:'Bonjour',diffuse})}));
  assert.equal(r.status,401);assert.equal((await r.json()).source,'code');
 }
 assert.equal(answers,0);
});

test('remembered user and master access is restored only after server validation, without another submission',async()=>{
 for(const maitre of [false,true]){
  let calls=0,removed=0;const saved='SAVEDCODE';
  const api=load('lib/acces-client.ts',{}, {fetch:async(url,init)=>{calls++;assert.equal(url,'/api/acces');assert.equal(init.headers['x-bia-code'],saved);
   /* Et le numéro part AVEC lui, par un en-tête. */
   assert.equal(init.headers['x-bia-numero'],'+221771234567');return Response.json({ok:true,maitre});}});
  const storage={getItem:key=>key==='bia-numero'?'+221771234567':saved,removeItem:()=>removed++};
  assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'valide',code:saved,maitre});
  assert.equal(calls,1);assert.equal(removed,0);
 }
});

/* ── CEUX QUI UTILISAIENT DÉJÀ BIA ────────────────────────────

   Leur code est mémorisé ; leur numéro ne l'est pas, il n'existait pas avant
   le 28 octobre 2026. Lamine : « explique-moi comment ils passent sans être
   bloqués ». On ne les met pas dehors, on ne leur redemande pas leur code :
   on demande leur numéro, et on n'appelle même pas le serveur pour ça. */
test('un code mémorisé sans numéro demande le numéro, et garde le code',async()=>{
 let appels=0;
 const api=load('lib/acces-client.ts',{},{fetch:async()=>{appels++;throw Error('aucun appel ne doit partir');}});
 let efface=0;
 const storage={getItem:key=>key==='bia-numero'?'':'ANCIENCODE',removeItem:()=>efface++};
 assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'numero_manquant',code:'ANCIENCODE'});
 assert.equal(appels,0,'on ne dérange pas le serveur pour une question qu’on sait déjà');
 assert.equal(efface,0,'son code ne doit surtout pas être effacé');
});

test('missing or unreadable storage asks for a code without making an access request',async()=>{
 let calls=0;const api=load('lib/acces-client.ts',{}, {fetch:async()=>{calls++;throw Error('unexpected')}});
 for(const storage of [{getItem:()=>null,removeItem(){}},{getItem:()=>{throw Error('blocked')},removeItem(){}}])assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'absent'});
 assert.equal(calls,0);
});

test('expired, invalid and exhausted saved codes reopen entry and remove the rejected code',async()=>{
 for(const message of ['Ce code a expiré.','Code refusé. Vérifie ton code.','Ce code a atteint sa limite d’utilisation.']){
  let stored='REJECTED';const api=load('lib/acces-client.ts',{}, {fetch:async()=>Response.json({ok:false,erreur:message},{status:401})});
  const storage={getItem:key=>key==='bia-numero'?'+221771234567':stored,removeItem:()=>stored=null};
  assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'refuse',message});assert.equal(stored,null);
 }
});

test('network failures and server outages preserve the saved code, and retry restores access',async()=>{
 for(const failure of [()=>{throw Error('offline')},()=>Response.json({erreur:'temporary'},{status:503}),()=>Response.json({maitre:true}),()=>new Response('invalid json')]){
  let retry=false,removed=0;const api=load('lib/acces-client.ts',{}, {fetch:async()=>retry?Response.json({ok:true,maitre:true}):failure()});
  const storage={getItem:key=>key==='bia-numero'?'+221771234567':'SAVEDMASTER',removeItem:()=>removed++};
  assert.equal((await api.restaurerAccesMemorise(storage)).etat,'indisponible');assert.equal(removed,0);
  retry=true;assert.deepEqual(await api.restaurerAccesMemorise(storage),{etat:'valide',code:'SAVEDMASTER',maitre:true});
 }
});

test('a late rejection cannot erase a different code saved in the meantime',async()=>{
 let finish;let stored='OLD';const pending=new Promise(r=>finish=r);
 const api=load('lib/acces-client.ts',{}, {fetch:()=>pending});
 const restore=api.restaurerAccesMemorise({getItem:key=>key==='bia-numero'?'+221771234567':stored,removeItem:()=>stored=null});
 stored='NEW';finish(Response.json({ok:false,erreur:'Expiré'},{status:401}));
 assert.equal((await restore).etat,'refuse');assert.equal(stored,'NEW');
});

test('the page restores master and user state together and ignores stale restoration completions',async()=>{
 const source=fs.readFileSync('app/page.tsx','utf8');const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let init;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='retablirAcces')init=n.initializer.arguments[0];ts.forEachChild(n,visit)}visit(ast);assert(init);
 const js=ts.transpileModule('const restore='+init.getText(ast)+';', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const maitre of [false,true]){
  const events=[],ref={current:0},master={current:false};let resolve;
  const dependencies={restaurationAccesRef:ref,estMaitreRef:master,restaurerAccesMemorise:()=>new Promise(r=>resolve=r),setRestaurationAcces:x=>events.push(['status',x]),setEstMaitre:x=>events.push(['master',x]),setCode:x=>events.push(['code',x]),setCodeErreur:x=>events.push(['error',x])};
  const restore=new Function(...Object.keys(dependencies),js+'return restore;')(...Object.values(dependencies));
  const pending=restore();assert.deepEqual(events,[['status','verification']]);resolve({etat:'valide',code:'SAVED',maitre});await pending;
  assert.equal(master.current,maitre);assert(events.some(x=>x[0]==='code'&&x[1]==='SAVED'));assert.deepEqual(events.at(-1),['status','terminee']);
  events.length=0;const stale=restore();ref.current++;resolve({etat:'valide',code:'STALE',maitre});await stale;assert.deepEqual(events,[['status','verification']]);
 }
});
