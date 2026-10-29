'use client';
import {useEffect,useRef,useState} from 'react';
import {suivreAvatarBia,fermerAvatarBia} from '@/lib/avatar-runway-client';
import {PortraitSatin} from './PortraitSatin';
import styles from './personnages.module.css';
export function PortraitRunway(props:{face:string;parle:boolean;ecoute:boolean;emotion:string}){
 const video=useRef<HTMLVideoElement>(null),image=useRef<HTMLCanvasElement>(null),[pret,setPret]=useState(false),[conserve,setConserve]=useState(false);
 useEffect(()=>{
  const off=suivreAvatarBia(e=>{
   // Garder une vraie image du flux reçu pendant la reconnexion.
   // Ce n'est pas une bouche ajoutée ni une animation fictive.
   const v=video.current,c=image.current;
   if(!e.video&&v&&c&&v.readyState>=2&&v.videoWidth){
    c.width=v.videoWidth;c.height=v.videoHeight;
    const dessin=c.getContext('2d');
    if(dessin){try{dessin.drawImage(v,0,0);setConserve(true);}catch{}}
   }
   setPret(e.pret);
   if(video.current&&video.current.srcObject!==e.video){video.current.srcObject=e.video;if(e.video)void video.current.play().catch(()=>{});}
  });
  return()=>{off();void fermerAvatarBia();};
 },[]);
 return <>{!pret&&!conserve&&<PortraitSatin {...props}/>}<div className={styles.presence} data-bia-avatar="runway" style={{visibility:pret||conserve?'visible':'hidden'}}><div className={styles.cadreRunway} data-plan="reference-fixe">
  <canvas ref={image} className={styles.videoRunway} aria-hidden="true" style={{visibility:!pret&&conserve?'visible':'hidden'}}/>
  <video ref={video} className={styles.videoRunway} autoPlay playsInline muted style={{opacity:pret?1:0}}/>
 </div></div></>;
}
