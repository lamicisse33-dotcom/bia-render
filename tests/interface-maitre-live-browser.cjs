const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const server=spawn(process.execPath,['./node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3112'],{stdio:['ignore','pipe','pipe']});
let browser;
(async()=>{try{
 for(let n=0;n<40;n++){try{await fetch('http://127.0.0.1:3112/api/acces');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('pageerror:',e.message);});
 /* Point 5 : la latence fin de parole → premier son doit QUITTER le
    navigateur. Elle partait à la poubelle (`latence:()=>{}`). */
 const mesures=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/mesure'){try{mesures.push(JSON.parse(r.postData()||'{}'));}catch{}}});
 /* ── TRANCHER PAR LE RÉSEAU, PAS PAR L'ÉTIQUETTE ────────────────────────
    Lamine, le 23 octobre 2026 : « en Khalam Rapide j'entends Chatterbox ».
    Soit les étiquettes sont inversées, soit il était resté sur Khalam. On
    enregistre donc les routes réellement appelées dans chaque mode : la
    connexion rapide passe par /api/gemini-live/session et un WebSocket, le
    chemin Khalam par /api/ecouter puis la voix Chatterbox. */
 const routes=[];page.on('request',r=>{const c=new URL(r.url()).pathname;if(c.startsWith('/api/'))routes.push(c);});
 const depuis=()=>{const n=routes.length;return ()=>routes.slice(n);};
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let data={};
  if(path==='/api/acces'||path==='/api/codes')data={ok:true,maitre:true};
  if(path==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
  if(path==='/api/gemini-live/session')data={token:'auth_tokens/synthetic',setup:{model:'synthetic'}};
  if(path==='/api/voix-gardees')data={ok:true};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 const decor=()=>{
  localStorage.setItem('bia-code','SYNTHETICMASTER');
  window.__liveConnections=0;
  class FakeSocket{
   static OPEN=1;readyState=1;
   constructor(){window.__liveConnections++;setTimeout(()=>this.onopen?.({}),20);}
   send(raw){const d=JSON.parse(raw);
    if(d.setup)setTimeout(()=>this.onmessage?.({data:JSON.stringify({setupComplete:{}})}),20);
    if(d.clientContent)setTimeout(()=>{
     this.onmessage?.({data:JSON.stringify({serverContent:{inputTranscription:{text:'Bonjour Bia'},outputTranscription:{text:'Bonjour papa, comment vas-tu ?'},modelTurn:{parts:[{inlineData:{data:btoa('\0'.repeat(4800)),mimeType:'audio/pcm;rate=24000'}}]}}})});
     setTimeout(()=>this.onmessage?.({data:JSON.stringify({serverContent:{turnComplete:true}})}),180);
    },200);
   }
   close(){this.readyState=3;setTimeout(()=>this.onclose?.({code:1000}),0);}
  }
  window.WebSocket=FakeSocket;
 };
 await page.addInitScript(decor);
 const controleMaitre=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/codes');
 await page.goto('http://127.0.0.1:3112/');
 await controleMaitre;
 await page.locator('.outils button').filter({hasText:'Apprentissage / lecture continue'}).waitFor({state:'attached'});
 await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).waitFor();

 /* ── PLUS AUCUNE SÉLECTION DE MOTEUR À L'ÉCRAN ─────────────────────
    Lamine, le 28 octobre 2026 : « je veux que rapide soit le moteur par
    défaut et que tu enlèves l'option de sélection de Moteur sur l'écran pour
    le moment ». Une pastille « Basculer vers Khalam » se tenait au-dessus de
    la barre depuis le 23 octobre. On exige maintenant QU'ELLE N'EXISTE PLUS,
    et que ce qui s'ouvre soit Khalam Rapide — avec le mot « Gemini »
    toujours nulle part à l'écran. */
 assert.equal(await page.locator('button.bascule-mode').count(),0,'aucun bouton de bascule à l\'écran');
 const texteEcran=await page.locator('body').innerText();
 assert(!texteEcran.includes('Basculer vers'),texteEcran);
 assert(!texteEcran.includes('Gemini'));
 /* Le nom du chemin courant reste écrit en permanence : il dit ce qui
    répond, il ne propose rien. C'est ce qui manquait pour qu'on sache
    lequel des deux chemins parle. */
 const nomDuMode=page.locator('.micro-et-mode .mode-actuel');
 await nomDuMode.waitFor({state:'visible'});
 assert.equal((await nomDuMode.innerText()).trim(),'Khalam Rapide');
 assert.equal(await nomDuMode.getAttribute('data-mode-actuel'),'rapide');

 /* ── LE FILET SOUS LE VRAI TROU : LE CHOIX GARDÉ NE RAMÈNE PLUS EN ARRIÈRE ─
    Le bouton retiré écrivait `bia-mode-conversation` dans le téléphone. Tout
    appareil qui a servi aux essais — dont le sien — a donc « khalam » dans
    son rangement. Si cette clé était encore lue, « rapide par défaut »
    serait faux exactement là où ça compte, et il n'y aurait plus rien à
    l'écran pour en sortir. On la pose à la main et on recharge. */
 await page.evaluate(()=>localStorage.setItem('bia-mode-conversation','khalam'));
 await page.reload();
 await page.locator('.outils button').filter({hasText:'Apprentissage / lecture continue'}).waitFor({state:'attached'});
 await page.locator('.micro-et-mode .mode-actuel').waitFor({state:'visible'});
 assert.equal((await page.locator('.micro-et-mode .mode-actuel').innerText()).trim(),'Khalam Rapide');
 assert.equal(await page.locator('button.bascule-mode').count(),0);

 /* `?mode=khalam` reste une porte — pour diagnostiquer et pour les épreuves
    — mais elle ne s'affiche nulle part. */
 await page.goto('http://127.0.0.1:3112/?mode=khalam');
 await page.locator('.micro-et-mode .mode-actuel').waitFor({state:'visible'});
 assert.equal((await page.locator('.micro-et-mode .mode-actuel').innerText()).trim(),'Khalam');
 assert.equal(await page.locator('button.bascule-mode').count(),0);

 /* On revient au défaut : la suite vérifie la conversation rapide elle-même. */
 await page.goto('http://127.0.0.1:3112/');
 await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).waitFor();
 await page.locator('.micro-et-mode .mode-actuel').waitFor({state:'visible'});
 assert.equal((await page.locator('.micro-et-mode .mode-actuel').innerText()).trim(),'Khalam Rapide');
 assert(/Khalam Rapide$/.test(await page.locator('button.microphone').getAttribute('aria-label')));

 const routesRapide=depuis();
 await page.locator('button.microphone').click();
 try{await page.getByRole('button',{name:"Elle l'a bien dit — à garder et à enregistrer"}).waitFor({timeout:15000});}catch(e){console.log('État après clic',await page.locator('body').innerText(),await page.evaluate(()=>window.__liveConnections));throw e;}
 assert.equal(await page.evaluate(()=>window.__liveConnections),1);
 await page.getByRole('button',{name:"Elle l'a bien dit — à garder et à enregistrer"}).click();
 assert.equal(await page.locator('.verdict-bien i').innerText(),'1');
 await page.getByRole('button',{name:"Elle l'a mal dit — à corriger plus tard"}).click();
 assert.equal(await page.locator('.verdict-mal i').innerText(),'1');
 await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).click();
 await page.getByText('Bonjour papa, comment vas-tu ?', {exact:true}).waitFor();
 await page.locator('.mal-dit').first().click();
 assert(await page.locator('textarea').count()>0);
 /* ── LE VERDICT : LES ÉTIQUETTES NE SONT PAS INVERSÉES ──────────────────
    En « Khalam Rapide » le navigateur a demandé la session rapide et n'a
    touché NI /api/ecouter NI la voix Chatterbox. */
 const vuesRapide=routesRapide();
 assert(vuesRapide.includes('/api/gemini-live/session'),JSON.stringify(vuesRapide));
 assert(!vuesRapide.some(c=>c.startsWith('/api/chatterbox-test')),JSON.stringify(vuesRapide));
 assert(!vuesRapide.includes('/api/ecouter'),JSON.stringify(vuesRapide));
 /* ── KHALAM RAPIDE ÉCRIT SES SOUVENIRS (24 octobre 2026) ────────────────
    Avant ce jour, `garder()` n'était appelé que par Khalam : une conversation
    entière sur la connexion rapide ne laissait AUCUNE ligne dans
    khalam_souvenirs, et le lendemain BIA ne se rappelait de rien. */
 assert(vuesRapide.includes('/api/gemini-live/souvenir'),'le tour doit être gardé : '+JSON.stringify(vuesRapide));

 /* Et en « Khalam », le même geste n'ouvre AUCUNE connexion rapide. Dans un
    contexte neuf : les panneaux ouverts par la scène précédente recouvrent
    la barre, et on vérifie un chemin, pas une adresse de clic. */
 const enKhalam=await browser.newContext();
 const pageKhalam=await enKhalam.newPage();
 const vuesKhalam=[];
 pageKhalam.on('request',r=>{const c=new URL(r.url()).pathname;if(c.startsWith('/api/'))vuesKhalam.push(c);});
 await pageKhalam.route('**/api/**',async route=>{
  const chemin=new URL(route.request().url()).pathname;
  let data={};
  if(chemin==='/api/acces'||chemin==='/api/codes')data={ok:true,maitre:true};
  if(chemin==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
  if(chemin==='/api/gemini-live/session')data={token:'auth_tokens/synthetic',setup:{model:'synthetic'}};
  if(chemin==='/api/voix-gardees')data={ok:true};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await pageKhalam.addInitScript(decor);
 await pageKhalam.goto('http://127.0.0.1:3112/');
 await pageKhalam.locator('.micro-et-mode .mode-actuel').waitFor({state:'visible'});
 assert.equal((await pageKhalam.locator('.micro-et-mode .mode-actuel').innerText()).trim(),'Khalam Rapide');
 /* On y va par l'adresse : il n'y a plus de bouton pour changer de chemin. */
 await pageKhalam.goto('http://127.0.0.1:3112/?mode=khalam');
 await pageKhalam.locator('.micro-et-mode .mode-actuel').waitFor({state:'visible'});
 assert.equal((await pageKhalam.locator('.micro-et-mode .mode-actuel').innerText()).trim(),'Khalam');
 vuesKhalam.length=0;
 await pageKhalam.locator('button.microphone').click();
 await pageKhalam.waitForTimeout(3000);
 assert(!vuesKhalam.includes('/api/gemini-live/session'),JSON.stringify(vuesKhalam));
 assert.equal(await pageKhalam.evaluate(()=>window.__liveConnections),0);
 await enKhalam.close();

 assert.equal(errors.length,0,errors.join('\n'));
 const bascules=mesures.filter(m=>m.type==='khalam_rapide'&&m.etape==='bascule');
 const premiersSons=mesures.filter(m=>m.type==='khalam_rapide'&&m.etape==='premier_son');
 /* ZÉRO BASCULE MESURÉE, et c'est le résultat attendu depuis le 28 octobre
    2026 : le geste qui en envoyait une n'existe plus. Le compteur du serveur,
    lui, n'est pas touché — le filet `indisponible` garde sa voie si le
    fournisseur refuse un jour. */
 assert.equal(bascules.length,0,JSON.stringify(mesures));
 /* ── POURQUOI ZÉRO MESURE ICI, ET POURQUOI C'EST LE BON RÉSULTAT ────────

    La mesure ne s'arme plus que sur une parole entendue PENDANT QU'ELLE SE
    TAIT. Le faux micro de Chromium ne franchit pas le seuil de bruit, donc
    rien ne s'arme : avant le correctif, ce même décor déclarait 218 ms —
    c'est-à-dire le temps depuis la connexion, pas depuis une fin de parole.

    Ce qu'on exige donc ici : AU PLUS une mesure. La rafale du 23 octobre à
    22:28 (neuf en 393 ms) ferait échouer cette ligne. Le comportement exact
    de l'armement est éprouvé au cas par cas dans tests/gemini-live.test.mjs
    (« one measurement per turn »), où les deux horloges sont pilotées. */
 assert(premiersSons.length<=1,JSON.stringify(premiersSons));
 for(const m of premiersSons){
  assert(Number.isFinite(m.ms)&&m.ms>=0);
  assert.equal(m.tour,1);
  assert(/^[a-z0-9]{4,40}$/.test(m.session||''),JSON.stringify(m));
 }
 /* ── POINT 1 : KHALAM RAPIDE POUR QUELQU'UN QUI N'EST PAS LAMINE ────────
    Décidé par Lamine le 23 octobre 2026. Avant ce jour la connexion rapide
    était réservée à son code maître. On rejoue donc la même scène avec un
    code ordinaire, dans un contexte neuf — pas de choix gardé d'avance — et
    on exige que la conversation rapide s'ouvre quand même, et une seule
    fois. Le `maitre:false` retire au passage les boutons du maître : on
    attend donc la connexion, pas son interface. */
 const visite=await browser.newContext();
 const pageVisiteur=await visite.newPage();
 const erreursVisiteur=[];pageVisiteur.on('pageerror',e=>{erreursVisiteur.push(e.message);console.error('pageerror visiteur:',e.message);});
 await pageVisiteur.route('**/api/**',async route=>{
  const chemin=new URL(route.request().url()).pathname;
  let data={};
  if(chemin==='/api/acces'||chemin==='/api/codes')data={ok:true,maitre:false};
  if(chemin==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
  if(chemin==='/api/gemini-live/session')data={token:'auth_tokens/synthetic',setup:{model:'synthetic'}};
  if(chemin==='/api/voix-gardees')data={ok:true};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await pageVisiteur.addInitScript(decor);
 await pageVisiteur.goto('http://127.0.0.1:3112/');
 const nomVisiteur=pageVisiteur.locator('.micro-et-mode .mode-actuel');
 await nomVisiteur.waitFor({state:'visible'});
 assert.equal((await nomVisiteur.innerText()).trim(),'Khalam Rapide');
 assert.equal(await nomVisiteur.getAttribute('data-mode-actuel'),'rapide');
 assert.equal(await pageVisiteur.locator('button.bascule-mode').count(),0);
 /* Rien n'écrit plus de préférence de moteur dans le téléphone. */
 assert.equal(await pageVisiteur.evaluate(()=>localStorage.getItem('bia-mode-conversation')),null);
 const texteVisiteur=await pageVisiteur.locator('body').innerText();
 assert(!texteVisiteur.includes('Gemini'),texteVisiteur);
 assert.equal(await pageVisiteur.locator('.outils button').filter({hasText:'Apprentissage / lecture continue'}).count(),0);
 await pageVisiteur.locator('button.microphone').click();
 await pageVisiteur.waitForFunction(()=>window.__liveConnections===1,null,{timeout:15000});
 await pageVisiteur.waitForTimeout(600);
 assert.equal(await pageVisiteur.evaluate(()=>window.__liveConnections),1);
 assert.equal(erreursVisiteur.length,0,erreursVisiteur.join('\n'));
 await visite.close();

 console.log(JSON.stringify({live:true,interface_maitre:true,bien_dit:1,mal_dit:1,fil:true,correction:true,bascules:bascules.length,bouton_de_bascule:0,latences_declarees:premiersSons.map(m=>m.ms),visiteur_khalam_rapide:true,
  routes_en_rapide:[...new Set(vuesRapide)],routes_en_khalam:[...new Set(vuesKhalam)],erreurs:errors}));
 }catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
