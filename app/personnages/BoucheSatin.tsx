"use client";
import {useEffect,useRef} from 'react';
import {lireBoucheAudio,ouvertureBoucheAudio} from '@/lib/bouche-audio-satin';
import {SATIN_BASE,SATIN_POSTER,type SequenceSatin} from '@/lib/animation-satin';
import mesures from '../../public/personnages/satin-anime-20261028/levres.json';
import styles from './personnages.module.css';

/** Les gestes gardent leur vidéo ; seules les lèvres sont remplacées par
 * les lèvres de cette même personne, relevées et suivies image par image.
 * La bouche suit l'enveloppe AUDIBLE, jamais le temps du clip ni le texte. */
export function BoucheSatin({video,clip,active}:{video:React.RefObject<HTMLVideoElement|null>;clip:SequenceSatin;active:boolean}) {
 const canvas=useRef<HTMLCanvasElement>(null);
 const dessiner=useRef<()=>void>(()=>{});
 const courant=useRef({clip,active});courant.current={clip,active};
 useEffect(()=>{
  const v=video.current;if(!v?.requestVideoFrameCallback)return;
  let id=0,annule=false;
  const suivre:VideoFrameRequestCallback=(_quand,frame)=>{
   if(annule)return;v.dataset.biaFrameTime=String(frame.mediaTime);dessiner.current();
   id=v.requestVideoFrameCallback(suivre);
  };
  id=v.requestVideoFrameCallback(suivre);
  return()=>{annule=true;v.cancelVideoFrameCallback(id);};
 },[clip,video]);
 useEffect(()=>{
  const c=canvas.current,ctx=c?.getContext('2d',{alpha:false});if(!c||!ctx)return;
  const fond=document.createElement('canvas');fond.width=1176;fond.height=1764;const f=fond.getContext('2d',{alpha:false})!;
  let cle='',zone:{x:number;y:number;w:number;h:number}|null=null;
  let annule=false,raf=0;
  const atlas=new Image(),poster=new Image();atlas.src=`${SATIN_BASE}/bouches.webp`;poster.src=SATIN_POSTER;
  let tuiles:HTMLCanvasElement[]=[];
  const preparer=()=>{
   tuiles=Array.from({length:mesures.atlas.ouvertures.length},(_,i)=>{
    const tuile=document.createElement('canvas');tuile.width=192;tuile.height=128;const x=tuile.getContext('2d')!;
    x.drawImage(atlas,i*192,0,192,128,0,0,192,128);
    x.globalCompositeOperation='destination-in';
    x.translate(96,64);x.scale(96,64);
    const g=x.createRadialGradient(0,0,.70,0,0,1);g.addColorStop(0,'#fff');g.addColorStop(1,'#fff0');x.fillStyle=g;x.fillRect(-1,-1,2,2);
    return tuile;
   });
  };
  atlas.onload=preparer;if(atlas.complete&&atlas.naturalWidth)preparer();
  const peindre=()=>{
   if(annule)return;
   const e=courant.current,v=video.current,son=lireBoucheAudio();
   if(son.disponible&&e.active&&poster.complete&&poster.naturalWidth&&tuiles.length){
    const disponible=v&&v.readyState>=2&&!v.seeking&&v.dataset.sequence===e.clip&&v.dataset.videoVisible==='oui';
    const piste=disponible?mesures[e.clip]:mesures.poster;
    
    const temps=disponible?Number(v.dataset.biaFrameTime||v.currentTime):0;
    const tr=piste.frames[Math.min(piste.frames.length-1,Math.max(0,Math.floor(temps*piste.fps)))];
    if(tr){
     const nouvelleCle=disponible?`${e.clip}:${temps}`:'poster';
     if(nouvelleCle!==cle){
      f.drawImage(disponible?v:poster,0,0,1176,1764);ctx.drawImage(fond,0,0);cle=nouvelleCle;zone=null;
     }else if(zone){ctx.drawImage(fond,zone.x,zone.y,zone.w,zone.h,zone.x,zone.y,zone.w,zone.h);}
     const ouverture=ouvertureBoucheAudio(son.niveau);
     const max=mesures.atlas.ouvertures.length-1;const indice=Math.min(max,ouverture*max);const bas=Math.floor(indice),melange=indice-bas;
     const w=tr[2]*mesures.atlas.scaleX,h=tr[2]*mesures.atlas.scaleY;
     ctx.save();ctx.translate(tr[0],tr[1]);ctx.rotate(tr[3]);
     ctx.drawImage(tuiles[bas],-w/2,-h/2,w,h);
     if(melange>.01&&bas<max){ctx.globalAlpha=melange;ctx.drawImage(tuiles[bas+1],-w/2,-h/2,w,h);}
     ctx.restore();
     const rayon=Math.ceil(Math.hypot(w,h)/2)+3;
     zone={x:Math.floor(tr[0]-rayon),y:Math.floor(tr[1]-rayon),w:rayon*2,h:rayon*2};
     c.style.opacity='1';c.dataset.ouverture=ouverture.toFixed(3);c.dataset.audioAge=String(Math.round(son.age));c.dataset.peint=String(performance.now());
    }
   }else c.style.opacity='0';
  };
  dessiner.current=peindre;
  const boucle=()=>{peindre();raf=requestAnimationFrame(boucle);};
  raf=requestAnimationFrame(boucle);
  return()=>{annule=true;dessiner.current=()=>{};cancelAnimationFrame(raf);atlas.onload=null;};
 },[video]);
 return <canvas ref={canvas} width={1176} height={1764} className={styles.boucheSatin} style={{visibility:active?'visible':'hidden'}} data-bia-bouche-audio="oui" aria-hidden="true"/>;
}
