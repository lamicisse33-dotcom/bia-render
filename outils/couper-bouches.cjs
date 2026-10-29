const sharp=require('sharp');
const S='/private/tmp/claude-501/-Users-macbook-Documents-GitHub-bia-render/df501f14-7bb7-47d9-94c1-43d2e6e20a47/scratchpad';
const SORTIE='public/personnages/bouches-20261029';
/* La boîte de la bouche, dans les coordonnées du portrait natif 1024×1536.
   Les tuiles de visages.webp sont les 400 premiers pixels du portrait : ces
   coordonnées valent donc telles quelles pour l'un comme pour l'autre. */
const BOITE={left:392,top:240,width:240,height:120};
/* Huit fentes et la tuile dont chacune est découpée. Sept sont des découpes
   RÉELLES du portrait approuvé du 28 octobre. La huitième (grand-a) est la
   tuile 8 ouverte de 8 % : le portrait ne contient pas de lèvres plus
   ouvertes, et inventer une bouche sur une photo se voit. */
const FENTES=[
 ['repos',7,1],['fermee',0,1],['entr',1,1],['ou',2,1],
 ['o',8,1],['a',3,1],['i',4,1],['grand-a',8,1.08],
];
/* ── LE DÉBORDEMENT QUE LAMINE A VU, ET POURQUOI ──────────────────────────

   « La bouche composée dépasse légèrement de la mâchoire. »

   Il a raison, et la cause n'est pas le fondu : c'est la FORME du masque.
   Un masque rectangulaire adouci sur ses bords emporte, en bas de la
   découpe, le CONTOUR DE LA MÂCHOIRE de la tuile d'où vient la bouche. Or
   ce contour n'est pas le même d'une tuile à l'autre : quand la bouche
   s'ouvre, la mâchoire descend. Coller ce bas-là par-dessus un portrait
   dont la mâchoire est ailleurs fait une double arête — exactement ce
   qu'il a vu.

   Le masque est donc un OVALE serré sur les lèvres, qui s'arrête bien avant
   le menton et bien avant les joues. Il ne transporte plus aucun contour :
   seulement de la lèvre, et un peu de peau autour pour que la jointure ne
   se voie pas. Le fondu est doux sur toute la bordure de l'ovale. */
const OVALE = { cx: 120, cy: 58, rx: 76, ry: 33, fondu: 13 };
function masque(w, h) {
  const d = Buffer.alloc(w * h);
  const lisser = (t) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    /* La distance à l'ovale, en « rayons » : 1 = sur le bord, 0 = au centre.
       On la convertit en pixels le long du plus petit rayon, qui est celui
       où un débordement se verrait le plus. */
    const u = (x - OVALE.cx) / OVALE.rx, v = (y - OVALE.cy) / OVALE.ry;
    const r = Math.hypot(u, v);
    const px = (1 - r) * OVALE.ry;
    d[y * w + x] = Math.round(255 * lisser(px / OVALE.fondu));
  }
  return sharp(d, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

(async()=>{
 const m=await masque(BOITE.width,BOITE.height,16);
 const faites=[];
 for(const [nom,tuile,echelle] of FENTES){
  let img=sharp(S+'/visages/tuile-'+tuile+'.png').extract(BOITE);
  if(echelle!==1){
   const h2=Math.round(BOITE.height*echelle);
   img=sharp(await img.resize(BOITE.width,h2).png().toBuffer())
    .extract({left:0,top:Math.round((h2-BOITE.height)/2),width:BOITE.width,height:BOITE.height});
  }
  const corps=await img.png().toBuffer();
  await sharp(corps).joinChannel(m).png({compressionLevel:9}).toFile(SORTIE+'/'+nom+'.png');
  faites.push(nom);
 }
 console.log(faites.length+' bouches : '+faites.join(' '));
})()
