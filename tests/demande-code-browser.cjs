const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');

/* ── LE FORMULAIRE « DEMANDER UN CODE », DANS UN VRAI NAVIGATEUR ───────────

   Lamine, le 28 octobre 2026 : « teste : numéro vide (refusé), numéro
   invalide (refusé), case non cochée (refusé), demande valide (enregistrée +
   WhatsApp s'ouvre), même numéro plusieurs fois, et le formulaire sur un
   écran de 375 px ».

   Les cinq premières sont aussi éprouvées côté serveur dans
   tests/demande-code.test.mjs. Ici on éprouve ce que le serveur ne peut pas
   voir : que l'écran REFUSE AVANT d'envoyer, que WhatsApp s'ouvre vraiment,
   et que tout cela tient sur un iPhone.

   La page est servie depuis public/, et son appel à app.khalam.app est
   intercepté : aucune demande ne part vers le vrai serveur. */

const PORT=3133;
const serveur=spawn(process.execPath,['./node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(PORT)],{stdio:['ignore','pipe','pipe']});
let navigateur;

(async()=>{try{
 for(let n=0;n<60;n++){try{await fetch('http://127.0.0.1:'+PORT+'/api/acces');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 navigateur=await chromium.launch({headless:true,args:['--no-sandbox']});
 /* 375 px : un iPhone SE, le plus étroit qu'il ait entre les mains. */
 const contexte=await navigateur.newContext({viewport:{width:375,height:667}});
 const page=await contexte.newPage();
 const erreurs=[];page.on('pageerror',e=>erreurs.push(String(e&&e.message||e)));

 /* WhatsApp est intercepté : l'épreuve ne doit pas dépendre d'Internet, et
    wa.me redirige en vrai vers api.whatsapp.com — ce qui est juste, mais
    ferait dépendre le vert d'un serveur qui n'est pas le nôtre. */
 await contexte.route('https://wa.me/**',async route=>{
  await route.fulfill({status:200,contentType:'text/html',body:'<title>WhatsApp</title>'});
 });
 const envois=[];
 await page.route('https://app.khalam.app/api/demande-code',async route=>{
  let corps={};try{corps=JSON.parse(route.request().postData()||'{}');}catch{}
  envois.push(corps);
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({ok:true,etat:envois.length>1?'deja_connue':'nouvelle',
    whatsapp:'https://wa.me/221773728383?text=Bonjour',
    message:'Ta demande est enregistrée. WhatsApp s’ouvre pour l’envoyer à KHALAM.'})});
 });

 await page.goto('http://127.0.0.1:'+PORT+'/bia-essai.html',{waitUntil:'domcontentloaded'});

 /* ── LE LIEN DU MENU ET CELUI DE LA SECTION ACCÈS DESCENDENT ICI ──────── */
 assert.equal(await page.locator('.nav-links a[href="#demander"]').count(),1,'le menu du haut doit porter le lien');
 assert.equal(await page.locator('#acces a[href="#demander"]').count(),1,'la section Accès doit porter le lien');
 const rubrique=page.locator('#demander');
 await rubrique.waitFor({state:'attached'});

 const numero=page.locator('#demande-numero');
 const accord=page.locator('#demande-accord');
 const etat=page.locator('#demande-etat');
 const envoyer=page.getByRole('button',{name:'Demander mon code'});

 /* ── LE CHAMP PIÈGE EST INVISIBLE, ET HORS DU CLAVIER ────────────────── */
 /* Hors de l'écran, et pas `display:none` : un robot évite ce qui est
    caché franchement, il remplit ce qui a l'air d'être un champ ordinaire. */
 const boitePiege=await page.locator('#demande-societe').boundingBox();
 assert.ok(boitePiege.x+boitePiege.width<0,'le piège doit être hors de l\'écran : '+JSON.stringify(boitePiege));
 assert.equal(await page.locator('#demande-societe').getAttribute('tabindex'),'-1','ni s’attraper au clavier');
 assert.equal(await page.locator('.piege').getAttribute('aria-hidden'),'true','ni se lire à voix haute');

 /* ── 1. NUMÉRO VIDE : REFUSÉ, ET RIEN NE PART ────────────────────────── */
 await accord.check();
 await envoyer.click();
 assert.equal((await etat.innerText()).trim(),'Saisis ton numéro de téléphone.');
 assert.equal(envois.length,0,'rien ne doit partir au serveur');

 /* ── 2. NUMÉRO INVALIDE : REFUSÉ, AVEC UN EXEMPLE ────────────────────── */
 for(const faux of ['bonjour','12','06 12 34 56 78']){
  await numero.fill(faux);
  await envoyer.click();
  assert.equal((await etat.innerText()).trim(),'Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.','refusé : '+faux);
  assert.equal(await numero.getAttribute('aria-invalid'),'true');
  assert.equal(envois.length,0,'rien ne doit partir pour '+faux);
 }

 /* ── 3. CASE NON COCHÉE : REFUSÉ, MÊME AVEC UN BON NUMÉRO ────────────── */
 await accord.uncheck();
 await numero.fill('77 123 45 67');
 await envoyer.click();
 assert.equal((await etat.innerText()).trim(),'Coche la case pour que KHALAM puisse t’envoyer ton code.');
 assert.equal(envois.length,0,'sans son accord, rien ne doit partir');

 /* ── 4. DEMANDE VALIDE : ELLE PART, ET WHATSAPP S'OUVRE ──────────────── */
 await accord.check();
 await page.locator('#demande-prenom').fill('Awa');
 const whatsapp=page.waitForEvent('popup',{timeout:10000}).catch(()=>null);
 await envoyer.click();
 await page.waitForFunction(()=>document.getElementById('demande-etat').getAttribute('data-ton')==='bon',null,{timeout:10000});
 assert.equal(envois.length,1,'une demande, et une seule');
 /* Le numéro part MIS EN FORME, pas tel qu'il a été tapé. */
 assert.equal(envois[0].numero,'+221771234567');
 assert.equal(envois[0].prenom,'Awa');
 assert.equal(envois[0].accord,true);
 assert.equal(envois[0].societe,'','le piège doit partir vide');
 const ouverte=await whatsapp;
 assert.ok(ouverte,'WhatsApp doit s’ouvrir après l’enregistrement');
 assert.ok(/221773728383/.test(ouverte.url()),'le numéro de KHALAM doit être dans l\'adresse : '+ouverte.url());
 assert.ok(/wa\.me|whatsapp/.test(ouverte.url()),'ce doit être WhatsApp : '+ouverte.url());
 await ouverte.close();
 assert.ok((await etat.innerText()).includes('enregistrée'),await etat.innerText());

 /* ── 5. LE MÊME NUMÉRO UNE DEUXIÈME FOIS : ÇA PASSE, SANS CASSER ─────── */
 await envoyer.click();
 await page.waitForFunction(()=>document.getElementById('demande-etat').getAttribute('data-ton')==='bon',null,{timeout:10000});
 assert.equal(envois.length,2);
 assert.deepEqual(envois[1].numero,envois[0].numero);

 /* ── 6. SUR UN ÉCRAN DE 375 px ───────────────────────────────────────── */
 const large=await page.evaluate(()=>({page:document.documentElement.scrollWidth,fenetre:window.innerWidth}));
 assert.ok(large.page<=large.fenetre+1,'la page déborde en largeur : '+JSON.stringify(large));
 for(const [nom,cible] of [['numéro','#demande-numero'],['prénom','#demande-prenom'],['bouton','#formulaire-code button[type=submit]']]){
  const boite=await page.locator(cible).boundingBox();
  assert.ok(boite.height>=44,nom+' est trop bas pour un pouce : '+boite.height+' px');
  assert.ok(boite.width<=375,nom+' dépasse de l’écran : '+boite.width+' px');
 }
 /* 16 px au moins dans les champs : en dessous, Safari zoome tout seul et la
    page part de travers. */
 const taille=await page.locator('#demande-numero').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 assert.ok(taille>=16,'un champ sous 16 px fait zoomer Safari : '+taille);
 /* La case à cocher doit être attrapable au pouce. */
 const caseBoite=await accord.boundingBox();
 assert.ok(caseBoite.width>=20&&caseBoite.height>=20,'la case est trop petite : '+JSON.stringify(caseBoite));

 /* ── ET LE MOT INTERDIT N'EST NULLE PART ─────────────────────────────── */
 const texte=await page.locator('body').innerText();
 assert.ok(!/Gemini|ChatGPT/i.test(texte),'un nom de fournisseur est écrit sur la page');

 assert.equal(erreurs.length,0,erreurs.join(' | '));
 console.log(JSON.stringify({menu:true,acces:true,vide:'refusé',invalide:'refusé',sans_accord:'refusé',
  demandes_envoyees:envois.length,numero_mis_en_forme:envois[0].numero,whatsapp:true,
  largeur_page:large.page,piege:'invisible',erreurs:erreurs}));
 await contexte.close();
}catch(e){console.error('✘ '+(e&&e.message||e));process.exitCode=1;}
finally{await navigateur?.close().catch(()=>{});serveur.kill('SIGTERM');}})();
