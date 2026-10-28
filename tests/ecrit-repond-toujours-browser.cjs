/* ── LA FENÊTRE ÉCRITE RÉPOND, ET QUAND ELLE NE PEUT PAS, ELLE DIT POURQUOI ──

   Lamine, le 28 octobre 2026 au soir : « BIA ne répond plus par écrit dans la
   fenêtre de discussion. […] quand la fenêtre écrite échoue, elle doit
   AFFICHER la raison en français simple au lieu de rester muette. Épreuve de
   bout en bout "j'écris → elle répond par écrit" verte avant le push. »

   ── CE QUI S'ÉTAIT PASSÉ, ET POURQUOI AUCUNE ÉPREUVE NE L'AVAIT VU ──────────

   Le matin, entrer dans BIA est devenu « numéro + code », et /api/chat
   revérifie les deux à chaque réponse. Toute l'application a suivi. Cette
   fenêtre-ci, non : elle a son propre appel à /api/chat et il n'envoyait que
   le code.

   Résultat mesuré sur le serveur en ligne le soir même : sur cinquante-quatre
   étapes de préparation enregistrées, AUCUNE de celles déclarées après la
   porte n'apparaissait — zéro appel au modèle, zéro panne, zéro compteur.
   « cc » répondait (le répertoire répond AVANT la porte, ses sons sont dans
   un seau public) et tout le reste était refusé pour numéro manquant.

   Et tests/discussion-ecrite-browser.cjs était VERT pendant ce temps : son
   décor répondait 200 à tout, donc il ne pouvait pas voir une porte fermée.
   Un décor qui dit toujours oui ne prouve rien d'une porte.

   Ce fichier-ci ajoute le décor qui manquait : il EXIGE l'en-tête du numéro,
   et il rejoue les trois façons d'échouer. */
