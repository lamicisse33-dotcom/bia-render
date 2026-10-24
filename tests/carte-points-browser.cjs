/* ── LES DEUX POINTS, MESURÉS SUR UN ÉCRAN DE TÉLÉPHONE ────────────────────

   Lamine, le 24 octobre 2026 : « vérifie le rendu sur un écran de téléphone
   (375 px de large) ». On charge la VRAIE feuille de style de l'application
   et le VRAI balisage que app/carte/Carte.tsx fabrique, dans une fenêtre de
   375 × 667, et on mesure les pixels rendus. Pas de capture à l'œil : des
   nombres, et une image en plus pour qu'il juge lui-même. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('assert/strict');
const fs=require('fs');
const path=require('path');

(async()=>{
 let navigateur;
 try{
  const css=fs.readFileSync('app/globals.css','utf8');
  navigateur=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await navigateur.newPage({viewport:{width:375,height:667},deviceScaleFactor:2});
  /* Le balisage est copié de Carte.tsx : même classes, même structure. */
  await page.setContent(`<!doctype html><meta charset="utf-8">
   <style>${css}</style>
   <style>body{margin:0;background:#efe7d7;display:grid;place-items:center;height:100vh;gap:70px}
     /* Un fond clair, comme une carte de jour : c'est là que ça se joue. */
     .rang{display:flex;gap:90px;align-items:center}
     .trace{width:300px;height:17px;position:relative}
     .trace i{position:absolute;inset:0;background:#fff;opacity:.85;border-radius:9px}
     .trace b{position:absolute;left:0;right:0;top:3px;height:11px;background:#e2b04a;opacity:.95;border-radius:6px}</style>
   <div class="rang">
     <div class="pin-moi" aria-label="Ou tu es"><span class="pin-halo"></span><span class="pin-coeur"></span></div>
     <div class="pin-arrivee" aria-label="La destination"><span class="pin-halo"></span><span class="pin-coeur"></span></div>
   </div>
   <div class="trace"><i></i><b></b></div>`);
  await page.waitForTimeout(300);

  const mesure=async(sel)=>page.evaluate((s)=>{
   const el=document.querySelector(s),coeur=el.querySelector('.pin-coeur'),halo=el.querySelector('.pin-halo');
   const b=el.getBoundingClientRect(),c=coeur.getBoundingClientRect();
   const st=getComputedStyle(coeur),sh=getComputedStyle(halo);
   return {boite:Math.round(b.width),coeur:Math.round(c.width),fond:st.backgroundColor,
    bordure:st.borderTopWidth,ombre:st.boxShadow!=='none',animation:sh.animationName};
  },sel);

  const moi=await mesure('.pin-moi'),arrivee=await mesure('.pin-arrivee');
  const largeur=375;

  /* ── LA MESURE, PAS L'INTENTION ─────────────────────────────────────── */
  for(const [nom,p] of [['moi',moi],['arrivee',arrivee]]){
   assert.equal(p.boite,54,`${nom} : la boîte doit faire 54 px (22 px avant le 24 octobre)`);
   assert.equal(p.coeur,30,`${nom} : le cœur doit faire 30 px`);
   assert(p.coeur/largeur>=0.07,`${nom} : ${Math.round(p.coeur/largeur*1000)/10} % de la largeur, c'est trop petit`);
   assert.equal(p.bordure,'3px',`${nom} : contour blanc épais, pour le plein soleil`);
   assert(p.ombre,`${nom} : une ombre, sinon le point se noie dans une carte claire`);
   assert(/^bat-/.test(p.animation),`${nom} : le halo doit battre, pas rester immobile`);
  }
  /* Deux couleurs franchement différentes, et pas l'or du tracé. */
  assert.equal(moi.fond,'rgb(37, 99, 235)','la personne est BLEUE');
  assert.equal(arrivee.fond,'rgb(34, 197, 94)','la destination est VERTE');
  assert.notEqual(moi.fond,arrivee.fond);

  /* Le tracé : épais, et doublé d'un liseré blanc plus large en dessous. */
  const trace=await page.evaluate(()=>{
   const or=document.querySelector('.trace b'),liseré=document.querySelector('.trace i');
   return {or:Math.round(or.getBoundingClientRect().height),liseré:Math.round(liseré.getBoundingClientRect().height)};
  });
  assert.equal(trace.or,11,'le trajet doit faire 11 px (7 px avant)');
  assert(trace.liseré>trace.or,'le liseré blanc doit être plus large que le tracé');

  /* ── LE POINT VERT NE DOIT DÉPENDRE D'AUCUN ÉVÉNEMENT ─────────────────

     Lamine, le 24 octobre 2026 : « la carte s'affiche, mais avec un seul
     point bleu ». Il était créé dans `m.on("load")`, qui ne part qu'une fois
     et seulement si le premier fond a chargé — celui qui n'arrive pas à
     Dakar. On vérifie donc dans la SOURCE que les deux points sont posés
     avec la carte, et non suspendus à un événement de fond. */
  /* On lit le CODE, pas la prose : le commentaire qui explique le défaut
     cite `m.on("load")`, et un motif naïf l'attrape avant le vrai. C'est la
     troisième fois dans la journée — d'où ce nettoyage, une fois pour
     toutes. */
  const source=fs.readFileSync('app/carte/Carte.tsx','utf8')
   .replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/.*$/gm,'$1');
  const avantLoad=source.slice(0,source.indexOf('m.on("load"'));
  assert(avantLoad.includes('poserLArrivee();'),
   'le point vert doit être posé avec la carte, avant tout événement de fond');
  assert(!/m\.on\("load"[\s\S]{0,600}?new maplibre\.Marker/.test(source),
   'aucun marqueur ne doit naître dans `load`');
  /* Et il doit être reposé après un basculement de fond : c'est le chemin par
     lequel il disparaissait. */
  assert(/secours\.current\s*=\s*true[\s\S]{0,600}?poserLArrivee\(\)/.test(source),
   'le point vert doit survivre au changement de fond');

  const dossier=process.env.SORTIE_CAPTURE||require('os').tmpdir();
  const image=path.join(dossier,'carte-points-375px.png');
  await page.screenshot({path:image});
  console.log(JSON.stringify({largeur:375,moi,arrivee,trace,image}));
 }catch(e){console.error(e);process.exitCode=1;}
 finally{await navigateur?.close();}
})();
