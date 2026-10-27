/* ── LA DISCUSSION ÉCRITE : TOUT LE MONDE, ET AUCUN SON ────────────────────

   Lamine, le 27 octobre 2026 : « j'écris, BIA répond par écrit. AUCUN son :
   sa voix ne parle jamais dans cette fenêtre (aujourd'hui un message tapé la
   fait parler : corrige ça). »

   RÈGLE 1 de AVANT-DE-DIRE-QUE-C-EST-BON.md : ça se mesure, ça ne se promet
   pas. « Aucun son » n'est donc pas vérifié en relisant le code : on compte
   les appels au haut-parleur — AudioContext, speechSynthesis.speak,
   <audio>.play — et les routes de la voix. Le compte doit être ZÉRO entre
   l'ouverture de la fenêtre et sa fermeture.

   Et on vérifie les deux comptes : un code ORDINAIRE voit le bouton (c'est
   la demande), et le code MAÎTRE le voit aussi SANS perdre sa fenêtre
   d'apprentissage (c'est l'interdit). */
const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const PORT=3119;
const server=spawn(process.execPath,['./node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(PORT)],{stdio:['ignore','pipe','pipe']});
let browser;

const APPRENTISSAGE='Apprentissage / lecture continue';

(async()=>{try{
 for(let n=0;n<40;n++){try{await fetch('http://127.0.0.1:'+PORT+'/api/acces');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});

 /* Le téléphone de Lamine : 375 px de large. */
 const ouvrir=async(maitre)=>{
  const contexte=await browser.newContext({viewport:{width:375,height:812}});
  const page=await contexte.newPage();
  const erreurs=[];page.on('pageerror',e=>{erreurs.push(e.message);console.error('pageerror:',e.message);});
  const routes=[];page.on('request',r=>{const c=new URL(r.url()).pathname;if(c.startsWith('/api/'))routes.push(c);});
  const demandes=[];
  await page.route('**/api/**',async route=>{
   const chemin=new URL(route.request().url()).pathname;
   let data={};
   if(chemin==='/api/acces'||chemin==='/api/codes')data={ok:true,maitre};
   if(chemin==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
   if(chemin==='/api/voix-gardees')data={ok:true};
   if(chemin==='/api/chat'){
    const corps=JSON.parse(route.request().postData()||'{}');
    demandes.push(corps);
    /* Elle répond dans la langue du message : c'est la MÊME route que la
       conversation vocale, on ne fait que la décorer ici. */
    data={reply:/waaw|nanga|def|yow|bëgg/i.test(String(corps.message||''))?'Maa ngi fi rekk, papa. Yow nag ?':'Je vais bien, papa. Et toi ?'};
   }
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.addInitScript(()=>{
   localStorage.setItem('bia-code','SYNTHETICMASTER');
   /* Khalam, pas la connexion rapide : aucune session à ouvrir, et le
      compteur de sons reste lisible. */
   localStorage.setItem('bia-mode-conversation','khalam');
   /* ── LE COMPTEUR DE HAUT-PARLEUR ────────────────────────────────────
      Toutes les portes du son, comptées à la source. */
   window.__sons=0;
   const AC=window.AudioContext;
   if(AC)window.AudioContext=function(...a){window.__sons++;return new AC(...a);};
   const jouer=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(...a){window.__sons++;return jouer.apply(this,a);};
   try{
    const dire=window.speechSynthesis&&window.speechSynthesis.speak;
    if(dire)window.speechSynthesis.speak=function(...a){window.__sons++;return dire.apply(window.speechSynthesis,a);};
   }catch{}
  });
  await page.goto('http://127.0.0.1:'+PORT+'/');
  await page.locator('button.microphone').waitFor({state:'visible'});
  return {contexte,page,erreurs,routes,demandes};
 };

 const rapport={};

 for(const maitre of [false,true]){
  const nom=maitre?'maitre':'ordinaire';
  const {contexte,page,erreurs,routes,demandes}=await ouvrir(maitre);

  /* ── POINT 1 : LE BOUTON EST LÀ POUR TOUT LE MONDE ────────────────────── */
  const bouton=page.getByRole('button',{name:'Ouvrir la discussion écrite'});
  await bouton.waitFor({state:'visible'});

  /* ── L'INTERDIT : la fenêtre d'apprentissage reste au code maître ─────── */
  await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).click();
  const apprentissage=page.locator('.clavier .outils button').filter({hasText:APPRENTISSAGE});
  assert.equal(await apprentissage.count(),maitre?1:0,nom+' : la fenêtre d’apprentissage doit rester au code maître');
  await page.getByRole('button',{name:'Replier le clavier'}).click();

  /* ── POINT 2 : L'ÉCRAN BLANC, PLEIN ÉCRAN, AVEC SA FLÈCHE ─────────────── */
  const sonsAvant=await page.evaluate(()=>window.__sons);
  const routesAvant=routes.length;
  await bouton.click();
  const fenetre=page.locator('.discussion');
  await fenetre.waitFor({state:'visible'});
  await page.getByRole('button',{name:'Revenir à l’écran principal'}).waitFor({state:'visible'});
  const boite=await fenetre.boundingBox();
  assert.equal(Math.round(boite.width),375,'la fenêtre doit couvrir la largeur du téléphone');
  const fond=await fenetre.evaluate(n=>getComputedStyle(n).backgroundColor);
  assert.equal(fond,'rgb(255, 255, 255)','l’écran doit être blanc');
  /* Aucun nom de fournisseur à l'écran. */
  const texteFenetre=await fenetre.innerText();
  for(const interdit of ['Gemini','ChatGPT','Claude','Anthropic'])
   assert(!texteFenetre.includes(interdit),nom+' : « '+interdit+' » ne doit pas être à l’écran');

  /* ── POINTS 3 et 4 : un message wolof, un français, par écrit ─────────── */
  const champ=page.getByLabel('Ton message');
  const envoyer=page.getByRole('button',{name:'Envoyer'});
  assert.equal(await envoyer.isDisabled(),true,'le bouton envoyer reste éteint sans texte');
  await champ.fill('Nanga def ?');
  await envoyer.click();
  await page.locator('.discussion-bulle-bia').filter({hasText:'Maa ngi fi rekk'}).waitFor();
  await champ.fill('Comment vas-tu ?');
  await envoyer.click();
  await page.locator('.discussion-bulle-bia').filter({hasText:'Je vais bien'}).waitFor();
  /* Les quatre bulles sont là, dans l'ordre, et les miennes sont à moi. */
  const bulles=await page.locator('.discussion-bulle').allInnerTexts();
  assert.equal(bulles.length,4,JSON.stringify(bulles));
  assert.equal(await page.locator('.discussion-bulle-moi').count(),2);

  /* La MÊME BIA : la route est /api/chat, elle part sans parole, et elle dit
     pour qui ranger le souvenir. Sans ces deux champs, ce qui est écrit ne
     serait pas retrouvé dans la conversation vocale. */
  assert.equal(demandes.length,2,JSON.stringify(demandes));
  for(const d of demandes){
   assert.equal(d.parole,false,JSON.stringify(d));
   assert.equal(d.diffuse,false,JSON.stringify(d));
   /* Point 6 : sans ce drapeau, le coût d'un message écrit se mélangerait à
      celui de la conversation vocale et ne serait plus lisible. */
   assert.equal(d.ecrit,true,JSON.stringify(d));
   assert.equal(typeof d.personne,'string',JSON.stringify(d));
   assert(Array.isArray(d.history),JSON.stringify(d));
  }
  /* Le fil part bien avec la question : le deuxième message porte le premier
     tour, sinon elle répondrait sans mémoire de la phrase d'avant. */
  assert.equal(demandes[0].history.length,1);
  assert.equal(demandes[1].history.length,3);

  /* ── POINT 3, MESURÉ : AUCUN SON ───────────────────────────────────────── */
  const sonsApres=await page.evaluate(()=>window.__sons);
  assert.equal(sonsApres-sonsAvant,0,nom+' : le haut-parleur a été ouvert '+(sonsApres-sonsAvant)+' fois');
  const pendant=routes.slice(routesAvant);
  for(const c of pendant)
   assert(!/^\/api\/(voix|chatterbox-test|ecouter)/.test(c),nom+' : la voix ou l’oreille a été appelée : '+JSON.stringify(pendant));
  /* /api/mesure peut passer : c'est un compteur, pas un son. Tout le reste
     est interdit — la fenêtre n'a qu'une seule sortie. */
  for(const c of [...new Set(pendant)])
   assert(c==='/api/chat'||c==='/api/mesure',nom+' : route inattendue '+c+' — '+JSON.stringify(pendant));

  /* ── POINT 5 : le fil est gardé, par compte, sur l'appareil ───────────── */
  await page.reload();
  await page.getByRole('button',{name:'Ouvrir la discussion écrite'}).click();
  await page.locator('.discussion-bulle-bia').filter({hasText:'Maa ngi fi rekk'}).waitFor();
  assert.equal(await page.locator('.discussion-bulle').count(),4);

  /* ── POINT 7 : la flèche ramène à l'écran principal, intact ───────────── */
  await page.getByRole('button',{name:'Revenir à l’écran principal'}).click();
  await fenetre.waitFor({state:'detached'});
  await page.locator('button.microphone').waitFor({state:'visible'});
  assert.equal(await page.locator('.micro-et-mode .mode-actuel').innerText(),'Khalam');
  /* Et la conversation vocale repart comme avant. */
  await page.locator('button.microphone').click();
  await page.locator('button.microphone.en-conversation').waitFor({timeout:15000});

  assert.equal(erreurs.length,0,erreurs.join('\n'));
  rapport[nom]={bouton_visible:true,apprentissage_present:maitre,bulles:bulles.length,
   sons:sonsApres-sonsAvant,routes_pendant:[...new Set(pendant)],fil_garde:true,voix_repart:true};
  await contexte.close();
 }

 /* ── ET LE COMPTEUR N'EST PAS AVEUGLE ──────────────────────────────────────

    « Aucun son : zéro » ne vaut rien si le compteur ne sait pas compter — un
    compteur aveugle est pire que pas de compteur. On ouvre donc les trois
    portes du son à la main, dans la même page, et on exige que les trois
    soient vues. Si cette ligne passait à zéro, le « zéro » des deux comptes
    ci-dessus ne prouverait plus rien.

    Que l'ANCIEN chemin tapé, lui, parle bien — le défaut que Lamine décrit —
    est déjà tenu ailleurs : tests/parole-affichee-browser.cjs le fait
    répondre en audio de bout en bout, dans un vrai navigateur. */
 {
  const {contexte,page}=await ouvrir(true);
  const vues=await page.evaluate(()=>{
   const avant=window.__sons;
   const portes=[];
   try{new window.AudioContext();portes.push('AudioContext');}catch{}
   try{const a=new Audio();a.muted=true;a.play().catch(()=>{});portes.push('audio.play');}catch{}
   try{window.speechSynthesis.speak(new SpeechSynthesisUtterance('essai'));portes.push('speechSynthesis');}catch{}
   return {portes,comptees:window.__sons-avant};
  });
  assert.equal(vues.comptees,vues.portes.length,
   'le compteur de son est aveugle : '+vues.portes.length+' portes ouvertes, '+vues.comptees+' comptees');
  rapport.compteur_de_son={portes_vues:vues.portes,comptees:vues.comptees};
  await contexte.close();
 }

 console.log(JSON.stringify(rapport));
 }catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
