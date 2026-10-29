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
/* Un bord franc ferait un rectangle visible par-dessus la vidéo. On adoucit
   les quatre bords sur seize pixels : la peau se fond dans la peau, et la
   bouche ne porte pas de cadre. */
function masque(w,h,marge){
 const d=Buffer.alloc(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const dx=Math.min(x,w-1-x)/marge, dy=Math.min(y,h-1-y)/marge;
  const t=Math.min(1,dx)*Math.min(1,dy);
  d[y*w+x]=Math.round(255*(t*t*(3-2*t)));
 }
 return sharp(d,{raw:{width:w,height:h,channels:1}}).png().toBuffer();
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
