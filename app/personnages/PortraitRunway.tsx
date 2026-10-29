'use client';
import {useEffect,useRef,useState} from 'react';
import {suivreAvatarBia,fermerAvatarBia} from '@/lib/avatar-runway-client';
import {PortraitSatin} from './PortraitSatin';
import styles from './personnages.module.css';
export function PortraitRunway(props:{face:string;parle:boolean;ecoute:boolean;emotion:string}){
 const video=useRef<HTMLVideoElement>(null),[pret,setPret]=useState(false),[large,setLarge]=useState(false),[proche,setProche]=useState(false);
 useEffect(()=>{
  const off=suivreAvatarBia(e=>{
   setPret(e.pret);setLarge(e.large);
   if(video.current&&video.current.srcObject!==e.video){video.current.srcObject=e.video;if(e.video)void video.current.play().catch(()=>{});}
  });
  return()=>{off();void fermerAvatarBia();};
 },[]);
 useEffect(()=>{
  setProche(false);
  let alternance:ReturnType<typeof setInterval>|undefined;
  const depart=pret&&large&&props.parle?setTimeout(()=>{
   setProche(true);alternance=setInterval(()=>setProche(v=>!v),8500);
  },3500):undefined;
  return()=>{if(depart)clearTimeout(depart);if(alternance)clearInterval(alternance);};
 },[pret,large,props.parle]);
 return <>{!pret&&<PortraitSatin {...props}/>}<div className={styles.presence} data-bia-avatar="runway" style={{visibility:pret?'visible':'hidden'}}><div className={`${styles.cadreRunway} ${large?styles.planLargeRunway:''}`} data-plan={large?(proche?'rapproche':'pied'):'buste'}><div className={styles.zoomRunway} style={{transform:`scale(${proche?1.65:1})`}}>
  <video ref={video} className={styles.videoRunway} autoPlay playsInline muted style={{opacity:pret?1:0}}/>
 </div></div></div></>;
}
