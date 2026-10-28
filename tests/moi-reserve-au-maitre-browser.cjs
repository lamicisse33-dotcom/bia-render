/* ── « MOI » : CE QUE TOUT LE MONDE PEUT, CE QUE LE MAÎTRE SEUL VOIT ───────

   Lamine, le 27 octobre 2026 : « le bouton clavier et les autres options sur
   Moi doivent être réservés uniquement au Maître. L'option de création des
   codes de connexion et les autres options d'entraînement doivent être
   invisibles pour l'utilisateur simple. Il faut juste laisser sur Moi
   l'option que n'importe qui pourra utiliser, par exemple changer la voix
   homme / femme et choisir Moteur gratuit ou autre. »

   UNE LISTE, PAS UNE IMPRESSION. Cacher un bouton est facile ; être sûr de
   n'en avoir oublié aucun, non. Cette épreuve écrit donc les DEUX listes en
   entier et les compare dans un vrai navigateur, avec un code ordinaire puis
   avec le code maître : ce qui doit rester, et ce qui doit disparaître.

   Le jour où quelqu'un ajoutera un outil du maître dans cette fenêtre sans
   le fermer, c'est cette ligne qui le dira. */
const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const PORT=3120;
const server=spawn(process.execPath,['./node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(PORT)],{stdio:['ignore','pipe','pipe']});
let browser;

/* Ce qu'un utilisateur simple doit GARDER : la voix, l'apparence, et les deux
   boutons descendus du clavier parce qu'il en a besoin sur un téléphone
   qu'on se prête. */
/* « Apparence de Bia : 1/2 » s'appelle « Changer de personnage » depuis les
   trois tenues du 28 octobre 2026 : même capacité, même place, autre nom. Ce
   que ce filet garantit n'a pas changé — n'importe qui doit pouvoir changer
   l'apparence de BIA sans le code maître. */
const POUR_TOUS=['Changer d’utilisateur','Nouvelle conversation','Changer de personnage','Écouter la voix choisie'];
/* Les trois voix nommées par Lamine. */
const VOIX=['male','female','piper-web'];
/* Ce que le maître SEUL doit voir. Les liens sont la preuve la plus sûre :
   une étiquette se réécrit, une adresse non. */
const AU_MAITRE_LIENS=['/codes','/lecon','/voix','/voix/nombres','/voix/base','/voix/guidage','/voix/services','/voix/verdicts','/voix/secours'];
const AU_MAITRE_BOUTONS=['Conversation écrite',"Ce qu'on te demande et qu'elle n'a pas"];

(async()=>{try{
 for(let n=0;n<40;n++){try{await fetch('http://127.0.0.1:'+PORT+'/api/acces');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});

 const regarder=async(maitre)=>{
  const contexte=await browser.newContext({viewport:{width:375,height:812}});
  const page=await contexte.newPage();
  const erreurs=[];page.on('pageerror',e=>{erreurs.push(e.message);console.error('pageerror:',e.message);});
  await page.route('**/api/**',async route=>{
   const chemin=new URL(route.request().url()).pathname;
   let data={};
   if(chemin==='/api/acces'||chemin==='/api/codes')data={ok:true,maitre};
   if(chemin==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
   if(chemin==='/api/voix-gardees')data={ok:true};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.addInitScript(()=>{
   localStorage.setItem('bia-code','SYNTHETICMASTER');
   /* Le numéro, depuis le 28 octobre 2026 : sans lui, la page demanderait à
      cet appareil son téléphone avant d'ouvrir BIA. */
   localStorage.setItem('bia-numero','+221771234567');
  });
  /* ── ON ATTEND LE CONTRÔLE DU CODE, PAS L'AFFICHAGE ───────────────────
     `estMaitre` arrive d'un appel à /api/codes, APRÈS le premier rendu. Lire
     la barre dès que le micro s'affiche, c'est la lire une fois sur trois
     avant que la réponse soit là — l'épreuve passait au vert par chance. On
     arme donc l'attente AVANT d'ouvrir la page. */
  const controleMaitre=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/codes');
  /* `?mode=khalam` : on ne veut pas ouvrir de connexion rapide pour lire une
     barre. Par l'adresse depuis le 28 octobre 2026 — le choix gardé dans le
     téléphone n'est plus lu. */
  await page.goto('http://127.0.0.1:'+PORT+'/?mode=khalam');
  await controleMaitre;
  await page.locator('button.microphone').waitFor({state:'visible'});
  if(maitre)await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).waitFor({state:'visible'});

  /* ── LA BARRE DU BAS ────────────────────────────────────────────────── */
  const barre={
   clavier:await page.getByRole('button',{name:'Ouvrir le clavier et la conversation écrite'}).count(),
   discussion:await page.getByRole('button',{name:'Ouvrir la discussion écrite'}).count(),
   micro:await page.locator('button.microphone').count(),
   moi:await page.locator('button.papier-ouvrir').count(),
  };

  /* ── LA FENÊTRE « MOI » ─────────────────────────────────────────────── */
  await page.locator('button.papier-ouvrir').click();
  const panneau=page.locator('.papier-panneau:not(.qui-panneau)');
  await panneau.waitFor({state:'visible'});
  await panneau.getByText('La voix de Bia',{exact:true}).waitFor();

  const boutons={};
  for(const nom of [...POUR_TOUS,...AU_MAITRE_BOUTONS])
   boutons[nom]=await panneau.getByRole('button',{name:nom}).count();
  const liens={};
  for(const href of AU_MAITRE_LIENS)
   liens[href]=await panneau.locator('a[href="'+href+'"]').count();
  const voix={};
  for(const v of VOIX) voix[v]=await panneau.locator('input[name="bia-voix"][value="'+v+'"]').count();
  const vitesse=await panneau.getByLabel('Vitesse de la voix').count();
  const renseignements=await panneau.getByLabel('Nom ou raison sociale').count();
  /* ── ET LE CHOIX S'OUVRE VRAIMENT ───────────────────────────────
     Un bouton présent n'est pas une capacité : on l'ouvre et on compte les
     personnages proposés, pour un simple utilisateur comme pour le maître. */
  let personnages=0;
  if(boutons['Changer de personnage']){
   await panneau.getByRole('button',{name:'Changer de personnage'}).first().click();
   await panneau.getByText('Le personnage de Bia',{exact:true}).waitFor();
   personnages=await panneau.getByRole('button',{name:'Bia actuelle'}).count();
  }

  assert.equal(erreurs.length,0,erreurs.join('\n'));
  await contexte.close();
  return {barre,boutons,liens,voix,vitesse,renseignements,personnages};
 };

 /* ── LA PORTE : LE CHAMP, ET RIEN QUI DÉSIGNE LA SERRURE DU MAÎTRE ─────
    Lamine, le 27 octobre 2026, copie d'écran à l'appui. Le lien « Espace
    maître — créer des codes » s'affichait AVANT toute authentification : il
    n'ouvrait rien, mais il annonçait à quiconque où se fabriquent les codes.
    On vérifie donc l'écran d'entrée SANS code en mémoire. */
 {
  const contexte=await browser.newContext({viewport:{width:375,height:812}});
  const page=await contexte.newPage();
  await page.route('**/api/**',async route=>{
   const chemin=new URL(route.request().url()).pathname;
   let data={};
   if(chemin==='/api/acces'||chemin==='/api/codes')data={ok:false,maitre:false};
   if(chemin==='/api/etat')data={ecoute:'runpod',voix:'runpod',version:'local-synthetic'};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:'+PORT+'/');
  await page.getByLabel("Code d'accès").waitFor({state:'visible'});
  /* Le champ et son bouton restent : c'est tout ce que la porte doit offrir. */
  assert.equal(await page.getByRole('button',{name:'Entrer'}).count(),1);
  /* ── ET DEPUIS LE 28 OCTOBRE 2026, LE NUMÉRO AUSSI ────────────────
     Lamine : « l'utilisateur saisit son NUMÉRO DE TÉLÉPHONE et son CODE
     UTILISATEUR. Les deux sont obligatoires. » On exige donc les deux champs,
     et un bouton qui reste mort tant qu'il en manque un. */
  const champNumero=page.getByLabel('Numéro de téléphone');
  await champNumero.waitFor({state:'visible'});
  assert.equal(await page.getByRole('button',{name:'Entrer'}).isDisabled(),true,
   'sans rien, on ne doit pas pouvoir entrer');
  await page.getByLabel("Code d'accès").fill('ABCD23EFGH');
  assert.equal(await page.getByRole('button',{name:'Entrer'}).isDisabled(),true,
   'un code SANS numéro ne doit pas ouvrir la porte');
  await champNumero.fill('+221 77 123 45 67');
  assert.equal(await page.getByRole('button',{name:'Entrer'}).isDisabled(),false,
   'les deux remplis, le bouton s\'allume');
  /* Et le numéro n'est JAMAIS dans l'adresse. */
  assert.ok(!page.url().includes('77'),'le numéro ne doit pas apparaître dans l\'adresse : '+page.url());
  /* Et rien n'y désigne l'espace du maître. */
  assert.equal(await page.locator('a[href="/codes"]').count(),0,'la porte ne doit pas montrer le lien des codes');
  const texte=await page.locator('body').innerText();
  assert(!texte.includes('Espace maître'),'« Espace maître » ne doit pas être écrit sur la porte : '+JSON.stringify(texte));
  assert(!texte.includes('créer des codes'),'la porte ne doit pas annoncer la création des codes : '+JSON.stringify(texte));
  await contexte.close();
 }

 const simple=await regarder(false);
 const maitre=await regarder(true);

 /* ── CE QUI RESTE À TOUT LE MONDE ──────────────────────────────────────── */
 assert.equal(simple.barre.discussion,1,'la discussion écrite reste à tout le monde');
 assert.equal(simple.barre.micro,1);
 assert.equal(simple.barre.moi,1);
 for(const v of VOIX) assert.equal(simple.voix[v],1,'la voix « '+v+' » doit rester choisissable : '+JSON.stringify(simple.voix));
 assert.equal(simple.vitesse,1,'la vitesse de sa voix reste réglable');
 /* « au moins un » et pas « exactement un » : « Écouter la voix choisie »
    existe en double dans cette fenêtre depuis bien avant ce chantier. On
    vérifie qu'il est là, on ne range pas ce qu'on n'a pas été chargé de
    ranger. */
 for(const nom of POUR_TOUS) assert(simple.boutons[nom]>=1,'« '+nom+' » doit rester : '+JSON.stringify(simple.boutons));
 /* Les renseignements servent aux devis et aux factures, que tout le monde a
    dans la rangée des services : les cacher casserait un service ouvert. */
 assert.equal(simple.renseignements,1,'« Mes renseignements » sert aux devis de tout le monde');
 assert.equal(simple.personnages,1,'l’apparence de BIA doit rester changeable sans code maître');

 /* ── CE QUI DISPARAÎT POUR L'UTILISATEUR SIMPLE ────────────────────────── */
 assert.equal(simple.barre.clavier,0,'le bouton clavier doit être invisible sans le code maître');
 for(const href of AU_MAITRE_LIENS)
  assert.equal(simple.liens[href],0,'le lien '+href+' doit être invisible sans le code maître : '+JSON.stringify(simple.liens));
 for(const nom of AU_MAITRE_BOUTONS)
  assert.equal(simple.boutons[nom],0,'« '+nom+' » doit être invisible sans le code maître : '+JSON.stringify(simple.boutons));

 /* ── ET LE MAÎTRE N'A RIEN PERDU ───────────────────────────────────────── */
 assert.equal(maitre.barre.clavier,1,'le maître garde son clavier');
 assert.equal(maitre.barre.discussion,1);
 for(const href of AU_MAITRE_LIENS)
  assert.equal(maitre.liens[href],1,'le maître doit garder le lien '+href+' : '+JSON.stringify(maitre.liens));
 for(const nom of [...POUR_TOUS,...AU_MAITRE_BOUTONS])
  assert(maitre.boutons[nom]>=1,'le maître doit garder « '+nom+' » : '+JSON.stringify(maitre.boutons));
 for(const v of VOIX) assert.equal(maitre.voix[v],1);
 assert.equal(maitre.vitesse,1);
 assert.equal(maitre.renseignements,1);

 console.log(JSON.stringify({
  utilisateur_simple:{barre:simple.barre,garde:Object.keys(simple.boutons).filter(n=>simple.boutons[n]),
   voix:Object.keys(simple.voix).filter(v=>simple.voix[v]),liens_vus:Object.keys(simple.liens).filter(h=>simple.liens[h])},
  maitre:{barre:maitre.barre,garde:Object.keys(maitre.boutons).filter(n=>maitre.boutons[n]),
   liens_vus:Object.keys(maitre.liens).filter(h=>maitre.liens[h]).length},
 }));
 }catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.kill();}})();
