'use client';
import {useEffect,useRef} from 'react';
import {lireBoucheAudio,ouvertureBoucheAudio} from '@/lib/bouche-audio-satin';
import styles from './personnages.module.css';
const alignements=[[-14,0],[9,0],[-14,2],[9,2]];
/** Images entières : aucun collage sur la bouche ni modification du lecteur audio. */
export function PortraitComplet({parle,ecoute,face}:{parle:boolean;ecoute:boolean;face:string}){
 const couches=useRef<(HTMLDivElement|null)[]>([]);
 const courant=useRef({parle,ecoute,face});courant.current={parle,ecoute,face};
 useEffect(()=>{
  let lisse=0;
  const peindre=()=>{
   const e=courant.current,son=lireBoucheAudio();
   const cible=e.parle&&!e.ecoute&&document.visibilityState==='visible'&&son.disponible?ouvertureBoucheAudio(son.niveau):0;
   lisse+=(cible-lisse)*(cible>lisse?.48:.28);
   if(!e.parle||e.ecoute)lisse=0;
   const arrondi=/^bouche_(o|ou)$/.test(e.face),p=Math.min(2,lisse*2),bas=Math.floor(p),haut=Math.min(2,bas+1),f=p-bas;
   const parcours=arrondi?[0,1,3]:[0,1,2],poids=[0,0,0,0];
   poids[parcours[bas]]+=1-f;poids[parcours[haut]]+=f;
   let total=0;
   poids.forEach((v,i)=>{total+=v;const el=couches.current[i];if(el){el.style.opacity=String(total?v/total:1);el.dataset.poids=v.toFixed(3);}});
  };
  peindre();const timer=window.setInterval(peindre,40);
  return()=>window.clearInterval(timer);
 },[]);
 return <div className={styles.presence} data-bia-habillage="bia-complete" data-parle={parle?'oui':'non'} aria-hidden="true">
  <div className={styles.cadre}>
   {alignements.map(([x,y],i)=><div key={i} ref={el=>{couches.current[i]=el;}} data-forme={i} style={{position:'absolute',inset:0,backgroundImage:'url(/personnages/bia-complete-20261030/atlas-yeux-ouverts.png)',backgroundSize:'200% 200%',backgroundPosition:`${i%2?100:0}% ${i>=2?100:0}%`,backgroundRepeat:'no-repeat',opacity:i===0?1:0,transition:'opacity 100ms linear',transform:`translate(${x/512*100}%,${y/768*100}%)`,willChange:'opacity'}}/>)}
  </div>
 </div>;
}
