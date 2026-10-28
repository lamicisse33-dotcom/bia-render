const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');

/* ── DE « JE N'AI PAS DE CODE » JUSQU'À « IL EST ENTRÉ » ───────────────────

   Lamine, le 28 octobre 2026 : « PAS DE PAGES MULTIPLES […] la demande de
   code doit être SUR LA PAGE OFFICIELLE DE BIA, dans l'écran d'entrée où on
   saisit numéro + code. Une seule page, toutes les options. » Et l'épreuve
   qu'il demande, en une phrase : « visiteur sans code → demande → ligne sur
   /demandes → je génère le code → il entre ».

   C'est donc UNE SEULE épreuve qui suit la chaîne entière, dans un vrai
   navigateur à 375 px, avec deux acteurs :

     1. le visiteur, sans rien dans son téléphone, devant la porte ;
     2. Lamine, sur /demandes, qui voit la ligne et fabrique le code ;
     3. le visiteur de nouveau, qui entre avec SON numéro et ce code.

   Le serveur est remplacé par un décor QUI SE SOUVIENT : la demande déposée
   à l'étape 1 est celle que Lamine voit à l'étape 2, et le code fabriqué à
   l'étape 2 est celui qui ouvre à l'étape 3. Sans cette mémoire, l'épreuve
   passerait au vert sans avoir rien relié.

   CE QU'ELLE NE PROUVE PAS : la vraie table Supabase, qui n'est pas touchée
   ici. C'est /api/etat → demandes_code.table qui dit si elle existe. */

