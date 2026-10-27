/* ── L'ÉPREUVE QUI MANQUAIT : « JE PARLE → MON TEXTE S'AFFICHE → ELLE RÉPOND »

   Lamine, le 25 octobre 2026, après deux déploiements muets :
   « pas un mot de réponse, et surtout AUCUNE transcription de ce que je dis
   n'apparaît dans la fenêtre […] reprends le mandat sur une branche, avec une
   épreuve de bout en bout « je parle → mon texte s'affiche → elle répond »
   qui doit être verte avant tout push. »

   POURQUOI LES AUTRES ÉPREUVES N'ONT RIEN VU. Elles lisent du code, ou elles
   extraient une fonction de app/page.tsx et l'appellent à la main. Le défaut
   du 25 octobre, lui, vivait dans l'ENCHAÎNEMENT : la patience des briques
   coupait son propre tour, et plus personne n'appelait askBia — donc ni sa
   phrase à lui, ni la réponse. Chaque pièce marchait. Le chemin, non.

   CE QUE CELLE-CI FAIT, ET C'EST LA DIFFÉRENCE :
     — elle lance la VRAIE application (next start) ;
     — elle ouvre la VRAIE page dans un vrai Chromium, en 375 px ;
     — elle branche un faux micro qui produit un signal de VOIX : un train
       d'harmoniques à 150 Hz, toutes dans la bande 200–3500 Hz, avec une
       enveloppe syllabique. C'est ce qu'il faut pour franchir les trois
       filtres de lib/micro.ts (volume, bande vocale, hauteur) — un simple
       bip ne passe pas, et c'est tant mieux ;
     — puis le silence, qui ferme le micro comme sa bouche le fait ;
     — et elle exige DEUX bulles dans le fil : la sienne, puis celle de BIA.

   ET ELLE LE FAIT SUR LES DEUX CHEMINS, parce que le défaut était sur le
   second :
     1. CHEMIN ORDINAIRE — rien n'est préparé, la réponse vient de /api/chat ;
     2. CHEMIN PRÉPARÉ — une brique arrive pendant qu'il parle, elle la dit,
        et /api/chat n'est jamais appelé. C'est là que vivent les leviers du
        mandat vitesse, et c'est là que BIA est devenue muette.

   CE QUI EST SIMULÉ, ET IL FAUT LE DIRE : les services distants. L'oreille,
   le cerveau et la voix répondent ici des réponses fixes. Cette épreuve ne
   dit donc RIEN sur la qualité d'une transcription ni sur la vitesse de
   Khalam Oreille. Elle dit que le CHEMIN tient : du son jusqu'aux deux
   bulles. C'est exactement le trou où le défaut est passé deux fois. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const {spawn}=require('child_process');

const COURTE='Salam BIA';                                  /* sous le seuil : aucune préparation */
const LONGUE='Salam BIA, naka suba si ci Dakar tey ci kër gi';  /* au-dessus de 35 signes */
const REPONSE_CHAT='Jamm rek. Suba si tangaay bu baax la ci Dakar.';
const REPONSE_BRIQUE='Jamm rek, Lamine. Dakar dafa tang tey.';
const PORT=Number(process.env.BIA_PORT||3987);
const BASE=process.env.BIA_EPREUVE_URL||`http://127.0.0.1:${PORT}`;

/* L'état que le serveur publie d'ordinaire. On le fixe pour que l'épreuve
   prenne le chemin de Khalam (oreille locale, voix RunPod) et non celui du
   navigateur : c'est le chemin de Lamine, et c'est celui qui s'est tu. */
const ETAT={version:'epreuve',ecoute:'local_wolof',voix:'runpod',tenue:'jaune',
 fin_de_parole:{silence_fin_parole_ms:1200}};
/* La patience des briques vient du serveur (BIA_PATIENCE_BRIQUE_MS), qui la
   publie toujours : on la donne donc dans TOUS les scénarios, comme en vrai.
   C'est elle qui ouvre le bloc du renoncement — sans elle, mes deux premiers
   scénarios ne le traversaient même pas et passaient au vert sur l'arbre
   fautif. Un filet qui n'est pas sous le trou ne sert à rien
   (AVANT-DE-DIRE-QUE-C-EST-BON.md). */
