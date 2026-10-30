'use client';
import {useRef,useState,useEffect} from 'react';
import {BouchesPlanche} from '@/app/personnages/BouchesPlanche';
import {SATIN_BASE,SEQUENCES_SATIN,type SequenceSatin} from '@/lib/animation-satin';
const noms={ecoute:'Écoute',parole:'Parole',joie:'Joie',rire:'Rire',coeurs:'Cœur',bisou:'Bisou'};
export default function EssaiBouches(){
 const video=useRef<HTMLVideoElement>(null),audio=useRef<HTMLAudioElement>(null),ctx=useRef<AudioContext|null>(null),analyse=useRef<AnalyserNode|null>(null);
 const [clip,setClip]=useState<SequenceSatin>('parole'),[actif,setActif]=useState(false),[original,setOriginal]=useState(false),[famille,setFamille]=useState<'ouverte'|'arrondie'>('ouverte'),[etat,setEtat]=useState('Prêt. Choisis une vidéo puis lance l’essai avec le son.');
 const niveau=()=>{const a=analyse.current;if(!a)return 0;const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);return Math.min(1,Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length)*6);};
 useEffect(()=>()=>{void ctx.current?.close();},[]);
 function arreter(){audio.current?.pause();video.current?.pause();setActif(false);setEtat('Arrêté — bouche originale.');}
 async function lancer(){try{
  if(!ctx.current){const c=new AudioContext();ctx.current=c;const source=c.createMediaElementSource(audio.current!);analyse.current=c.createAnalyser();analyse.current.fftSize=512;source.connect(analyse.current);analyse.current.connect(c.destination);}
  await ctx.current.resume();video.current!.currentTime=clip==='parole'?3.65:0;audio.current!.currentTime=0;
  await Promise.all([video.current!.play(),audio.current!.play()]);setActif(true);setEtat('Lecture avec son — les formes suivent le volume, pas encore les phonèmes.');
 }catch(e){setEtat('Lecture impossible : '+(e instanceof Error?e.message:'inconnue'));setActif(false);}}
 return <main style={{background:'#050505',color:'#eee',minHeight:'100dvh',padding:16,fontFamily:'system-ui',textAlign:'center'}}>
 <h1 style={{fontSize:22}}>Bia — essai des nouvelles bouches</h1>
 <p>Les six vidéos d’origine avec la nouvelle planche. Essai séparé de la conversation Bia.</p>
 <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginBottom:12}}>{SEQUENCES_SATIN.map(c=><button key={c} onClick={()=>{arreter();setClip(c);}} aria-pressed={c===clip} style={{padding:10,background:c===clip?'#ab8d35':'#292929',color:'#fff',borderRadius:10}}>{noms[c]}</button>)}</div>
 <div style={{position:'relative',margin:'auto',height:'min(66dvh,900px)',aspectRatio:'2/3',maxWidth:'100%'}}>
 <video ref={video} src={`${SATIN_BASE}/${clip}.mp4`} muted playsInline loop preload="auto" style={{width:'100%',height:'100%',objectFit:'contain'}}/>
 <BouchesPlanche video={video} clip={clip} actif={actif} original={original} niveau={niveau} famille={famille}/>
 </div>
 <audio ref={audio} src="/voix-bia.wav" preload="none" onEnded={arreter}/>
 <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:14}}>
 <button onClick={()=>void lancer()} style={{padding:14}}>Écouter et voir</button><button onClick={arreter} style={{padding:14}}>Arrêter</button>
 <button onClick={()=>setOriginal(v=>!v)} aria-pressed={original} style={{padding:14}}>{original?'Afficher les nouvelles bouches':'Comparer avec la vidéo originale'}</button>
 <button onClick={()=>setFamille(v=>v==='ouverte'?'arrondie':'ouverte')} style={{padding:14}}>Formes : {famille==='ouverte'?'A / E':'O / OU'}</button>
 </div><p role="status">{etat}</p><p>{original?'Vidéo originale':'Nouvelle planche montée'} · Pendant le bisou, la bouche originale reste visible quand la main la couvre.</p>
 </main>;
}
