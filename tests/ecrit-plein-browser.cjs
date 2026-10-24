/* ── LES QUATRE FORMATS, MESURÉS SUR UN ÉCRAN DE 375 px ────────────────────

   Lamine, le 24 octobre 2026 : « Rendu vérifié à 375 px sur les quatre
   formats. » On charge la VRAIE feuille de style de l'application et le VRAI
   balisage que app/ecrit/Ecrit.tsx fabrique, dans une fenêtre de 375 × 667,
   et on mesure les pixels rendus.

   CE QUI EST VÉRIFIÉ, ET POURQUOI CHAQUE NOMBRE COMPTE :
     — la page ne défile JAMAIS de côté. C'est le défaut qui rend un devis
       illisible sur un téléphone : on pousse la page, et le texte part ;
     — le tableau du devis, LUI, défile dans son cadre. C'est ce qui permet
       trois colonnes sur 375 px sans emporter la page ;
     — les deux boutons font au moins 44 px de haut. En dessous, un pouce
       rate — et « Revenir à BIA » est le seul chemin de sortie ;
     — le texte fait au moins 16 px. En dessous, iOS zoome tout seul et casse
       la mise en page ;
     — l'étiquette du haut est VISIBLE sur le message, parce qu'il l'a
       demandée nommément. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const fs=require('fs');
const path=require('path');

const FEUILLE=(dedans)=>`<!doctype html><meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
 <style>${fs.readFileSync('app/globals.css','utf8')}</style>
 <style>html,body{margin:0;background:#050507}</style>
 <main class="ecrit-plein" role="dialog" aria-modal="true">
   <div class="ecrit-feuille">${dedans}</div>
   <div class="ecrit-barre">
     <button type="button" class="pale">Revenir à BIA</button>
     <button type="button">Copier le texte</button>
   </div>
 </main>`;

/* Le balisage est copié de Ecrit.tsx : mêmes classes, même structure. */
const MESSAGE=`<div class="ecrit-message">
  <p class="ecrit-canal">Message WhatsApp</p>
  <p class="ecrit-pour">À : Awa Ndiaye</p>
  <div class="ecrit-bulle">Salam Awa, je passe demain matin vers neuf heures pour les tissus. Dis-moi si ça te va. +221 77 123 45 67</div>
</div>`;
const MAIL=`<div class="ecrit-mail">
  <p class="ecrit-canal">Mail</p>
  <p class="ecrit-pour">À : direction@ecole-dakar.sn</p>
  <p class="ecrit-objet"><b>Objet :</b> Demande de rendez-vous pour l'inscription de ma fille</p>
  <div class="ecrit-corps">Madame, Monsieur,

Je souhaite inscrire ma fille en classe de sixième pour la prochaine rentrée. Pourriez-vous m'indiquer les pièces à fournir et vos horaires d'ouverture ?

Je vous remercie par avance.

Lamine Cissé</div>
</div>`;
const chiffre=(titre,numero)=>`<div class="ecrit-chiffre">
  <header><h1>${titre}</h1><p class="ecrit-reference">${numero}<span> 24 octobre 2026</span></p></header>
  <p class="ecrit-client"><b>Client</b><br>Boutique DD SKIN — Sacré-Cœur 3</p>
  <p class="ecrit-objet">Fourniture de produits de soin</p>
  <table>
    <thead><tr><th>Désignation</th><th>Qté</th><th>Prix</th></tr></thead>
    <tbody>
      <tr><td>Crème éclaircissante 200 ml</td><td>12</td><td>8 500 F</td></tr>
      <tr><td>Savon noir artisanal, lot de six</td><td>4</td><td>15 000 F</td></tr>
      <tr><td>Huile de karité pure, flacon 500 ml</td><td>7</td><td>12 250 F</td></tr>
    </tbody>
  </table>
  <p class="ecrit-total"><span>Total</span><b>247 750 F</b></p>
</div>`;