const etatDuCas=(cas)=>({...ETAT,
 /* Le silence qui ferme le micro, servi comme en vrai par /api/etat.
    BIA_EPREUVE_SILENCE=600 permet de MESURER ce que coûterait le réglage du
    mandat sans l'imposer : c'est sa décision, pas la mienne. */
 fin_de_parole:{silence_fin_parole_ms:Number(process.env.BIA_EPREUVE_SILENCE)||cas.silence||1200},
 briques_conversation:{patience_brique_ms:cas.patience??1200,
  premier_segment_apres_ms:cas.premierSegment??600,segment_ms:cas.segment??1500}});

/* Un quart de seconde de silence, en WAV 16 bits : c'est l'audio d'une brique.
   Son CONTENU n'a aucune importance ici — ce qui compte est qu'elle se décode,
   se joue, et que son texte arrive à l'écran. */
function wavSilence(ms=250,sr=16000){
 const n=Math.floor(sr*ms/1000),b=Buffer.alloc(44+n*2);
 b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVE',8);
 b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
 b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(n*2,40);
 return b.toString('base64');
}

/* Le faux micro. Il est long à écrire et c'est le cœur de l'épreuve : sans
   signal de voix crédible, le micro ne s'ouvre jamais et l'épreuve passerait
   au vert en ne prouvant rien. */
const fauxMicro=(cas)=>`
 window.__micros=0;
 /* La forme de sa parole : des tranches de son séparées par des silences.
    Une seule tranche pour une phrase ordinaire ; deux, séparées d'une
    hésitation, pour éprouver qu'elle ne le coupe pas quand il cherche un
    mot. Les durées sont en secondes. */
 const TRANCHES=${JSON.stringify(cas.tranches||[[0,2.2]])};
 const MICROS_MAX=${cas.unSeulMicro?1:2};
 const voix=(ctx,secondes)=>{
  const sr=ctx.sampleRate,buf=ctx.createBuffer(1,Math.floor(sr*secondes),sr),d=buf.getChannelData(0),f0=150;
  for(let i=0;i<d.length;i++){
   const t=i/sr;
   if(!TRANCHES.some(([a,b])=>t>=a&&t<b)){d[i]=0;continue;}   /* l'hésitation : du vrai silence */
   let v=0;
   for(let h=2;h<=20;h++)v+=Math.sin(2*Math.PI*f0*h*t)/h;    /* 300 à 3000 Hz */
   const syllabe=0.7+0.3*Math.sin(2*Math.PI*3.5*t);           /* des creux, jamais le silence */
   d[i]=0.9*syllabe*v/2.6;
  }
  return buf;
 };
 navigator.mediaDevices.getUserMedia=async()=>{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  try{await ctx.resume();}catch{}
  const dest=ctx.createMediaStreamDestination();
  /* Borné : la page rouvre le micro après chaque réponse, et une voix sans
     fin ferait tourner l'épreuve en boucle. */
  if(++window.__micros<=MICROS_MAX){
   const src=ctx.createBufferSource();src.buffer=voix(ctx,TRANCHES[TRANCHES.length-1][1]);
   const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1200;bp.Q.value=0.6;
   src.connect(bp);bp.connect(dest);src.start();
  }
  return dest.stream;
 };
 try{localStorage.setItem('bia-code','EPREUVE2026');}catch{}
`;

function attendreLeServeur(){
 return new Promise((bon,mal)=>{
  const fin=Date.now()+120000;
  const essai=()=>{
   fetch(BASE+'/',{cache:'no-store'}).then(r=>{if(r.status<500)return bon();throw Error('pas prêt');})
    .catch(()=>{if(Date.now()>fin)return mal(Error('le serveur local ne répond pas'));setTimeout(essai,500);});
  };essai();
 });
}

