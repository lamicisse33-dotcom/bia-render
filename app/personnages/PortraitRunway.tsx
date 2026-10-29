'use client';
import {useEffect,useRef,useState} from 'react';
import {suivreAvatarBia,fermerAvatarBia} from '@/lib/avatar-runway-client';
import {PortraitSatin} from './PortraitSatin';
import styles from './personnages.module.css';
export function PortraitRunway(props:{face:string;parle:boolean;ecoute:boolean;emotion:string}){
 const video=useRef<HTMLVideoElement>(null),[pret,setPret]=useState(false),[large,setLarge]=useState(false),[vertical,setVertical]=useState(false);
 useEffect(()=>{
  const off=suivreAvatarBia(e=>{
   setPret(e.pret);setLarge(e.large);
   if(video.current&&video.current.srcObject!==e.video){video.current.srcObject=e.video;if(e.video)void video.current.play().catch(()=>{});}
  });
  return()=>{off();void fermerAvatarBia();};
 },[]);
 return <>{!pret&&<PortraitSatin {...props}/>}<div className={styles.presence} data-bia-avatar="runway" style={{visibility:pret?'visible':'hidden'}}><div className={`${styles.cadreRunway} ${large&&vertical?styles.planLargeRunway:''}`} data-plan={large?'hanches':'buste'}><div className={styles.zoomRunway} style={{transform:`scale(${large&&props.parle?1.04:1})`}}>
  <video ref={video} className={styles.videoRunway} autoPlay playsInline muted onLoadedMetadata={()=>{if(video.current)setVertical(video.current.videoHeight>=video.current.videoWidth);}} style={{opacity:pret?1:0}}/>
 </div></div></div></>;
}
