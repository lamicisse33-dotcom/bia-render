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

 /* ── LE BOUTON DE BASCULE, À L'ÉCRAN ────────────────────────────────────
    Décidé par Lamine le 23 octobre 2026 : Khalam Rapide par défaut pour tout
    le monde, un bouton visible pour revenir à Khalam, le choix gardé sur le
    téléphone — et le mot « Gemini » nulle part à l'écran. */
 const bascule=page.locator('button.bascule-mode');
 await bascule.waitFor({state:'visible'});
 assert.equal((await bascule.innerText()).trim(),'Basculer vers Khalam');
 assert.equal(await bascule.getAttribute('data-mode-actuel'),'rapide');
 assert(!(await page.locator('body').innerText()).includes('Gemini'));
 await bascule.click();
 assert.equal((await bascule.innerText()).trim(),'Basculer vers Khalam Rapide');
 assert.equal(await page.evaluate(()=>localStorage.getItem('bia-mode-conversation')),'khalam');
 /* Le choix tient au rechargement : c'est tout l'objet du localStorage. */
 await page.reload();
 await page.locator('.outils button').filter({hasText:'Apprentissage / lecture continue'}).waitFor({state:'attached'});
 const basculeApres=page.locator('button.bascule-mode');
 await basculeApres.waitFor({state:'visible'});
 assert.equal((await basculeApres.innerText()).trim(),'Basculer vers Khalam Rapide');
 assert.equal(await basculeApres.getAttribute('data-mode-actuel'),'khalam');
 /* `?mode=khalam` garde sa valeur de consigne, sans toucher au choix gardé. */
 await page.goto('http://127.0.0.1:3112/?mode=khalam');
 await page.locator('button.bascule-mode').waitFor({state:'visible'});
 assert.equal((await page.locator('button.bascule-mode').innerText()).trim(),'Basculer vers Khalam Rapide');
 /* On revient au défaut : la suite vérifie la conversation rapide elle-même. */
 await page.goto('http://127.0.0.1:3112/');
 await page.locator('button.bascule-mode').waitFor({state:'visible'});
 await page.locator('button.bascule-mode').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('bia-mode-conversation')),'rapide');
 await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).waitFor();

 /* Le nom du chemin courant est écrit en permanence, pas seulement sur le
    bouton : c'est ce qui manquait pour qu'on sache lequel répond. */
 const nomDuMode=page.locator('.micro-et-mode .mode-actuel');
 await nomDuMode.waitFor({state:'visible'});
 assert.equal((await nomDuMode.innerText()).trim(),'Khalam Rapide');
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
 await pageKhalam.locator('button.bascule-mode').click();
 assert.equal((await pageKhalam.locator('.micro-et-mode .mode-actuel').innerText()).trim(),'Khalam');
 assert.equal((await pageKhalam.locator('button.bascule-mode').innerText()).trim(),'Basculer vers Khalam Rapide');
 vuesKhalam.length=0;
 await pageKhalam.locator('button.microphone').click();
 await pageKhalam.waitForTimeout(3000);
 assert(!vuesKhalam.includes('/api/gemini-live/session'),JSON.stringify(vuesKhalam));
 assert.equal(await pageKhalam.evaluate(()=>window.__liveConnections),0);
 await enKhalam.close();

 assert.equal(errors.length,0,errors.join('\n'));
 const bascules=mesures.filter(m=>m.type==='khalam_rapide'&&m.etape==='bascule');
 const premiersSons=mesures.filter(m=>m.type==='khalam_rapide'&&m.etape==='premier_son');
 assert.equal(bascules.length,2,JSON.stringify(mesures));
 assert.deepEqual(bascules.map(m=>m.vers),['khalam','rapide']);
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
 const basculeVisiteur=pageVisiteur.locator('button.bascule-mode');
 await basculeVisiteur.waitFor({state:'visible'});
 assert.equal((await basculeVisiteur.innerText()).trim(),'Basculer vers Khalam');
 assert.equal(await basculeVisiteur.getAttribute('data-mode-actuel'),'rapide');
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

 console.log(JSON.stringify({live:true,interface_maitre:true,bien_dit:1,mal_dit:1,fil:true,correction:true,bascules:bascules.map(m=>m.vers),latences_declarees:premiersSons.map(m=>m.ms),visiteur_khalam_rapide:true,
  routes_en_rapide:[...new Set(vuesRapide)],routes_en_khalam:[...new Set(vuesKhalam)],erreurs:errors}));
 }catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
