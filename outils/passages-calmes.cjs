const m=require('../public/personnages/satin-anime-20261028/levres.json');
/* ── OÙ LA BOUCHE FILMÉE BOUGE-T-ELLE LE MOINS ? ───────────────────────────
   Lamine, 29 octobre 2026 : « choisis comme fond de parole les passages où
   la bouche d'origine bouge le moins ; si une vidéo bouge trop pour être
   recouverte proprement, écarte-la et dis-le. »
   La colonne 5 du suivi est l'ouverture de la bouche D'ORIGINE. L'atlas des
   bouches composées ne sait représenter que jusqu'à 0,2502. Au-delà, le trou
   filmé est plus grand que ce qu'on pose dessus. */
const PLAFOND=m.atlas.ouvertures[m.atlas.ouvertures.length-1];
const FENETRE=Math.round(24*3.2); // on cherche des fenêtres de 3,2 s
for(const clip of ['ecoute','parole','joie','rire','coeurs','bisou']){
 const f=m[clip].frames, ouv=f.map(r=>r[4]), n=f.length;
 const auDessus=ouv.filter(o=>o>PLAFOND).length;
 /* La fenêtre la plus calme : celle dont l'ouverture MAXIMALE est la plus
    basse. On prend le maximum, pas la moyenne : une seule image grande
    ouverte suffit à faire ressortir l'ancienne bouche. */
 let best={i:0,max:Infinity};
 for(let i=0;i+FENETRE<=n;i++){
  let mx=0;for(let j=i;j<i+FENETRE;j++)if(ouv[j]>mx)mx=ouv[j];
  if(mx<best.max)best={i,max:mx};
 }
 const s=(x)=>(x/24).toFixed(2);
 console.log(clip.padEnd(7),
  'images',String(n).padStart(4),
  '| au-dessus du plafond',String(auDessus).padStart(3),'('+(100*auDessus/n).toFixed(1)+'%)',
  '| fenêtre la plus calme',s(best.i)+'→'+s(best.i+FENETRE)+'s',
  'ouverture max',best.max.toFixed(3),
  best.max>PLAFOND?'  ✗ INCOUVRABLE':'  ✓');
}
console.log('\nplafond de l’atlas :',PLAFOND);
