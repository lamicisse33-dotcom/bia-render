'use client';
import {useRef,useState,useEffect} from 'react';
const noms=['Repos','Ouverture légère','A / E','O / OU'];
const alignements=[[-14,0],[9,0],[-14,2],[9,2]];
export default function PersonnageComplet(){
 const audio=useRef<HTMLAudioElement>(null),ctx=useRef<AudioContext|null>(null),analyse=useRef<AnalyserNode|null>(null);
 const [actif,setActif]=useState(false),[forme,setForme]=useState<number|null>(null),[position,setPosition]=useState(0),[arrondi,setArrondi]=useState(false),[etat,setEtat]=useState('Prêt — les quatre états sont des images complètes, sans bouche ajoutée.');
 useEffect(()=>()=>{void ctx.current?.close();},[]);
 useEffect(()=>{
  if(!actif){setPosition(forme??0);return;}
  let lisse=0;const donnees=new Float32Array(512);
  const timer=setInterval(()=>{
   if(forme!==null){setPosition(forme);return;}
   const a=analyse.current;if(!a)return;a.getFloatTimeDomainData(donnees);
   const rms=Math.sqrt(donnees.reduce((s,v)=>s+v*v,0)/donnees.length);const cible=Math.min(1,Math.max(0,(rms-.008)*8));
   lisse+=(cible-lisse)*(cible>lisse?.48:.28);
   setPosition(arrondi?(lisse<.15?lisse/.15:1+(lisse-.15)/.85*2):lisse*2);
  },40);return()=>clearInterval(timer);
 },[actif,forme,arrondi]);
 async function lancer(){try{
  if(!ctx.current){const c=new AudioContext();ctx.current=c;const source=c.createMediaElementSource(audio.current!);analyse.current=c.createAnalyser();analyse.current.fftSize=512;source.connect(analyse.current);analyse.current.connect(c.destination);}
  await ctx.current.resume();await audio.current!.play();setActif(true);setEtat('Lecture avec son — ouverture pilotée par le volume, pas par les phonèmes.');
 }catch(e){setEtat('Lecture impossible : '+(e instanceof Error?e.message:'inconnue'));}}
 function arreter(){audio.current?.pause();setActif(false);setForme(null);setPosition(0);setEtat('Arrêté — image complète au repos.');}
 const poids=[0,0,0,0];const parcours=arrondi?[0,1,3,3]:[0,1,2,3];
 if(forme!==null)poids[forme]=1;else{const p=Math.max(0,Math.min(3,position)),bas=Math.floor(p),haut=Math.min(3,bas+1),f=p-bas;poids[parcours[bas]]+=1-f;poids[parcours[haut]]+=f;}
 const opacites=poids.map((p,i)=>{const total=poids.slice(0,i+1).reduce((s,v)=>s+v,0);return total?p/total:1;});
 return <main style={{minHeight:'100dvh',background:'#000',color:'#eee',fontFamily:'system-ui',padding:16,textAlign:'center'}}>
 <h1 style={{fontSize:22}}>Bia — animation par images complètes</h1>
 <p>Un visage entier par état. Aucun morceau de bouche superposé.</p>
 <div role="img" aria-label="Bia animée à partir de quatre images complètes" data-bia-complet="oui" data-position={position.toFixed(3)} data-actif={actif?'oui':'non'} style={{position:'relative',height:'min(67dvh,920px)',aspectRatio:'2/3',maxWidth:'100%',margin:'auto',overflow:'hidden',background:'#000'}}>
 {poids.map((p,i)=><div key={i} data-forme={i} data-poids={p.toFixed(3)} style={{position:'absolute',inset:0,backgroundImage:'url(/personnages/bia-complete-20261030/atlas.png)',backgroundSize:'200% 200%',backgroundPosition:`${i%2?100:0}% ${i>=2?100:0}%`,backgroundRepeat:'no-repeat',opacity:opacites[i],transition:'opacity 100ms linear',transform:`translate(${alignements[i][0]/512*100}%,${alignements[i][1]/768*100}%)`,willChange:'opacity'}}/>)}
 </div>
 <audio ref={audio} src="/voix-bia.wav" preload="auto" onEnded={arreter}/>
 <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:12}}>
 <button onClick={()=>{setForme(null);void lancer();}} style={{padding:14}}>Écouter et voir</button><button onClick={arreter} style={{padding:14}}>Arrêter</button>
 <button onClick={()=>{setForme(null);setArrondi(v=>!v);}} style={{padding:14}}>Articulation : {arrondi?'O / OU':'A / E'}</button>
 </div>
 <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:12}}>{noms.map((nom,i)=><button key={nom} aria-pressed={forme===i} onClick={()=>{setForme(i);setPosition(i);}} style={{padding:10}}>{nom}</button>)}<button onClick={()=>setForme(null)} style={{padding:10}}>Automatique</button></div>
 <p role="status">{etat}</p><p>Essai séparé de Bia. Pose du corps fixe pour vérifier la stabilité du visage et des transitions.</p>
 </main>;
}
