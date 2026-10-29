'use client';
import {useState,useRef} from 'react';
export default function EssaiSon(){
 const [etat,setEtat]=useState('Prêt. Salutation technique sans mémoire privée ni microphone.');
 const [actif,setActif]=useState(false);const ctx=useRef<AudioContext|null>(null);
 async function lancer(){
  setActif(true);
  try{
   const c=new AudioContext();ctx.current=c;await c.resume();setEtat('Génération de la salutation…');
   const r=await fetch('/api/gemini-live/essai?variante=client_historique_compatible&audio=1&ecouter=1',{cache:'no-store'});const d=await r.json();const a=d.resultats?.[0];
   if(!r.ok||!a?.accepte||!a.pcm_base64)throw Error(a?.motif||d.erreur||'Aucun audio');
   const raw=atob(a.pcm_base64),v=new DataView(new ArrayBuffer(raw.length));for(let i=0;i<raw.length;i++)v.setUint8(i,raw.charCodeAt(i));
   const b=c.createBuffer(1,raw.length/2,a.frequence),samples=b.getChannelData(0);let energie=0;for(let i=0;i<samples.length;i++){samples[i]=v.getInt16(i*2,true)/32768;energie+=samples[i]*samples[i];}
   const rms=Math.sqrt(energie/samples.length);if(rms<0.00001)throw Error('Audio reçu mais silencieux');
   const n=c.createBufferSource();n.buffer=b;n.connect(c.destination);const debut=c.currentTime;
   setEtat(`Lecture en cours — ${b.duration.toFixed(2)} s, niveau RMS ${rms.toFixed(4)}, contexte ${c.state}.`);
   n.onended=()=>{setEtat(`Lecture terminée — ${b.duration.toFixed(2)} s de son non silencieux, horloge audio avancée de ${(c.currentTime-debut).toFixed(2)} s, contexte ${c.state}.`);setActif(false);void c.close();};n.start();
  }catch(e){setEtat('Échec : '+(e instanceof Error?e.message:'inconnu'));setActif(false);void ctx.current?.close();}
 }
 return <main style={{padding:30,fontFamily:'system-ui'}}><h1>Bia — diagnostic du son</h1><button disabled={actif} onClick={()=>void lancer()}>Tester la voix</button><p role="status">{etat}</p><p>Essai séparé : aucun appel à la mémoire privée et aucun micro. La lecture mesurée ici ne prouve pas le son du téléphone.</p></main>;
}