const PORT=3133;
const serveur=spawn(process.execPath,['./node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(PORT)],{stdio:['ignore','pipe','pipe']});
let navigateur;
const BASE='http://127.0.0.1:'+PORT;

(async()=>{try{
 for(let n=0;n<60;n++){try{await fetch(BASE+'/api/acces');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 navigateur=await chromium.launch({headless:true,args:['--no-sandbox']});

 /* La mémoire du décor : ce que le serveur aurait rangé. */
 const demandes=[];
 let codeFabrique='';
 let numeroDuCode='';
 const NUMERO='77 123 45 67', NORMALISE='+221771234567';

 const decor=async(contexte,{maitre=false}={})=>{
  await contexte.route('**/api/**',async route=>{
   const requete=route.request(), chemin=new URL(requete.url()).pathname, methode=requete.method();
   const json=(corps,statut=200)=>route.fulfill({status:statut,contentType:'application/json',body:JSON.stringify(corps)});
   let corps={};try{corps=JSON.parse(requete.postData()||'{}');}catch{}

   if(chemin==='/api/demande-code'&&methode==='POST'){
    demandes.push(corps);
    return json({ok:true,etat:'nouvelle',whatsapp:'https://wa.me/221773728383?text=Bonjour',
     message:'Ta demande est enregistrée. WhatsApp s’ouvre pour l’envoyer à KHALAM.'});
   }
   if(chemin==='/api/demande-code'&&methode==='GET'){
    return json({ok:true,total:demandes.length,demandes:demandes.map(d=>({
     numero:NORMALISE,prenom:d.prenom||null,statut:codeFabrique?'code envoyé':'en attente',
     demande_le:new Date().toISOString(),derniere:new Date().toISOString()}))});
   }
   if(chemin==='/api/codes'&&methode==='POST'){
    if(!corps.numero)return json({erreur:'Saisis ton numéro de téléphone.'},400);
    numeroDuCode=corps.numero;
    codeFabrique='ABCD23EFGHJKLMNP';   // seize signes, comme un vrai
    return json({code:codeFabrique,numero:corps.numero,expire:new Date(Date.now()+864e5).toISOString(),quota:15,nom:corps.nom||''});
   }
   if(chemin==='/api/acces'){
    /* La porte : elle n'ouvre QUE pour le code fabriqué ET son numéro. */
    const code=requete.headers()['x-bia-code']||'';
    const numero=requete.headers()['x-bia-numero']||'';
    if(maitre)return json({ok:true,maitre:true,lie:'maitre'});
    if(!numero)return json({ok:false,erreur:'Saisis ton numéro de téléphone.'},401);
    if(code!==codeFabrique)return json({ok:false,erreur:'Code refusé. Vérifie ton code.'},401);
    if(numero.replace(/\D/g,'')!==String(numeroDuCode).replace(/\D/g,''))
     return json({ok:false,erreur:'Ce code est déjà utilisé avec un autre numéro.'},401);
    return json({ok:true,maitre:false,lie:'deja'});
   }
   if(chemin==='/api/codes'&&methode==='GET')return json({maitre});
   return json({});
  });
 };

 /* ── 1. LE VISITEUR, SANS RIEN, DEVANT LA PORTE ───────────────────────── */
 const visite=await navigateur.newContext({viewport:{width:375,height:667}});
 const erreurs=[];
 const page=await visite.newPage();
 page.on('pageerror',e=>erreurs.push(String(e&&e.message||e)));
 await visite.route('https://wa.me/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<title>WhatsApp</title>'}));
 await decor(visite);
 await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});

 await page.getByLabel("Code d'accès").waitFor({state:'visible',timeout:30000});
 /* innerText rend le texte TEL QU'IL S'AFFICHE : la pastille est en
    majuscules par le style, pas dans le balisage. */
 assert.ok(/phase de test/i.test(await page.locator('.porte').innerText()),
  'la porte doit dire que BIA est en phase de test : '+await page.locator('.porte').innerText());
 /* Et la page officielle est la SEULE : l'ancienne page d'essai n'existe plus. */
 const essai=await page.request.get(BASE+'/bia-essai.html');
 assert.equal(essai.status(),404,'bia-essai.html ne doit plus exister : HTTP '+essai.status());

 /* ── 2. IL OUVRE LE FORMULAIRE, SANS CHANGER D'ÉCRAN ──────────────────── */
 const ouvrir=page.getByRole('button',{name:/Je n’ai pas de code/});
 await ouvrir.waitFor({state:'visible'});
 await ouvrir.click();
 const accord=page.locator('#porte-accord');
 await accord.waitFor({state:'visible'});
 assert.equal(new URL(page.url()).pathname,'/','le formulaire ne doit pas changer de page');
 assert.equal(await page.getByLabel("Code d'accès").count(),0,'le champ code laisse la place au formulaire');

 const piege=await page.locator('#porte-societe').boundingBox();
 assert.ok(piege.x+piege.width<0,'le piège doit être hors de l’écran : '+JSON.stringify(piege));
 assert.equal(await page.locator('#porte-societe').getAttribute('tabindex'),'-1');

 /* ── 3. LES REFUS, AVANT QUE QUOI QUE CE SOIT NE PARTE ────────────────── */
 const numero=page.getByLabel('Numéro de téléphone');
 const etat=page.locator('.porte-etat');
 const envoyer=page.getByRole('button',{name:'Demander mon code'});
 await numero.fill('bonjour');
 await accord.check();
 await envoyer.click();
 assert.equal((await etat.innerText()).trim(),'Ce numéro n’est pas valide. Exemple : +221 77 123 45 67.');
 assert.equal(demandes.length,0,'rien ne doit partir sur un numéro invalide');
 await accord.uncheck();
 await numero.fill(NUMERO);
 await envoyer.click();
 assert.equal((await etat.innerText()).trim(),'Coche la case pour que KHALAM puisse t’envoyer ton code.');
 assert.equal(demandes.length,0,'rien ne doit partir sans son accord');

 /* ── 4. LA DEMANDE PART, ET WHATSAPP S'OUVRE ──────────────────────────── */
 await accord.check();
 await page.getByLabel('Prénom (facultatif)').fill('BIBA');
 const whatsapp=page.waitForEvent('popup',{timeout:10000}).catch(()=>null);
 await envoyer.click();
 await page.waitForFunction(()=>document.querySelector('.porte-etat')?.getAttribute('data-ton')==='bon',null,{timeout:10000});
 assert.equal(demandes.length,1);
 assert.equal(demandes[0].numero,NUMERO);
 assert.equal(demandes[0].prenom,'BIBA');
 assert.equal(demandes[0].accord,true);
 assert.equal(demandes[0].societe,'','le piège doit partir vide');
 const ouverte=await whatsapp;
 assert.ok(ouverte&&/221773728383/.test(ouverte.url()),'WhatsApp doit s’ouvrir sur KHALAM');
 await ouverte.close();

 /* À 375 px, rien ne déborde et tout s'attrape au pouce. */
 const large=await page.evaluate(()=>({page:document.documentElement.scrollWidth,fenetre:window.innerWidth}));
 assert.ok(large.page<=large.fenetre+1,'la porte déborde en largeur : '+JSON.stringify(large));
 for(const [nom,cible] of [['numéro','.porte-demande input[type=tel]'],['prénom','#porte-prenom'],['envoyer','.porte-envoyer']]){
  const boite=await page.locator(cible).boundingBox();
  assert.ok(boite.height>=44,nom+' est trop bas pour un pouce : '+boite.height);
  assert.ok(boite.width<=375,nom+' dépasse de l’écran : '+boite.width);
 }
 const taille=await page.locator('.porte-demande input[type=tel]').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 assert.ok(taille>=16,'un champ sous 16 px fait zoomer Safari : '+taille);

 /* ── 5. LAMINE VOIT LA LIGNE, ET FABRIQUE LE CODE ─────────────────────── */
 const chezLui=await navigateur.newContext({viewport:{width:375,height:667}});
 await decor(chezLui,{maitre:true});
 await chezLui.addInitScript(()=>{localStorage.setItem('bia-code','CODEMAITRE');localStorage.setItem('bia-numero','+221770000000');});
 const pageMaitre=await chezLui.newPage();
 pageMaitre.on('pageerror',e=>erreurs.push('maitre: '+String(e&&e.message||e)));
 await pageMaitre.goto(BASE+'/demandes',{waitUntil:'domcontentloaded'});
 await pageMaitre.getByText(NORMALISE).waitFor({state:'visible',timeout:20000});
 assert.ok((await pageMaitre.locator('body').innerText()).includes('en attente'),'la demande doit être en attente');
 await pageMaitre.getByRole('button',{name:'Générer le code'}).click();
 await pageMaitre.getByText('ABCD23EFGHJKLMNP').waitFor({state:'visible',timeout:15000});
 assert.equal(numeroDuCode,NORMALISE,'le code doit être fabriqué pour CE numéro');
 assert.equal(codeFabrique.length,16);
 const lien=await pageMaitre.getByRole('link',{name:'Envoyer sur WhatsApp'}).getAttribute('href');
 assert.ok(lien.includes('221771234567'),'le message doit partir à ce numéro : '+lien);
 assert.ok(decodeURIComponent(lien).includes(codeFabrique),'et porter le code : '+lien);

 /* ── 6. LE VISITEUR ENTRE ─────────────────────────────────────────────── */
 await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
 await page.getByLabel("Code d'accès").waitFor({state:'visible',timeout:20000});
 /* D'abord avec un AUTRE numéro : la porte doit rester fermée. */
 await page.getByLabel('Numéro de téléphone').fill('+221776543210');
 await page.getByLabel("Code d'accès").fill(codeFabrique);
 await page.getByRole('button',{name:'Entrer'}).click();
 await page.locator('.porte-erreur').waitFor({state:'visible',timeout:15000});
 assert.ok((await page.locator('.porte-erreur').innerText()).includes('autre numéro'),
  'un autre téléphone ne doit pas entrer : '+await page.locator('.porte-erreur').innerText());
 /* Puis avec le sien. */
 await page.getByLabel('Numéro de téléphone').fill(NUMERO);
 await page.getByRole('button',{name:'Entrer'}).click();
 await page.locator('button.microphone').waitFor({state:'visible',timeout:20000});

 const graves=erreurs.filter(t=>!/Failed to load resource|AudioContext|NotAllowedError/i.test(t));
 assert.equal(graves.length,0,'erreurs de page : '+graves.slice(0,3).join(' | '));
 console.log(JSON.stringify({page_unique:true,ancienne_page:'404',phase_de_test:true,
  refus:['numéro invalide','case non cochée'],demande:demandes[0],whatsapp:true,
  ligne_vue_par_lamine:true,code_fabrique:codeFabrique.length+' signes',
  autre_numero:'refusé',entre:true,largeur:large.page,erreurs:graves}));
 await visite.close();await chezLui.close();
}catch(e){console.error('✘ '+(e&&e.stack||e));process.exitCode=1;}
finally{await navigateur?.close().catch(()=>{});serveur.kill('SIGTERM');}})();