/** Un tour complet, du clic sur le micro aux deux bulles affichées. */
async function unTour(navigateur,cas){
 const contexte=await navigateur.newContext({viewport:{width:375,height:667},permissions:['microphone']});
 const page=await contexte.newPage();
 const erreurs=[],appels={};
 page.on('pageerror',e=>erreurs.push(String((e&&e.stack)||e&&e.message||e)));
 page.on('console',m=>{if(m.type()==='error')erreurs.push(m.text());});
 page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/')&&r.status()>=400)erreurs.push(`réponse ${r.status()} sur ${u.pathname}`);});
 await page.addInitScript(fauxMicro(cas));

 /* Les services distants, remplacés par des réponses fixes. Leur FORME
    compte : un objet vide à la place de `{prises:[]}` faisait jeter tout le
    tour par un `.find` sur undefined, et BIA répondait « jokkoo bi am na
    jafe-jafe ». En vrai, ces routes répondent cette forme, ou une erreur. */
 let briquesServies=0;
 await page.route('**/api/**',async route=>{
  const requete=route.request(),chemin=new URL(requete.url()).pathname;
  appels[chemin]=(appels[chemin]||0)+1;
  const json=(corps,statut=200)=>route.fulfill({status:statut,contentType:'application/json',body:JSON.stringify(corps)});
  if(chemin==='/api/acces')return json({ok:true,maitre:true});
  /* Le décor doit AUSSI répondre ici : c'est /api/codes qui pose `estMaitre`
     dans la page, et depuis le 27 octobre le bouton du clavier en dépend. */
  if(chemin==='/api/codes')return json({ok:true,maitre:true});
  if(chemin==='/api/etat')return json(etatDuCas(cas));
  if(chemin==='/api/rappels')return json({rappels:[]});
  if(chemin==='/api/prises-validees')return json({prises:[]});
  if(chemin==='/api/sons-courants')return json({sons:[],attendus:0});
  if(chemin==='/api/ecouter/morceau')return json({recu:0});
  if(chemin==='/api/anticipation/segment'||chemin==='/api/ecouter')
   return json({texte:cas.phrase,texte_brut:cas.phrase,suggestions_ecriture:[]});
  if(chemin==='/api/chat')return json({reply:REPONSE_CHAT,source:'epreuve'});
  if(chemin==='/api/anticipation/briques'){
   if(!cas.briques)return json({erreur:'epreuve'},503);
   /* UNE PRÉPARATION QUI TRAÎNE, ET QUI NE DONNE RIEN. C'est le cas réel du
      25 octobre : le modèle était lancé, aucune brique n'arrivait, et la
      patience coupait. On la fait traîner plus longtemps que la patience. */
   if(cas.briques==='lentes'){
    let c={};try{c=JSON.parse(requete.postData()||'{}');}catch{}
    if(c.action)return json({ok:true});
    await new Promise(r=>setTimeout(r,4000));
    /* `normal:true` n'est pas un détail : c'est CE QUE RÉPOND LE VRAI
       SERVEUR quand la demande finale ne produit aucune brique
       (lib/briques-reponse.ts, `resultat(s,undefined,final)`). Sans lui, mon
       bouchon décrivait une réponse que le serveur n'envoie jamais, et
       l'épreuve accusait la page d'un défaut qui venait de moi. */
    return json({preparation:{id:'ep1',termine:true,normal:true}});
   }
   let corps={};try{corps=JSON.parse(requete.postData()||'{}');}catch{}
   if(corps.action)return json({ok:true});
   /* La PREMIÈRE demande rend une brique prête à dire ; la finale clôt la
      préparation sans en ajouter (une brique hors numéro ferait jeter tout
      le flux, et c'est voulu côté client). */
   if(!briquesServies++)return json({preparation:{id:'ep1',continuer:false,
    brique:{numero:0,texte:REPONSE_BRIQUE,audio:wavSilence(),langue:'wo',voice:'female'}}});
   return json({preparation:{id:'ep1',termine:true}});
  }
  /* La voix refuse : l'écran ne doit PAS dépendre d'elle. Une BIA sans son
     affiche quand même sa phrase — sinon un pod éteint la rend muette ET
     invisible, ce qui est exactement ce que Lamine a vécu. */
  if(/^\/api\/(voix|chatterbox-test|piper-web)/.test(chemin))return json({erreur:'epreuve'},503);
  return json({});
 });

 await page.goto(BASE+'/?mode=khalam',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('button.microphone',{timeout:30000});

 /* AFFICHÉ VEUT DIRE VISIBLE À L'ŒIL. Une bulle présente dans le balisage
    mais couverte, ou laissée en visibility:hidden par un panneau replié, ne
    s'affiche pas : c'est la même panne pour celui qui regarde son téléphone.
    Quand elle est cachée, on NOMME l'ancêtre qui la cache — sinon on cherche
    à l'aveugle, ce qui a déjà coûté deux déploiements. */
 const cacheePar=(selecteur)=>page.evaluate((s)=>{
  const el=document.querySelector(s);if(!el)return 'absente';
  for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
   const st=getComputedStyle(n);
   if(st.display==='none'||st.visibility==='hidden'||Number(st.opacity)===0||n.hasAttribute('hidden'))
    return `${n.tagName.toLowerCase()}.${n.className||'(sans classe)'} → display:${st.display} visibility:${st.visibility} opacity:${st.opacity}`;
  }
  const r=el.getBoundingClientRect();
  return r.width&&r.height?'visible':`taille nulle (${r.width}×${r.height})`;
 },selecteur);
 const visible=async(selecteur)=>{
  const etat=await cacheePar(selecteur);
  assert.equal(etat,'visible',`${selecteur} est dans le balisage mais ne s'affiche pas : ${etat}`);
  return (await page.textContent(selecteur)||'').trim();
 };

 const depart=Date.now();
 await page.click('button.microphone');

 /* 1. MON TEXTE ARRIVE DANS LE FIL. C'est la moitié qui manquait le
       25 octobre : « AUCUNE transcription de ce que je dis n'apparaît ». */
 await page.waitForSelector('.ligne-moi .bulle-moi',{state:'attached',timeout:90000});
 const tTexte=Date.now()-depart;

 /* 2. ELLE RÉPOND. */
 await page.waitForSelector('.ligne-bia .bulle-bia',{state:'attached',timeout:90000});
 const tReponse=Date.now()-depart;

 /* 3. ET LA FENÊTRE LES MONTRE VRAIMENT. Le panneau de la conversation
       couvre le micro : on l'ouvre APRÈS le tour, comme Lamine quand il
       relit. Une bulle présente mais invisible est la même panne. */
 await page.click('button.clavier-ouvrir');
 await page.waitForSelector('.clavier[aria-hidden="false"]',{timeout:10000});
 const dit=await visible('.ligne-moi .bulle-moi');
 const attenduDit=cas.attenduDit||'Salam';
 assert.ok(dit.includes(attenduDit),`la bulle de Lamine ne contient pas sa phrase : ${JSON.stringify(dit)}`);
 const repondu=await visible('.ligne-bia .bulle-bia');
 assert.ok(repondu.includes(cas.attendu),
  `la réponse attendue (${JSON.stringify(cas.attendu)}) n'est pas affichée : ${JSON.stringify(repondu)}`);

 /* 4. ET ELLE A VRAIMENT ÉCOUTÉ. Sans ces lignes, un faux micro muet
       laisserait l'épreuve au vert en ne prouvant rien. */
 const entendu=(appels['/api/anticipation/segment']||0)+(appels['/api/ecouter']||0);
 assert.ok(entendu>0,'aucun son n’a été envoyé à l’oreille : le faux micro n’a pas parlé');
 if(cas.briques==='lentes'){
  assert.ok((appels['/api/anticipation/briques']||0)>0,'la préparation n’a jamais été demandée');
  /* La préparation n'a rien donné : le chemin ordinaire DOIT reprendre.
     Sans cet appel, BIA reste sur « réfléchit » — la panne du 25 octobre. */
  assert.ok((appels['/api/chat']||0)>0,'la préparation n’a rien donné et le cerveau n’a pas été appelé : BIA reste muette');
 }else if(cas.briques){
  assert.ok((appels['/api/anticipation/briques']||0)>0,'la préparation n’a jamais été demandée');
  assert.ok(!appels['/api/chat'],'elle a dit la brique ET rappelé le cerveau : le double paiement est de retour');
 }else{
  assert.ok((appels['/api/chat']||0)>0,'le cerveau n’a jamais été appelé');
 }

 /* 5. ET ELLE NE L'A PAS COUPÉ. Sa règle absolue du 24 octobre : « elle ne
       doit JAMAIS répondre tant que je parle ou que je fais une pause pour
       réfléchir ». Un tour coupé en deux se voit ici : deux bulles à lui,
       deux appels au cerveau. On laisse passer le temps de la fin de sa
       phrase avant de compter, sinon on compterait trop tôt. */
 if(cas.toursAttendus){
  /* LA RÈGLE, ÉCRITE EN MILLISECONDES. Sa dernière syllabe tombe à la fin de
     la dernière tranche. Si quelque chose s'affiche AVANT, elle a répondu
     pendant qu'il parlait ou pendant sa pause — c'est la coupure, et elle ne
     se voit pas en comptant les bulles : mesuré à 600 ms de silence exigé,
     elle répondait à 2 352 ms sur une phrase qui finit à 3 400, et le reste
     de sa phrase partait dans les mots rattrapés. Un seul compteur de bulles
     laissait donc passer la coupure. */
  const m0={tTexte};
  const finDeSaParole=Math.round(cas.tranches[cas.tranches.length-1][1]*1000);
  assert.ok(m0.tTexte>=finDeSaParole,
   `elle a répondu à ${m0.tTexte} ms alors qu'il parlait encore jusqu'à ${finDeSaParole} ms : elle l'a coupé`);
  await page.waitForTimeout(3000);
  const tours=await page.locator('.ligne-moi .bulle-moi').count();
  assert.equal(tours,cas.toursAttendus,
   `il a parlé une fois, avec une hésitation : ${tours} tour(s) au lieu de ${cas.toursAttendus} — elle l'a coupé`);
  assert.equal(appels['/api/chat']||0,cas.toursAttendus,
   `${appels['/api/chat']||0} appel(s) au cerveau pour une seule phrase`);
 }

 const graves=erreurs.filter(t=>!/503|epreuve|Failed to load resource|AudioContext|NotAllowedError|onnxruntime|cpuid/i.test(t));
 assert.equal(graves.length,0,'erreurs de page : '+graves.slice(0,3).join(' | '));

 await contexte.close();
 return {tTexte,tReponse,appels,segments:appels['/api/anticipation/segment']||0};
}

