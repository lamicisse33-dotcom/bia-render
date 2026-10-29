'use client';
import {useRef,useState,useEffect} from 'react';
import {LevresVideo} from '@/app/personnages/LevresVideo';
export default function EssaiLevres(){
 const video=useRef<HTMLVideoElement>(null),audio=useRef<HTMLAudioElement>(null),ctx=useRef<AudioContext|null>(null),analyse=useRef<AnalyserNode|null>(null);
 const [actif,setActif]=useState(false),[original,setOriginal]=useState(false),[erreur,setErreur]=useState('');
 const niveau=()=>{const a=analyse.current;if(!a||!actif)return 0;const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return Math.min(1,Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length)*7);};
 useEffect(()=>()=>{void ctx.current?.close();},[]);
 async function lancer(){
  try{
   if(!ctx.current){const c=new AudioContext();ctx.current=c;const s=c.createMediaElementSource(audio.current!);analyse.current=c.createAnalyser();analyse.current.fftSize=512;s.connect(analyse.current);analyse.current.connect(c.destination);}
   await ctx.current.resume();video.current!.currentTime=3.65;audio.current!.currentTime=0;
   await Promise.all([video.current!.play(),audio.current!.play()]);setActif(true);setErreur('');
  }catch{setErreur('Appuie de nouveau pour autoriser la lecture du son.');}
 }
 function arreter(){audio.current?.pause();video.current?.pause();setActif(false);}
 return <main style={{background:'#000',color:'#eee',minHeight:'100dvh',padding:16,fontFamily:'system-ui',textAlign:'center'}}>
  <h1 style={{fontSize:22}}>Bia — essai des lèvres</h1>
  <p>Vidéo originale et déformation légère des lèvres selon le son. Essai séparé de Bia.</p>
  <div style={{position:'relative',margin:'auto',height:'min(68dvh,900px)',aspectRatio:'2/3',maxWidth:'100%'}}>
   <video ref={video} src="/personnages/satin-anime-20261028/parole.mp4" muted playsInline preload="auto" style={{width:'100%',height:'100%',objectFit:'contain'}} onTimeUpdate={()=>{if(video.current&&video.current.currentTime>=8.35)video.current.currentTime=3.65;}}/>
   {!original&&<LevresVideo video={video} clip="parole" niveau={niveau} parle={actif} onErreur={()=>{setOriginal(true);setErreur('Animation graphique indisponible : vidéo originale affichée.');}}/>}
  </div>
  <audio ref={audio} src="/voix-bia.wav" preload="none" onEnded={arreter}/>
  <div style={{display:'flex',justifyContent:'center',gap:12,flexWrap:'wrap',marginTop:12}}>
   <button onClick={()=>void lancer()} style={{padding:14}}>Écouter et voir</button><button onClick={arreter} style={{padding:14}}>Arrêter</button>
   <button onClick={()=>setOriginal(v=>!v)} style={{padding:14}}>{original?'Voir l’essai des lèvres':'Comparer : vidéo originale'}</button>
  </div>
  <p role="status">{erreur||'La bouche suit le volume, pas les phonèmes. Aucun appel à Runway.'}</p>
 </main>;
}
