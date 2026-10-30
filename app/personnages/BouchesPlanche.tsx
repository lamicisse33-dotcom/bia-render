'use client';
import {useEffect,useRef} from 'react';
import mesures from '../../public/personnages/satin-anime-20261028/levres.json';
import type {SequenceSatin} from '@/lib/animation-satin';
const centres=[[144,136],[140,137],[130,138],[126,136],[120,134],[114,132],[142,130],[138,133],[130,133],[126,136],[119,133],[115,128],[144,122],[140,123],[130,124],[128,126],[121,128],[115,126],[144,110],[140,112],[130,110],[127,120],[122,118],[116,110]];
/** Montage expérimental uniquement : aucun accès au micro ni au moteur Bia. */
export function BouchesPlanche({video,clip,actif,original,niveau,famille}:{video:React.RefObject<HTMLVideoElement|null>;clip:SequenceSatin;actif:boolean;original:boolean;niveau:()=>number;famille:'ouverte'|'arrondie'}){
 const canvas=useRef<HTMLCanvasElement>(null);const params=useRef({clip,actif,original,niveau,famille});params.current={clip,actif,original,niveau,famille};
 useEffect(()=>{
  const c=canvas.current,v=video.current;if(!c||!v)return;const ctx=c.getContext('2d',{alpha:true});if(!ctx)return;
  const atlas=new Image();atlas.src='/personnages/bouches-essai-20261030/atlas.png';
  const patch=document.createElement('canvas');patch.width=224;patch.height=112;const pc=patch.getContext('2d',{willReadFrequently:true})!;
  const base=document.createElement('canvas');base.width=224;base.height=112;const bc=base.getContext('2d',{willReadFrequently:true})!;
  const suivi=typeof v.requestVideoFrameCallback==='function';
  let annule=false,raf=0,frame=0,tempsImage=0,lisse=0,dernier=performance.now(),compte=0,debut=dernier;
  const suivre:VideoFrameRequestCallback=(_t,m)=>{tempsImage=m.mediaTime;draw(false);if(!annule)frame=v.requestVideoFrameCallback(suivre);};
  if(v.requestVideoFrameCallback)frame=v.requestVideoFrameCallback(suivre);
  const draw=(replanifier=true)=>{
   if(annule)return;const now=performance.now();if(now-dernier<30){if(replanifier)raf=requestAnimationFrame(()=>draw());return;}const p=params.current,dt=Math.min(80,now-dernier);dernier=now;
   if(v.readyState>=2){
    ctx.clearRect(0,0,1176,1764);
    const cible=p.actif?Math.min(1,Math.max(0,p.niveau())):0;lisse+=(cible-lisse)*(1-Math.exp(-dt/(cible>lisse?65:115)));
    const piste=mesures[p.clip],t=suivi?tempsImage:v.currentTime,frames=piste.frames;
    const tr=frames[Math.min(frames.length-1,Math.max(0,Math.floor(t*piste.fps)))];
    // Le bisou garde ses lèvres natives : la main traverse la bouche.
    const occlusion=p.clip==='bisou'&&t>1.7&&t<7;
    if(p.actif&&!p.original&&!occlusion&&tr&&atlas.complete&&atlas.naturalWidth){
     const a=p.famille==='arrondie'?[0,1,6,7,8,9,10,11]:[0,1,2,3,4,5];
     const pos=Math.min(a.length-1,lisse*(a.length-1)),i=Math.floor(pos),f=pos-i;
     pc.clearRect(0,0,224,112);
     const peindre=(index:number,alpha:number)=>{const k=a[index],xy=centres[k];pc.globalAlpha=alpha;pc.drawImage(atlas,(k%6)*256+xy[0]-112,Math.floor(k/6)*256+xy[1]-56,224,112,0,0,224,112);};
     peindre(i,1);if(f>.001&&i<a.length-1){pc.globalCompositeOperation='source-over';peindre(i+1,f);}pc.globalAlpha=1;
     const w=tr[2]*1.6,h=w*.5;
     bc.drawImage(v,tr[0]-w/2,tr[1]-h/2,w,h,0,0,224,112);
     const pixels=pc.getImageData(0,0,224,112),fond=bc.getImageData(0,0,224,112),s=[0,0,0],b=[0,0,0];let n=0;
     for(let y=0;y<112;y++)for(let x=0;x<224;x++){const r=Math.hypot((x-112)/112,(y-56)/56);if(r>.83&&r<.96){const k=(y*224+x)*4;for(let j=0;j<3;j++){s[j]+=pixels.data[k+j];b[j]+=fond.data[k+j];}n++;}}
     const delta=s.map((v,j)=>Math.max(-30,Math.min(30,(b[j]-v)/Math.max(1,n))));
     for(let y=0;y<112;y++)for(let x=0;x<224;x++){const k=(y*224+x)*4,r=Math.hypot((x-112)/112,(y-56)/(y<56?40:56)),z=Math.max(0,Math.min(1,(1-r)/.28)),alpha=z*z*(3-2*z);for(let j=0;j<3;j++)pixels.data[k+j]=Math.max(0,Math.min(255,pixels.data[k+j]+delta[j]));pixels.data[k+3]=Math.round(255*alpha);}
     pc.putImageData(pixels,0,0);ctx.save();ctx.translate(tr[0],tr[1]);ctx.rotate(tr[3]);ctx.drawImage(patch,-w/2,-h/2,w,h);ctx.restore();c.dataset.bouche='planche';c.dataset.forme=String(a[i]);
    }else c.dataset.bouche=p.original?'original':occlusion?'main-devant-bouche':'inactive';
    if(now-debut>1000){c.dataset.fps=String(Math.round(compte*1000/(now-debut)));compte=0;debut=now;}compte++;
   }
   if(replanifier)raf=requestAnimationFrame(()=>draw());
  };raf=requestAnimationFrame(()=>draw());
  return()=>{annule=true;cancelAnimationFrame(raf);if(frame)v.cancelVideoFrameCallback(frame);};
 },[video]);
 return <canvas ref={canvas} width={1176} height={1764} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',visibility:actif&&!original?'visible':'hidden'}} aria-label="Montage des bouches sur Bia"/>;
}
