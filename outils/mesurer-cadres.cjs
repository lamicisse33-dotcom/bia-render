/* Le cadre de Runway et celui des vidéos satin sont-ils la même boîte ?
   Si non, passer de l'un à l'autre fait sauter l'image — et Lamine a dit :
   si ça saute, n'en fais rien et dis-le. Aucune session Runway n'est
   ouverte : tout /api/ est bouché, donc aucun crédit n'est dépensé. */
const {spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const PORT=3166;
const serveur=spawn('node_modules/.bin/next',['start','-p',String(PORT)],{stdio:['ignore','pipe','pipe']});
(async()=>{
 for(let n=0;n<60;n++){try{await fetch('http://127.0.0.1:'+PORT+'/');break;}catch{await new Promise(r=>setTimeout(r,300));}}
 const nav=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-ui-for-media-stream']});
 const ctx=await nav.newContext({viewport:{width:375,height:812}});
 const page=await ctx.newPage();
 await page.route('**/api/**',r=>{
  const c=new URL(r.request().url()).pathname;
  const j=(d)=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});
  if(c==='/api/acces'||c==='/api/codes')return j({ok:true,maitre:true});
  if(c==='/api/etat')return j({ecoute:'runpod',voix:'runpod',version:'mesure-cadres'});
  if(c==='/api/avatar-runway')return j({configuration:{},acces:null,avatar_conversation:false,animation_locale:true});
  return j({});
 });
 await page.addInitScript(()=>{try{localStorage.setItem('bia-code','EPREUVE');localStorage.setItem('bia-numero','+221771234567');
  localStorage.setItem('bia-habillage-20261027','runway-direct');localStorage.setItem('bia-runway-choisi-20261029','1');}catch{}});
 await page.goto('http://127.0.0.1:'+PORT+'/?mode=khalam',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('button.microphone',{timeout:30000});
 await page.waitForTimeout(1500);
 const m=await page.evaluate(()=>{
  const boite=(el)=>{if(!el)return null;const r=el.getBoundingClientRect();
   return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),l:+r.width.toFixed(1),h:+r.height.toFixed(1)};};
  /* Où tombe une image 1176x1764 (rapport 2/3) dans une boîte, en `contain` ? */
  const contient=(b)=>{if(!b)return null;const r=1176/1764;
   let l=b.l,h=b.l/r; if(h>b.h){h=b.h;l=b.h*r;}
   return {l:+l.toFixed(1),h:+h.toFixed(1),x:+(b.x+(b.l-l)/2).toFixed(1),y:+(b.y+(b.h-h)/2).toFixed(1)};};
  const satin=boite(document.querySelector('[data-bia-habillage="satin-anime"] .' + ([...document.querySelectorAll('[data-bia-habillage="satin-anime"] div')][0]||{className:''}).className.split(' ')[0]));
  const cadreSatin=boite(document.querySelector('[data-bia-habillage="satin-anime"]')?.firstElementChild);
  const cadreRunway=boite(document.querySelector('[data-bia-avatar="runway"]')?.firstElementChild);
  return {cadreSatin,cadreRunway,imageSatin:contient(cadreSatin),imageRunway:contient(cadreRunway),
   runwayPresent:!!document.querySelector('[data-bia-avatar="runway"]'),
   satinPresent:!!document.querySelector('[data-bia-habillage="satin-anime"]')};
 });
 console.log(JSON.stringify(m,null,1));
 if(m.imageSatin&&m.imageRunway){
  const a=m.imageSatin,b=m.imageRunway;
  console.log('\nECART entre les deux images :');
  console.log('  largeur',(b.l-a.l).toFixed(1)+' px  ('+(100*(b.l/a.l-1)).toFixed(1)+' %)');
  console.log('  hauteur',(b.h-a.h).toFixed(1)+' px');
  console.log('  decalage haut',(b.y-a.y).toFixed(1)+' px, gauche',(b.x-a.x).toFixed(1)+' px');
 }
 await nav.close();serveur.kill();process.exit(0);
})().catch(e=>{console.error(e);serveur.kill();process.exit(1);});