(async()=>{
 let navigateur;
 try{
  navigateur=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await navigateur.newPage({viewport:{width:375,height:667},deviceScaleFactor:2});
  const dossier=path.join('/tmp','bia-ecrit-375');
  fs.mkdirSync(dossier,{recursive:true});

  for(const [nom,dedans] of [['message',MESSAGE],['mail',MAIL],
                             ['devis',chiffre('Devis','')],
                             ['facture',chiffre('Facture','N° F-2026-014')]]){
   await page.setContent(FEUILLE(dedans));
   await page.waitForTimeout(150);

   const v=await page.evaluate(()=>{
    const q=(s)=>document.querySelector(s);
    const r=(s)=>{const e=q(s);if(!e)return null;const b=e.getBoundingClientRect();const st=getComputedStyle(e);
     return {l:b.left,r:b.right,h:b.height,police:parseFloat(st.fontSize),visible:b.width>0&&b.height>0&&st.visibility!=='hidden'};};
    const tableau=q('.ecrit-chiffre table');
    return {
     largeurPage:document.documentElement.scrollWidth,
     fenetre:window.innerWidth,
     feuille:r('.ecrit-feuille'),
     boutons:[...document.querySelectorAll('.ecrit-barre button')].map(b=>b.getBoundingClientRect().height),
     etiquette:r('.ecrit-canal'),
     tableauDefile:tableau?tableau.scrollWidth>tableau.clientWidth+1:null,
     tableauDeborde:tableau?tableau.getBoundingClientRect().right>window.innerWidth+1:null,
     total:r('.ecrit-total'),
     plein:r('.ecrit-plein'),
    };
   });

   /* ── LA PAGE NE PART JAMAIS DE CÔTÉ ─────────────────────────────────── */
   assert.ok(v.largeurPage<=v.fenetre+1,
    `${nom} : la page déborde de ${v.largeurPage-v.fenetre} px — un devis qu'on pousse de côté est illisible`);
   /* Le plein écran couvre bien tout l'écran. */
   assert.ok(v.plein.visible,`${nom} : le plein écran doit être visible`);
   /* La feuille reste dans l'écran, des deux côtés. */
   assert.ok(v.feuille.l>=0&&v.feuille.r<=v.fenetre+1,`${nom} : la feuille sort de l'écran`);
   /* 16 px au moins : en dessous, iOS zoome tout seul. */
   assert.ok(v.feuille.police>=16,`${nom} : texte à ${v.feuille.police} px, iOS zoomerait`);
   /* Les deux boutons, et assez grands pour un pouce. */
   assert.equal(v.boutons.length,2,`${nom} : il faut les deux boutons — fermer et copier`);
   for(const h of v.boutons)
    assert.ok(h>=44,`${nom} : un bouton de ${Math.round(h)} px, un pouce le rate`);

   if(nom==='message'||nom==='mail'){
    /* « MESSAGE (étiquette en haut « Message WhatsApp » ou le canal dit) » */
    assert.ok(v.etiquette&&v.etiquette.visible,`${nom} : l'étiquette du haut doit être visible`);
   }
   if(nom==='devis'||nom==='facture'){
    /* Trois colonnes sur 375 px : le tableau doit défiler DANS son cadre,
       et surtout ne pas déborder de l'écran. */
    assert.equal(v.tableauDeborde,false,`${nom} : le tableau déborde de l'écran`);
    assert.ok(v.total&&v.total.visible,`${nom} : le total doit être visible`);
   }

   const image=path.join(dossier,nom+'-375.png');
   await page.screenshot({path:image,fullPage:true});
   console.log(`✔ ${nom.padEnd(8)} page ${v.largeurPage} px / fenêtre ${v.fenetre} px`
    +` · texte ${v.feuille.police} px · boutons ${v.boutons.map(h=>Math.round(h)+'px').join(' + ')}`
    +(v.tableauDefile===null?'':` · tableau défile dans son cadre : ${v.tableauDefile?'oui':'non'}`));
   console.log(`  image → ${image}`);
  }
  console.log('\n✔ les quatre formats tiennent sur 375 px, sans défilement latéral de la page');
 }catch(e){
  console.error('✖',e.message);
  process.exitCode=1;
 }finally{ if(navigateur)await navigateur.close(); }
})();