const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const PORT=3123;
const server=spawn(process.execPath,['./node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(PORT)],{stdio:['ignore','pipe','pipe']});
let browser;

const NUMERO='+221771234567';

(async()=>{try{
 for(let n=0;n<40;n++){try{await fetch('http://127.0.0.1:'+PORT+'/api/acces');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});

 /* `scene` décide ce que le serveur répond. C'est le seul réglage. */
 const ouvrir=async(scene)=>{
  const contexte=await browser.newContext({viewport:{width:375,height:812}});
  const page=await contexte.newPage();
  const erreurs=[];page.on('pageerror',e=>{erreurs.push(e.message);console.error('pageerror:',e.message);});
  const vus=[];
  await page.route('**/api/**',async route=>{
   const chemin=new URL(route.request().url()).pathname;
   if(chemin==='/api/chat'){
    const entetes=route.request().headers();
    const corps=JSON.parse(route.request().postData()||'{}');
    vus.push({numero:entetes['x-bia-numero']||'',code:entetes['x-bia-code']||'',message:corps.message,ecrit:corps.ecrit});
    /* ── LA PORTE DU SERVEUR, POUR DE VRAI ─────────────────────────────
       C'est le cœur de cette épreuve : sans l'en-tête du numéro, on refuse
       comme le vrai serveur refusait — 401, et la raison dans `erreur`
       autant que dans `reply`. Le répertoire, lui, répond AVANT la porte :
       « cc » passe même sans numéro, exactement comme en ligne. */
    const salutation=/^(cc|salut|bonjour|nanga def)\b/i.test(String(corps.message||'').trim());
    /* La porte, comme le vrai serveur : sans l'en-tête du numéro, refus —
       sauf pour le répertoire, qui répond AVANT la porte. Et la scène
       `porte_refuse` refuse même AVEC le numéro, pour éprouver que la raison
       du serveur arrive bien jusqu'à l'écran. */
    if((!entetes['x-bia-numero']&&!salutation)||(scene==='porte_refuse'&&!salutation))
     return route.fulfill({status:401,contentType:'application/json',
      body:JSON.stringify({reply:'Saisis ton numéro de téléphone.',erreur:'Saisis ton numéro de téléphone.',source:'code',motif:'numero'})});
    /* 500 et RIEN dedans : pas de `reply`, pas d'`erreur`. C'est le cas le
       plus dur — le serveur tombe sans un mot — et c'est donc celui qui
       éprouve la phrase française de la page, et pas celle du décor. */
    if(scene==='cerveau_muet')
     return route.fulfill({status:500,contentType:'application/json',body:'{}'});
    if(scene==='reponse_vide')
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:'   '})});
    return route.fulfill({status:200,contentType:'application/json',
     body:JSON.stringify({reply:salutation?'Maa ngi fi rekk, papa.':'Le prix du sac de riz tourne autour de dix-sept mille francs à Dakar.'})});
   }
   let data={};
   if(chemin==='/api/acces'||chemin==='/api/codes')data={ok:true,maitre:true};
   if(chemin==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
   if(chemin==='/api/voix-gardees')data={ok:true};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.addInitScript(([numero])=>{
   localStorage.setItem('bia-code','SYNTHETICMASTER');
   if(numero)localStorage.setItem('bia-numero',numero);
  },[scene==='sans_numero_range'?'':NUMERO]);
  const controle=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/codes');
  await page.goto('http://127.0.0.1:'+PORT+'/?mode=khalam');
  await controle;
  await page.locator('button.microphone').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Ouvrir la discussion écrite'}).click();
  await page.locator('.discussion').waitFor({state:'visible'});
  return {contexte,page,erreurs,vus};
 };

 const ecrire=async(page,texte)=>{
  await page.getByLabel('Ton message').fill(texte);
  await page.getByRole('button',{name:'Envoyer'}).click();
 };

 const rapport={};

 /* ── SCÈNE 1 : J'ÉCRIS UNE VRAIE QUESTION, ELLE RÉPOND PAR ÉCRIT ─────────
    Pas une salutation : une question qui exige le cerveau, donc qui doit
    traverser la porte. C'est la scène que Lamine a demandée. */
 {
  const {contexte,page,erreurs,vus}=await ouvrir('normale');
  await ecrire(page,'Combien coûte un sac de riz à Dakar ?');
  await page.locator('.discussion-bulle-bia').filter({hasText:'dix-sept mille'}).waitFor({timeout:20000});
  assert.equal(await page.locator('.discussion-souci').count(),0,'aucune raison ne doit s’afficher quand elle répond');
  /* ── LE FILET SOUS LE TROU DU 28 OCTOBRE ──────────────────────────────
     Le numéro part avec la question. Sans cette ligne, l'épreuve
     redeviendrait verte le jour où quelqu'un retire l'en-tête. */
  assert.equal(vus.length,1,JSON.stringify(vus));
  assert.equal(vus[0].numero,NUMERO,'la fenêtre écrite doit envoyer le numéro, comme tout le reste de l’application');
  assert.equal(vus[0].ecrit,true,'le tour doit se déclarer écrit pour que son coût se lise à part');
  rapport.vraie_question={bulle:true,numero_envoye:vus[0].numero===NUMERO,souci:0};
  assert.equal(erreurs.length,0,erreurs.join('\n'));
  await contexte.close();
 }

 /* ── SCÈNE 2 : LA PORTE REFUSE — ELLE DIT LAQUELLE, PAS « RÉESSAIE » ────
    C'est la soirée du 28 octobre, rejouée : le téléphone n'a pas de numéro
    rangé. « cc » répond, la vraie question est refusée — et la raison du
    serveur doit s'afficher, mot pour mot. */
 {
  const {contexte,page,erreurs}=await ouvrir('porte_refuse');
  /* « cc » répond : le répertoire est servi AVANT la porte. C'est ce que
     Lamine a observé — et c'est ce qui rendait le défaut trompeur. */
  await ecrire(page,'cc');
  await page.locator('.discussion-bulle-bia').filter({hasText:'Maa ngi fi rekk'}).waitFor({timeout:20000});
  await ecrire(page,'Combien coûte un sac de riz à Dakar ?');
  const souci=page.locator('.discussion-souci');
  await souci.waitFor({timeout:20000});
  const dite=(await souci.innerText()).trim();
  assert.equal(dite,'Saisis ton numéro de téléphone.',
   'la raison du serveur doit s’afficher telle quelle, pas une phrase passe-partout : '+dite);
  rapport.porte_refuse={salutation_repond:true,raison_affichee:dite};
  assert.equal(erreurs.length,0,erreurs.join('\n'));
  await contexte.close();
 }

 /* ── SCÈNE 3 : LE CERVEAU NE RÉPOND PAS — EN FRANÇAIS SIMPLE ────────────
    Un 500 sans aucune phrase. Avant, la fenêtre affichait « Je n'ai pas pu
    répondre » sans dire que c'était le cerveau ; maintenant elle le nomme. */
 {
  const {contexte,page,erreurs}=await ouvrir('cerveau_muet');
  await ecrire(page,'Explique-moi comment faire un devis.');
  const souci=page.locator('.discussion-souci');
  await souci.waitFor({timeout:20000});
  const dite=(await souci.innerText()).trim();
  assert(/cerveau/i.test(dite),'la raison doit nommer le cerveau : '+dite);
  assert(!/[Gg]emini|Claude|Anthropic|ChatGPT/.test(dite),'aucun nom de fournisseur à l’écran : '+dite);
  rapport.cerveau_muet={raison_affichee:dite};
  assert.equal(erreurs.length,0,erreurs.join('\n'));
  await contexte.close();
 }

 /* ── SCÈNE 4 : UNE RÉPONSE VIDE EST UN SILENCE ──────────────────────────
    200, et rien dedans. Indiscernable d'une panne pour celui qui regarde :
    ça doit donc se dire aussi. */
 {
  const {contexte,page,erreurs}=await ouvrir('reponse_vide');
  await ecrire(page,'Lis-moi ce papier.');
  const souci=page.locator('.discussion-souci');
  await souci.waitFor({timeout:20000});
  const dite=(await souci.innerText()).trim();
  assert(dite.length>0,'une réponse vide doit être dite, pas affichée comme une bulle vide');
  assert.equal(await page.locator('.discussion-bulle-bia').count(),0,'aucune bulle vide ne doit rester dans le fil');
  rapport.reponse_vide={raison_affichee:dite,bulles_bia:0};
  assert.equal(erreurs.length,0,erreurs.join('\n'));
  await contexte.close();
 }

 console.log(JSON.stringify(rapport));
 await browser.close();server.kill();process.exit(0);
}catch(e){console.error(e);if(browser)await browser.close();server.kill();process.exit(1);}})();

/* ── CE QUE CETTE ÉPREUVE NE DIT PAS ────────────────────────────────────────

   Le serveur est un décor : il refuse sur l'absence de l'en-tête, comme le
   vrai, mais il ne vérifie aucune signature et n'appelle aucun modèle. Que la
   porte du VRAI serveur laisse passer le code maître sans numéro s'éprouve
   dans tests/acces-numero.test.mjs, et que le refus porte désormais une
   phrase affichable s'éprouve dans la route elle-même.

   Et le vrai quota du fournisseur n'est pas ici : une fenêtre écrite peut
   très bien afficher sa raison et BIA rester sans cerveau. Ça se lit dans
   /api/etat → cerveau_ecrit et anthropic. */
