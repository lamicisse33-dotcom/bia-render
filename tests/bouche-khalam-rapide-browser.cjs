/* ── SA BOUCHE DOIT SUIVRE SA VOIX, DANS UN VRAI NAVIGATEUR ────────────────

   Lamine, le 27 octobre 2026 : « synchronise davantage la bouche de BIA,
   elle est sur la voix Khalam Rapide ».

   RÈGLE 4 de AVANT-DE-DIRE-QUE-C-EST-BON.md : un filet doit être posé sous
   le trou réel. Le trou réel, c'est une bouche qui bouge sans rapport avec
   ce qui sort du haut-parleur. On le met donc à l'épreuve par la seule chose
   qui ne se discute pas : on fait dire à BIA un son MUET, et on regarde ses
   lèvres. Avant le 27 octobre, la minuterie aveugle les faisait mâcher dans
   le vide pendant une seconde et demie de silence ; elles doivent rester
   fermées.

   Et pour qu'on ne puisse pas « réussir » en la figeant, la deuxième scène
   lui donne un son FORT et exige l'inverse : des bouches ouvertes.

   Ce qu'on ne prouve PAS ici : le recalage fin du retard du haut-parleur
   (Chromium sans vraie carte son ne le déclare pas comme un iPhone). Il est
   éprouvé dans tests/bouche-khalam-rapide.test.mjs, et déclaré dans
   /api/etat → khalam_rapide.bouche. */
const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const PORT=3118;
const server=spawn(process.execPath,['./node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(PORT)],{stdio:['ignore','pipe','pipe']});
let browser;

/* Les sept bouches de la planche. Les six « ouvertes » sont celles qui ne
   doivent JAMAIS apparaître sur un silence. */
const OUVERTES=['bouche_entr','bouche_a','bouche_A','bouche_o','bouche_ou','bouche_i'];

(async()=>{try{
 for(let n=0;n<40;n++){try{await fetch('http://127.0.0.1:'+PORT+'/api/acces');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});

 /* `amplitude` 0 = une seconde et demie de silence ; 0.5 = une seconde et
    demie de voix franche. Le même décor, un seul chiffre qui change. */
 const scene=async(amplitude)=>{
  const contexte=await browser.newContext();
  const page=await contexte.newPage();
  const erreurs=[];page.on('pageerror',e=>{erreurs.push(e.message);console.error('pageerror:',e.message);});
  const mesures=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/mesure'){try{mesures.push(JSON.parse(r.postData()||'{}'));}catch{}}});
  await page.route('**/api/**',async route=>{
   const chemin=new URL(route.request().url()).pathname;
   let data={};
   if(chemin==='/api/acces'||chemin==='/api/codes')data={ok:true,maitre:true};
   if(chemin==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
   if(chemin==='/api/gemini-live/session')data={token:'auth_tokens/synthetic',setup:{model:'synthetic'}};
   if(chemin==='/api/voix-gardees')data={ok:true};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.addInitScript((amp)=>{
   localStorage.setItem('bia-code','SYNTHETICMASTER');
   /* Khalam Rapide est le défaut : rien à poser dans le téléphone. */
   /* Une seconde et demie de PCM 24 kHz, 16 bits, petit-boutiste. */
   const RATE=24000,N=Math.round(1.5*RATE),morceaux=[];
   for(let i=0;i<N;i++){
    const v=Math.round(amp*Math.sin(2*Math.PI*220*i/RATE)*32767)&0xffff;
    morceaux.push(String.fromCharCode(v&0xff,v>>8));
   }
   const pcm=btoa(morceaux.join(''));
   /* Le relevé des lèvres : on échantillonne toutes les 30 ms, deux fois
      plus vite que l'ancienne minuterie (110 ms), donc aucune de ses images
      ne peut passer entre deux regards. */
   window.__lèvres=[];
   setInterval(()=>{
    const tous=document.querySelectorAll('.portrait .avatar:not(.avatar-avant):not(.avatar-socle)');
    const avatar=tous[tous.length-1];
    if(avatar)window.__lèvres.push(avatar.getAttribute('data-face'));
   },30);
   class FakeSocket{
    static OPEN=1;readyState=1;
    constructor(){setTimeout(()=>this.onopen?.({}),20);}
    send(raw){const d=JSON.parse(raw);
     if(d.setup)setTimeout(()=>this.onmessage?.({data:JSON.stringify({setupComplete:{}})}),20);
     if(d.clientContent)setTimeout(()=>{
      this.onmessage?.({data:JSON.stringify({serverContent:{outputTranscription:{text:'Maa ngi fi rekk.'},modelTurn:{parts:[{inlineData:{data:pcm,mimeType:'audio/pcm;rate=24000'}}]}}})});
      setTimeout(()=>this.onmessage?.({data:JSON.stringify({serverContent:{turnComplete:true}})}),180);
     },200);
    }
    close(){this.readyState=3;setTimeout(()=>this.onclose?.({code:1000}),0);}
   }
   window.WebSocket=FakeSocket;
  },amplitude);
  await page.goto('http://127.0.0.1:'+PORT+'/');
  await page.locator('.micro-et-mode .mode-actuel').waitFor({state:'visible'});
  assert.equal((await page.locator('.micro-et-mode .mode-actuel').innerText()).trim(),'Khalam Rapide');
  await page.locator('button.microphone').click();
  /* 1,5 s de son + le temps d'arriver : on regarde large, puis on relit. */
  await page.waitForTimeout(3500);
  const lèvres=await page.evaluate(()=>window.__lèvres);
  assert.equal(erreurs.length,0,erreurs.join('\n'));
  await contexte.close();
  return {lèvres,vues:[...new Set(lèvres)],mesures};
 };

 /* ── SCÈNE 1 : LE SILENCE ──────────────────────────────────────────────── */
 const muet=await scene(0);
 const bougees=muet.vues.filter(f=>OUVERTES.includes(f));
 assert.equal(bougees.length,0,'elle mâche dans le vide sur un son muet : '+JSON.stringify(muet.vues));
 /* Et la mesure part : sans elle, on ne saurait pas, depuis /api/etat, si
    les téléphones suivent vraiment le son ou sont retombés sur l'ancienne
    minuterie. */
 const dite=muet.mesures.filter(m=>m.type==='khalam_rapide'&&m.etape==='bouche');
 assert.equal(dite.length,1,JSON.stringify(muet.mesures));
 assert.equal(dite[0].sur_le_son,true);
 assert(Number.isInteger(dite[0].retard_ms)&&dite[0].retard_ms>=0&&dite[0].retard_ms<=150,JSON.stringify(dite[0]));
 assert.equal(dite[0].pas_ms,40);

 /* ── SCÈNE 2 : LA VOIX ─────────────────────────────────────────────────── */
 const fort=await scene(0.5);
 const ouvertes=fort.vues.filter(f=>OUVERTES.includes(f));
 assert(ouvertes.length>0,'sur une vraie voix ses lèvres doivent s’ouvrir : '+JSON.stringify(fort.vues));
 /* Elle ne doit pas non plus rester bloquée sur UNE image : la bouche change
    au fil de l'énergie du son. */
 assert(fort.vues.length>=2,JSON.stringify(fort.vues));

 console.log(JSON.stringify({bouche_sur_le_son:true,
  sur_le_silence:muet.vues,sur_la_voix:fort.vues,
  retard_haut_parleur_ms:dite[0].retard_ms,tranche_ms:dite[0].pas_ms}));
 }catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