(async()=>{
 let serveur=null,navigateur=null;
 try{
  if(!process.env.BIA_EPREUVE_URL){
   serveur=spawn('node_modules/.bin/next',['start','-p',String(PORT)],
    {stdio:['ignore','pipe','pipe'],env:{...process.env}});
   serveur.stdout.on('data',()=>{});serveur.stderr.on('data',()=>{});
   await attendreLeServeur();
  }
  navigateur=await chromium.launch({headless:true,
   args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream']});

  for(const cas of [
   {nom:'chemin ordinaire — rien de préparé',phrase:COURTE,briques:false,attendu:REPONSE_CHAT},
   {nom:'chemin préparé — une brique pendant qu’il parle',phrase:LONGUE,briques:true,attendu:REPONSE_BRIQUE},
   {nom:'préparation lente — la patience coupe et le chemin ordinaire reprend',
    phrase:LONGUE,briques:'lentes',patience:1200,attendu:REPONSE_CHAT},
   /* ── SA RÈGLE ABSOLUE, ÉPROUVÉE ────────────────────────────────────────
      Lamine, le 24 octobre : « elle ne doit JAMAIS répondre tant que je
      parle ou que je fais une pause pour réfléchir ». Il parle 1,2 s, il
      cherche son mot pendant UNE SECONDE, il reprend 1,2 s. Avec son
      réglage (1 200 ms de silence exigé), ça doit rester UN seul tour.
      Un seul micro ici : toute seconde bulle ne peut venir que d'une
      coupure, jamais de la phrase suivante. */
   /* ── « JE DIS OUI TOUT COURT, RIEN N'EST ENTENDU » ─────────────────────

      Lamine, le 26 octobre. Un quart de seconde de voix, et rien ne partait
      à l'oreille : l'anti-scintillement mangeait la première trame, la durée
      n'était qu'un écart entre trames, et le plancher valait 350 ms — il
      fallait donc près d'une demi-seconde de son pour qu'un mot existe.

      C'EST LE SEUL FILET QUI PASSE PAR LE VRAI MICRO : vraie AudioContext,
      vrai analyseur, vraie `partVocale`, vraie `hauteurDeVoix`. L'épreuve
      d'unité, elle, simule la boucle — elle ne peut pas prouver la page.
      Le son commence à 600 ms pour que la boucle de veille soit lancée
      quand il parle, comme en vrai quand il appuie puis parle. */
   {nom:'« waaw » tout court — un quart de seconde doit être entendu',
    phrase:'Waaw',attenduDit:'Waaw',briques:false,attendu:REPONSE_CHAT,
    tranches:[[0.6,0.85]],unSeulMicro:true},
   {nom:'une hésitation d’une seconde au milieu — elle ne coupe pas',
    phrase:LONGUE,briques:false,attendu:REPONSE_CHAT,silence:1200,
    tranches:[[0,1.2],[2.2,3.4]],unSeulMicro:true,toursAttendus:1},
  ]){
   const m=await unTour(navigateur,cas);
   console.log(`✔ ${cas.nom} : je parle → mon texte s’affiche (${m.tTexte} ms) → elle répond (${m.tReponse} ms), ${m.segments} segment(s) d’écoute`);
  }
  console.log('✔ bout en bout : les deux chemins affichent sa phrase et répondent (services simulés)');
 }catch(e){
  console.error('✘ épreuve de bout en bout : '+(e&&e.message||e));
  process.exitCode=1;
 }finally{
  if(navigateur)await navigateur.close().catch(()=>{});
  if(serveur)serveur.kill('SIGTERM');
 }
})();
